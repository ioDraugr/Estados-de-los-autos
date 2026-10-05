// Pantalla "Configuración" de /admin: reemplaza a la lista de autos (la
// cabecera queda) y se vuelve con "← Volver a los autos". Maestro-detalle,
// como Ajustes de un teléfono o la cuenta de Google:
//   - Escritorio (>= lg): a la izquierda la lista de categorías (navegación) y
//     a la derecha el detalle de la elegida (la primera por defecto).
//   - Móvil (< lg): primero la lista; al tocar una categoría se ve solo su
//     detalle, con "‹ Configuración" para volver a la lista.
// La categoría elegida se guarda en el hash (#seguridad, #respaldos,
// #showroom…) para que sobreviva a una recarga; se escribe con replaceState,
// así no toca al router.
// Categorías:
//   - Seguridad: el PIN de acceso (CambiarPin.tsx),
//   - Respaldos: cuándo fue el último, cuántos hay y "Hacer backup ahora",
//   - Una por grupo de ajustes (showroom, cuidados del aviso de "listo",
//     post-venta por WhatsApp): se arman solas desde la lista que manda el
//     server (GET /api/config), así un ajuste nuevo en server/src/ajustes.ts
//     aparece acá sin tocar esta pantalla (salvo que sea de un tipo o grupo
//     nuevo: ver CampoAjuste y GRUPOS).
// Cada categoría es un solo contenedor con filas separadas por líneas finas:
// título y ayuda a la izquierda, el control a la derecha.
// Si el PIN de este dispositivo deja de servir (ej. lo cambiaron desde otra
// tablet), vuelve al login como el resto de /admin.
import {
  useCallback,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  NoAutorizado,
  guardarAjustes,
  hacerBackup,
  obtenerConfig,
  textoDeError,
} from "../api";
import type {
  Ajuste,
  AjusteBooleano,
  AjusteEntero,
  AjusteLista,
  AjusteTexto,
  DatosConfig,
  EstadoBackups,
} from "../types";
import {
  AVISO_ERROR,
  AVISO_OK,
  BOTON_MARCA,
  BOTON_SUAVE,
  TEXTO_VACIO,
} from "../tema";
import { CambiarPin } from "./CambiarPin";
import { Interruptor } from "./Interruptor";
import { CAMPO_TEXTO, CONTENEDOR_FILAS, Fila } from "./TarjetaConfig";
import { TituloSeccion } from "./TituloSeccion";

interface Props {
  onVolver: () => void;
  // Dentro de la ventana flotante: el título y "Cerrar" los pone la ventana.
  enVentana?: boolean;
  // Tiene que ser estable (useCallback): la carga depende de él.
  onNoAutorizado: () => void;
}

// Una categoría de la lista de la izquierda.
interface Categoria {
  id: string;
  titulo: string;
  ayuda?: string;
  contenido: ReactNode;
}

// ¿Pantalla de escritorio (>= lg, 1024px)? Decide si se ve lista + detalle a
// la vez o una cosa por vez.
const ESCRITORIO = "(min-width: 1024px)";

function useEsEscritorio(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(ESCRITORIO);
      mq.addEventListener("change", avisar);
      return () => mq.removeEventListener("change", avisar);
    },
    () => window.matchMedia(ESCRITORIO).matches,
    () => true,
  );
}

function hashActual(): string | null {
  return window.location.hash.slice(1) || null;
}

export function Configuracion({ onVolver, onNoAutorizado, enVentana = false }: Props) {
  const [datos, setDatos] = useState<DatosConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Categoría elegida (id). En móvil null = se ve la lista.
  const [elegida, setElegida] = useState<string | null>(hashActual);
  const escritorio = useEsEscritorio();

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerConfig());
      setError(null);
    } catch (e) {
      if (e instanceof NoAutorizado) onNoAutorizado();
      else setError(textoDeError(e));
    }
  }, [onNoAutorizado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Si alguien cambia el hash a mano o con atrás/adelante, seguirlo.
  useEffect(() => {
    const alCambiar = () => setElegida(hashActual());
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  function elegir(id: string | null) {
    setElegida(id);
    // replaceState (no location.hash =): no suma pasos al historial ni le
    // avisa al router. Se conserva history.state, que es del router.
    const url = window.location.pathname + window.location.search + (id ? `#${id}` : "");
    window.history.replaceState(window.history.state, "", url);
    window.scrollTo(0, 0);
  }

  const categorias: Categoria[] = datos
    ? [
        {
          id: "seguridad",
          titulo: "Seguridad",
          ayuda: "El PIN de acceso. Es el mismo para /admin y /taller.",
          contenido: <CambiarPin incrustado onNoAutorizado={onNoAutorizado} />,
        },
        {
          id: "respaldos",
          titulo: "Respaldos",
          ayuda: "Copia de la base al arrancar el server y una vez por día.",
          contenido: (
            <Backups
              estado={datos.backups}
              onEstado={(backups) => setDatos((d) => d && { ...d, backups })}
              onNoAutorizado={onNoAutorizado}
            />
          ),
        },
        ...GRUPOS.filter((g) => datos.ajustes.some((a) => a.grupo === g.id)).map(
          (grupo): Categoria => ({
            id: grupo.id,
            titulo: grupo.titulo,
            ayuda: grupo.ayuda,
            contenido: (
              <Ajustes
                grupo={grupo}
                ajustes={datos.ajustes.filter((a) => a.grupo === grupo.id)}
                onGuardado={setDatos}
                onNoAutorizado={onNoAutorizado}
              />
            ),
          }),
        ),
      ]
    : [];

  // Un hash que no corresponde a ninguna categoría se ignora. En escritorio
  // siempre hay una elegida (la primera por defecto).
  const hayElegida = categorias.some((c) => c.id === elegida);
  const actual = hayElegida ? elegida : escritorio ? (categorias[0]?.id ?? null) : null;
  const categoria = categorias.find((c) => c.id === actual);

  // En móvil, con una categoría abierta, el título general no hace falta: el
  // botón "‹ Configuración" y el título de la categoría ocupan su lugar.
  const verCabecera = !enVentana && (escritorio || !categoria);

  return (
    <>
      {verCabecera && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <TituloSeccion
            titulo="Configuración"
            ayuda="El PIN, los respaldos de la base, el showroom, los cuidados del aviso de listo y los mensajes de post-venta."
          />
          <button
            type="button"
            onClick={onVolver}
            className={`${BOTON_SUAVE} h-12 px-6 text-lg`}
          >
            ← Volver a los autos
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className={`${AVISO_ERROR} mt-6 px-4 py-3 text-lg sm:mt-8`}>
          <p>{error}</p>
          <button
            type="button"
            onClick={cargar}
            className={`${BOTON_SUAVE} mt-3 h-12 px-6 text-lg`}
          >
            Reintentar
          </button>
        </div>
      )}

      {!datos ? (
        !error && <p className={`${TEXTO_VACIO} p-10 text-xl sm:p-16`}>Cargando…</p>
      ) : (
        <div
          className={`${verCabecera ? "mt-6 sm:mt-8" : ""} lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-10`}
        >
          {(escritorio || !categoria) && (
            <nav aria-label="Categorías de configuración" className="lg:sticky lg:top-6">
              <ul className="flex flex-col gap-2">
                {categorias.map((c) => {
                  const activa = escritorio && c.id === actual;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => elegir(c.id)}
                        aria-current={activa ? "page" : undefined}
                        className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border px-4 py-2 text-left text-lg font-medium text-tinta focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-tinta ${
                          activa
                            ? "border-tinta bg-crema-alta font-semibold"
                            : "border-linea bg-crema-alta hover:bg-arena/60 lg:border-transparent lg:bg-transparent"
                        }`}
                      >
                        <span>{c.titulo}</span>
                        {!escritorio && (
                          <span aria-hidden="true" className="text-3xl leading-none text-tinta-suave">
                            ›
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          {categoria && (
            <section aria-labelledby="titulo-categoria" className="min-w-0">
              {!escritorio && (
                <button
                  type="button"
                  onClick={() => elegir(null)}
                  className={`${BOTON_SUAVE} mb-5 h-12 px-5 text-lg`}
                >
                  ← Volver a Configuración
                </button>
              )}
              <h2
                id="titulo-categoria"
                className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-tinta sm:text-3xl"
              >
                {categoria.titulo}
              </h2>
              {categoria.ayuda && (
                <p className="mt-1 mb-5 max-w-2xl text-base text-tinta-suave sm:text-lg">
                  {categoria.ayuda}
                </p>
              )}
              {!categoria.ayuda && <div className="mb-5" />}
              {categoria.contenido}
            </section>
          )}
        </div>
      )}
    </>
  );
}

// --- Backups ---

interface BackupsProps {
  estado: EstadoBackups;
  onEstado: (estado: EstadoBackups) => void;
  onNoAutorizado: () => void;
}

function Backups({ estado, onEstado, onNoAutorizado }: BackupsProps) {
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const { ultimo, ultimoError } = estado;

  async function hacerAhora() {
    if (haciendo) return;
    setHaciendo(true);
    setError(null);
    setListo(false);
    try {
      onEstado(await hacerBackup());
      setListo(true);
    } catch (e) {
      if (e instanceof NoAutorizado) onNoAutorizado();
      else setError(textoDeError(e));
    } finally {
      setHaciendo(false);
    }
  }

  return (
    <div className={CONTENEDOR_FILAS}>
      <Dato etiqueta="Último backup">
        {ultimo ? cuando(ultimo.fecha) : "Todavía no hay ninguno"}
      </Dato>
      {ultimo && <Dato etiqueta="Tamaño">{tamano(ultimo.bytes)}</Dato>}
      <Dato etiqueta="Guardados">
        {estado.cantidad} de {estado.maximo}
      </Dato>
      <Fila
        titulo="Carpeta en la PC servidor"
        ayuda={<span className="break-all">{estado.carpeta}</span>}
      />

      {/* El error de recién (el del botón) le gana al del último intento que
          vino con los datos: es más nuevo. */}
      {(error || ultimoError || listo) && (
        <div className="px-4 py-4 sm:px-5">
          {error ? (
            <p role="alert" className={`${AVISO_ERROR} px-4 py-3 text-lg`}>{error}</p>
          ) : (
            ultimoError && (
              <p role="alert" className={`${AVISO_ERROR} px-4 py-3 text-lg`}>
                El último backup falló ({cuando(ultimoError.fecha).toLowerCase()}):{" "}
                {ultimoError.mensaje}
              </p>
            )
          )}
          {listo && (
            <p role="status" className={`${AVISO_OK} mt-3 px-4 py-3 text-lg first:mt-0`}>
              Backup hecho.
            </p>
          )}
        </div>
      )}

      <Fila
        titulo="Hacer un backup ahora"
        ayuda="Además de los automáticos."
        control={
          <button
            type="button"
            onClick={hacerAhora}
            disabled={haciendo}
            className={`${BOTON_MARCA} h-12 px-6 text-lg`}
          >
            {haciendo ? "Haciendo backup…" : "Hacer backup ahora"}
          </button>
        }
      />
    </div>
  );
}

// Una fila del grupo: etiqueta a la izquierda y el dato a la derecha.
function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <span className="text-lg font-semibold text-tinta">{etiqueta}</span>
      <span className="text-right text-lg text-tinta tabular-nums">{children}</span>
    </div>
  );
}

// --- Ajustes ---

interface Grupo {
  id: string;
  titulo: string;
  ayuda?: string;
  // Lo que se ve después de guardar un ajuste del grupo.
  guardado: string;
  // Lo que se lee en un texto vacío (si en el grupo vacío vale algo).
  vacio?: string;
}

// Una categoría por grupo, en este orden (después de Seguridad y Respaldos).
// Un ajuste de un grupo que este front no conoce (server más nuevo) no se
// muestra.
const GRUPOS: Grupo[] = [
  {
    id: "showroom",
    titulo: "Pantalla del showroom",
    ayuda: "Lo que se ve en la pantalla de los clientes.",
    guardado: "Guardado. El showroom ya se actualizó.",
  },
  {
    id: "cuidados",
    titulo: "Cuidados en el aviso de listo",
    ayuda:
      "Van al final del WhatsApp que avisa que el auto está listo, uno por cada servicio que se le hizo.",
    guardado: "Guardado. Va en los próximos avisos de listo.",
    vacio: "Sin cuidados: no se manda nada para este servicio.",
  },
  {
    id: "postventa",
    titulo: "Post-venta por WhatsApp",
    ayuda:
      "Mensajes automáticos después de que el cliente retira el auto. Solo les llegan a los que aceptaron recibir mensajes (casilla del alta) y tienen celular cargado.",
    guardado: "Guardado.",
  },
];

interface AjustesProps {
  grupo: Grupo;
  ajustes: Ajuste[];
  onGuardado: (datos: DatosConfig) => void;
  onNoAutorizado: () => void;
}

function Ajustes({ grupo, ajustes, onGuardado, onNoAutorizado }: AjustesProps) {
  if (ajustes.length === 0) return null;
  return (
    <div className={CONTENEDOR_FILAS}>
      {ajustes.map((ajuste) => (
        <CampoAjuste
          key={ajuste.clave}
          ajuste={ajuste}
          textoGuardado={grupo.guardado}
          textoVacio={grupo.vacio}
          onGuardado={onGuardado}
          onNoAutorizado={onNoAutorizado}
        />
      ))}
    </div>
  );
}

interface CampoProps<A extends Ajuste> {
  ajuste: A;
  textoGuardado: string;
  textoVacio?: string;
  onGuardado: (datos: DatosConfig) => void;
  onNoAutorizado: () => void;
}

// Un campo por tipo de ajuste: cada uno es una fila del contenedor. Para sumar
// un tipo: agregarlo a `Ajuste` en types.ts y acá su caso, con su propio campo
// (el guardado es el mismo: PATCH /api/config con { clave: valor }, ver
// useGuardar).
function CampoAjuste({ ajuste, ...resto }: CampoProps<Ajuste>) {
  switch (ajuste.tipo) {
    case "entero":
      return <CampoEntero ajuste={ajuste} {...resto} />;
    case "booleano":
      return <CampoBooleano ajuste={ajuste} {...resto} />;
    case "texto":
      return <CampoTexto ajuste={ajuste} {...resto} />;
    case "lista":
      return <CampoLista ajuste={ajuste} {...resto} />;
    default:
      // Un tipo que este front todavía no conoce (server más nuevo): no se muestra.
      return null;
  }
}

// Guardar un ajuste: manda { clave: valor }, recibe la configuración ya
// actualizada y lleva el "Guardando…", el error y el "Guardado".
function useGuardar(
  clave: string,
  onGuardado: (datos: DatosConfig) => void,
  onNoAutorizado: () => void,
) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  async function guardar(valor: number | boolean | string | string[]) {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    setListo(false);
    try {
      onGuardado(await guardarAjustes({ [clave]: valor }));
      setListo(true);
    } catch (e) {
      if (e instanceof NoAutorizado) onNoAutorizado();
      else setError(textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  // Al tocar el campo, el error y el "Guardado" de antes ya no aplican.
  function limpiar() {
    setError(null);
    setListo(false);
  }

  return { guardando, error, listo, guardar, limpiar };
}

// Error y "Guardado" debajo de un campo.
function Resultado({
  error,
  listo,
  textoGuardado,
}: {
  error: string | null;
  listo: boolean;
  textoGuardado: string;
}) {
  if (error)
    return <p role="alert" className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>{error}</p>;
  if (listo)
    return <p role="status" className={`${AVISO_OK} mt-4 px-4 py-3 text-lg`}>{textoGuardado}</p>;
  return null;
}

// Ajuste entero: "−" / valor / "+" entre min y max, y "Guardar" que se
// habilita solo si el valor cambió. Todo a la derecha de la fila.
function CampoEntero({
  ajuste,
  textoGuardado,
  onGuardado,
  onNoAutorizado,
}: CampoProps<AjusteEntero>) {
  const [valor, setValor] = useState(ajuste.valor);
  const { guardando, error, listo, guardar, limpiar } = useGuardar(
    ajuste.clave,
    onGuardado,
    onNoAutorizado,
  );

  const cambiado = valor !== ajuste.valor;

  function sumar(paso: number) {
    setValor((v) => Math.min(ajuste.max, Math.max(ajuste.min, v + paso)));
    limpiar();
  }

  const BOTON_PASO = `${BOTON_SUAVE} flex h-12 w-12 shrink-0 items-center justify-center text-2xl font-normal`;

  return (
    <Fila
      titulo={ajuste.etiqueta}
      ayuda={
        <>
          {ajuste.ayuda} De {ajuste.min} a {ajuste.max} (valor inicial: {ajuste.porDefecto}).
        </>
      }
      control={
        <>
          <button
            type="button"
            onClick={() => sumar(-1)}
            disabled={valor <= ajuste.min || guardando}
            aria-label="Menos"
            className={BOTON_PASO}
          >
            −
          </button>
          <span
            aria-live="polite"
            className="min-w-[3ch] text-center text-2xl font-semibold text-tinta tabular-nums"
          >
            {valor}
          </span>
          <button
            type="button"
            onClick={() => sumar(1)}
            disabled={valor >= ajuste.max || guardando}
            aria-label="Más"
            className={BOTON_PASO}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => cambiado && guardar(valor)}
            disabled={!cambiado || guardando}
            className={`${BOTON_MARCA} h-12 px-6 text-lg`}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      <Resultado error={error} listo={listo && !cambiado} textoGuardado={textoGuardado} />
    </Fila>
  );
}

// Ajuste sí/no: toda la fila es el interruptor y se guarda al tocarla (no hay
// "Guardar": es un solo toque, como en el teléfono). El estado se lee también
// como texto ("Activado" / "Desactivado").
function CampoBooleano({
  ajuste,
  textoGuardado,
  onGuardado,
  onNoAutorizado,
}: CampoProps<AjusteBooleano>) {
  const { guardando, error, listo, guardar } = useGuardar(
    ajuste.clave,
    onGuardado,
    onNoAutorizado,
  );

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={ajuste.valor}
        onClick={() => guardar(!ajuste.valor)}
        disabled={guardando}
        className="flex min-h-[72px] w-full items-center gap-4 px-4 py-4 text-left hover:bg-arena/40 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-tinta disabled:opacity-60 sm:px-5"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-tinta">{ajuste.etiqueta}</span>
          <span className="mt-1 block text-base text-tinta-suave">{ajuste.ayuda}</span>
        </span>
        <Interruptor prendido={ajuste.valor} conTexto />
      </button>
      {(error || listo) && (
        <div className="px-4 pb-4 sm:px-5">
          <Resultado error={error} listo={listo} textoGuardado={textoGuardado} />
        </div>
      )}
    </div>
  );
}

// Ajuste de texto: un mensaje (varias líneas) o un link (una línea), con el
// largo a la vista y "Guardar" que se habilita solo si cambió y se puede
// guardar. Los espacios de las puntas no cuentan (el server los saca al guardar).
// "Usar el de fábrica" vuelve a poner el texto inicial (falta guardarlo).
function CampoTexto({
  ajuste,
  textoGuardado,
  textoVacio,
  onGuardado,
  onNoAutorizado,
}: CampoProps<AjusteTexto>) {
  const idCampo = useId();
  const [valor, setValor] = useState(ajuste.valor);
  const { guardando, error, listo, guardar, limpiar } = useGuardar(
    ajuste.clave,
    onGuardado,
    onNoAutorizado,
  );

  const limpio = valor.trim();
  const cambiado = limpio !== ajuste.valor;
  const largoOk = limpio.length <= ajuste.maxLargo;
  const puedeGuardar = cambiado && largoOk && (ajuste.permiteVacio || limpio !== "");

  function cambiar(nuevo: string) {
    setValor(nuevo);
    limpiar();
  }

  return (
    <Fila titulo={ajuste.etiqueta} ayuda={ajuste.ayuda} paraCampo={idCampo}>
      {ajuste.multilinea ? (
        <textarea
          id={idCampo}
          value={valor}
          rows={4}
          placeholder={ajuste.permiteVacio ? textoVacio : undefined}
          onChange={(e) => cambiar(e.target.value)}
          className={`${CAMPO_TEXTO} mt-3 resize-y py-3 leading-snug`}
        />
      ) : (
        <input
          id={idCampo}
          type={ajuste.formato === "url" ? "url" : "text"}
          inputMode={ajuste.formato === "url" ? "url" : undefined}
          autoComplete="off"
          value={valor}
          placeholder={ajuste.formato === "url" ? "https://…" : undefined}
          onChange={(e) => cambiar(e.target.value)}
          className={`${CAMPO_TEXTO} mt-3 h-12`}
        />
      )}

      <p
        className={`mt-2 text-right text-base tabular-nums ${
          largoOk ? "text-tinta-suave" : "font-semibold text-peligro"
        }`}
      >
        {limpio.length} / {ajuste.maxLargo}
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => puedeGuardar && guardar(limpio)}
          disabled={!puedeGuardar || guardando}
          className={`${BOTON_MARCA} h-12 min-w-40 px-6 text-lg`}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {ajuste.porDefecto && valor !== ajuste.porDefecto && (
          <button
            type="button"
            onClick={() => cambiar(ajuste.porDefecto)}
            disabled={guardando}
            className={`${BOTON_SUAVE} h-12 px-6 text-lg`}
          >
            Usar el de fábrica
          </button>
        )}
      </div>

      {!largoOk && (
        <p role="alert" className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>
          Es muy largo: puede tener hasta {ajuste.maxLargo} caracteres.
        </p>
      )}
      <Resultado error={error} listo={listo && !cambiado} textoGuardado={textoGuardado} />
    </Fila>
  );
}

// Ajuste lista (las frases de la bienvenida): una fila por frase con su
// "Quitar", y abajo un campo + "Agregar". Los cambios quedan acá hasta tocar
// "Guardar" (que se habilita solo si la lista cambió), como en los otros campos.
function CampoLista({
  ajuste,
  textoGuardado,
  onGuardado,
  onNoAutorizado,
}: CampoProps<AjusteLista>) {
  const idCampo = useId();
  const [frases, setFrases] = useState(ajuste.valor);
  const [nueva, setNueva] = useState("");
  const { guardando, error, listo, guardar, limpiar } = useGuardar(
    ajuste.clave,
    onGuardado,
    onNoAutorizado,
  );

  // Como la guarda el server: una sola línea, sin espacios de más.
  const limpia = nueva.replace(/\s+/g, " ").trim();
  const largoOk = limpia.length <= ajuste.maxLargo;
  const hayLugar = frases.length < ajuste.maxCantidad;
  const puedeAgregar = limpia !== "" && largoOk && hayLugar && !guardando;
  const cambiado = !mismasFrases(frases, ajuste.valor);
  const esLaDeFabrica = mismasFrases(frases, ajuste.porDefecto);

  function cambiar(nuevas: string[]) {
    setFrases(nuevas);
    limpiar();
  }

  function agregar() {
    if (!puedeAgregar) return;
    cambiar([...frases, limpia]);
    setNueva("");
  }

  return (
    <Fila titulo={ajuste.etiqueta} ayuda={ajuste.ayuda} paraCampo={idCampo}>
      {frases.length === 0 ? (
        <p className={`${TEXTO_VACIO} mt-3 rounded-lg border border-linea bg-crema px-4 py-4 text-lg`}>
          Sin frases: en el showroom no se muestra ninguna.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {frases.map((frase, i) => (
            <li
              key={`${i}-${frase}`}
              className="flex min-h-14 items-center gap-3 rounded-lg border border-linea bg-crema py-1.5 pr-1.5 pl-4"
            >
              <span className="min-w-0 flex-1 text-lg break-words text-tinta">{frase}</span>
              <button
                type="button"
                onClick={() => cambiar(frases.filter((_, j) => j !== i))}
                disabled={guardando}
                aria-label={`Quitar: ${frase}`}
                className={`${BOTON_SUAVE} h-12 shrink-0 px-5 text-lg`}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        <input
          id={idCampo}
          type="text"
          autoComplete="off"
          value={nueva}
          placeholder={hayLugar ? "Escribí una frase nueva" : "Ya hay el máximo de frases"}
          disabled={!hayLugar}
          onChange={(e) => {
            setNueva(e.target.value);
            limpiar();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") agregar();
          }}
          className={`${CAMPO_TEXTO} h-12 flex-[1_1_16rem]`}
        />
        <button
          type="button"
          onClick={agregar}
          disabled={!puedeAgregar}
          className={`${BOTON_SUAVE} h-12 px-6 text-lg`}
        >
          Agregar
        </button>
      </div>

      <p
        className={`mt-2 text-right text-base tabular-nums ${
          largoOk ? "text-tinta-suave" : "font-semibold text-peligro"
        }`}
      >
        {frases.length} de {ajuste.maxCantidad} frases · {limpia.length} / {ajuste.maxLargo}
      </p>
      {!largoOk && (
        <p role="alert" className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>
          Es muy larga: cada frase puede tener hasta {ajuste.maxLargo} caracteres.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => cambiado && guardar(frases)}
          disabled={!cambiado || guardando}
          className={`${BOTON_MARCA} h-12 min-w-40 px-6 text-lg`}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {!esLaDeFabrica && (
          <button
            type="button"
            onClick={() => cambiar(ajuste.porDefecto)}
            disabled={guardando}
            className={`${BOTON_SUAVE} h-12 px-6 text-lg`}
          >
            Usar las de fábrica
          </button>
        )}
      </div>

      <Resultado error={error} listo={listo && !cambiado} textoGuardado={textoGuardado} />
    </Fila>
  );
}


// ¿Las dos listas tienen las mismas frases, en el mismo orden?
function mismasFrases(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((frase, i) => frase === b[i]);
}

// --- Formatos ---

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Fecha amigable, en la hora local de este dispositivo: "Hoy a las 14:03",
// "Ayer a las 09:10" o "lun 22/09 a las 18:00".
function cuando(iso: string): string {
  const fecha = new Date(iso);
  const hora = `${dosCifras(fecha.getHours())}:${dosCifras(fecha.getMinutes())}`;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = new Date(fecha);
  dia.setHours(0, 0, 0, 0);
  // Math.round: los días con cambio de hora duran 23 o 25 horas.
  const diasAtras = Math.round((hoy.getTime() - dia.getTime()) / 86_400_000);

  if (diasAtras === 0) return `Hoy a las ${hora}`;
  if (diasAtras === 1) return `Ayer a las ${hora}`;
  const fechaCorta = `${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)}`;
  return `${DIAS[fecha.getDay()]} ${fechaCorta} a las ${hora}`;
}

// "840 KB" o "2,3 MB".
function tamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function dosCifras(numero: number): string {
  return String(numero).padStart(2, "0");
}
