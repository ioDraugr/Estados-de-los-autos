// Pantalla "Configuración" de /admin: reemplaza a la lista de autos (la
// cabecera queda) y se vuelve con "← Volver". Tarjetas de vidrio:
//   - PIN de acceso (CambiarPin.tsx),
//   - Backups: cuándo fue el último, cuántos hay y "Hacer backup ahora",
//   - Ajustes, una tarjeta por grupo (showroom, post-venta por WhatsApp): se
//     arman solos desde la lista que manda el server (GET /api/config), así un
//     ajuste nuevo en server/src/ajustes.ts aparece acá sin tocar esta pantalla
//     (salvo que sea de un tipo o grupo nuevo: ver CampoAjuste y GRUPOS).
// Si el PIN de este dispositivo deja de servir (ej. lo cambiaron desde otra
// tablet), vuelve al login como el resto de /admin.
import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { GRUPO, TarjetaConfig } from "./TarjetaConfig";
import { TituloSeccion } from "./TituloSeccion";

interface Props {
  onVolver: () => void;
  // Tiene que ser estable (useCallback): la carga depende de él.
  onNoAutorizado: () => void;
}

export function Configuracion({ onVolver, onNoAutorizado }: Props) {
  const [datos, setDatos] = useState<DatosConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <TituloSeccion
          titulo="Configuración"
          ayuda="El PIN, los backups de la base, el showroom y los mensajes de post-venta."
        />
        <button
          type="button"
          onClick={onVolver}
          className={`${BOTON_SUAVE} h-14 px-6 text-lg sm:text-xl`}
        >
          ← Volver a los autos
        </button>
      </div>

      {error && (
        <div className={`${AVISO_ERROR} mt-6 px-4 py-3 text-lg sm:mt-8 sm:text-xl`}>
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
        !error && (
          <p className={`${TEXTO_VACIO} p-10 text-2xl sm:p-16`}>Cargando…</p>
        )
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-5 sm:mt-9 sm:gap-7 lg:grid-cols-2">
          <CambiarPin onNoAutorizado={onNoAutorizado} />
          <Backups
            estado={datos.backups}
            onEstado={(backups) => setDatos((d) => d && { ...d, backups })}
            onNoAutorizado={onNoAutorizado}
          />
          {GRUPOS.map((grupo) => (
            <div key={grupo.id} className="lg:col-span-2">
              <Ajustes
                grupo={grupo}
                ajustes={datos.ajustes.filter((a) => a.grupo === grupo.id)}
                onGuardado={setDatos}
                onNoAutorizado={onNoAutorizado}
              />
            </div>
          ))}
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
    <TarjetaConfig
      titulo="Backups"
      ayuda="Copia de la base al arrancar el server y una vez por día."
    >
      <div className={GRUPO}>
        <Dato etiqueta="Último backup">
          {ultimo ? cuando(ultimo.fecha) : "Todavía no hay ninguno"}
        </Dato>
        {ultimo && <Dato etiqueta="Tamaño">{tamano(ultimo.bytes)}</Dato>}
        <Dato etiqueta="Guardados">
          {estado.cantidad} de {estado.maximo}
        </Dato>
      </div>

      <p className="mt-3 px-1 text-sm break-all text-tinta-suave">
        Carpeta en la PC servidor: {estado.carpeta}
      </p>

      {/* El error de recién (el del botón) le gana al del último intento que
          vino con los datos: es más nuevo. */}
      {error ? (
        <p className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>{error}</p>
      ) : (
        ultimoError && (
          <p className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>
            El último backup falló ({cuando(ultimoError.fecha).toLowerCase()}):{" "}
            {ultimoError.mensaje}
          </p>
        )
      )}
      {listo && (
        <p className={`${AVISO_OK} mt-4 px-4 py-3 text-lg`}>Backup hecho.</p>
      )}

      <button
        type="button"
        onClick={hacerAhora}
        disabled={haciendo}
        className={`${BOTON_MARCA} mt-5 h-14 w-full text-lg sm:h-16 sm:text-xl`}
      >
        {haciendo ? "Haciendo backup…" : "Hacer backup ahora"}
      </button>
    </TarjetaConfig>
  );
}

// Una fila del grupo: etiqueta a la izquierda y el dato a la derecha.
function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[58px] items-center justify-between gap-4 border-t border-tinta/[0.08] px-4 py-2.5 first:border-t-0 sm:px-[18px]">
      <span className="text-lg text-tinta-suave">{etiqueta}</span>
      <span className="text-right text-lg font-semibold text-tinta tabular-nums sm:text-xl">
        {children}
      </span>
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
}

// Una tarjeta por grupo, en este orden. Un ajuste de un grupo que este front no
// conoce (server más nuevo) no se muestra.
const GRUPOS: Grupo[] = [
  {
    id: "showroom",
    titulo: "Pantalla del showroom",
    guardado: "Guardado. El showroom ya se actualizó.",
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
    <TarjetaConfig titulo={grupo.titulo} ayuda={grupo.ayuda}>
      <div className="flex flex-col gap-4">
        {ajustes.map((ajuste) => (
          <CampoAjuste
            key={ajuste.clave}
            ajuste={ajuste}
            textoGuardado={grupo.guardado}
            onGuardado={onGuardado}
            onNoAutorizado={onNoAutorizado}
          />
        ))}
      </div>
    </TarjetaConfig>
  );
}

interface CampoProps<A extends Ajuste> {
  ajuste: A;
  textoGuardado: string;
  onGuardado: (datos: DatosConfig) => void;
  onNoAutorizado: () => void;
}

// Un campo por tipo de ajuste. Para sumar un tipo: agregarlo a `Ajuste` en
// types.ts y acá su caso, con su propio campo (el guardado es el mismo: PATCH
// /api/config con { clave: valor }, ver useGuardar).
function CampoAjuste({ ajuste, ...resto }: CampoProps<Ajuste>) {
  switch (ajuste.tipo) {
    case "entero":
      return <CampoEntero ajuste={ajuste} {...resto} />;
    case "booleano":
      return <CampoBooleano ajuste={ajuste} {...resto} />;
    case "texto":
      return <CampoTexto ajuste={ajuste} {...resto} />;
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

  async function guardar(valor: number | boolean | string) {
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
  if (error) return <p className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>{error}</p>;
  if (listo) return <p className={`${AVISO_OK} mt-4 px-4 py-3 text-lg`}>{textoGuardado}</p>;
  return null;
}

// Ajuste entero: "−" / valor / "+" grandes, entre min y max, y "Guardar" que
// se habilita solo si el valor cambió.
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

  const BOTON_PASO = `${BOTON_SUAVE} flex h-16 w-16 shrink-0 items-center justify-center text-4xl font-normal sm:h-[72px] sm:w-[72px]`;

  return (
    <div className={`${GRUPO} p-4 sm:p-[18px]`}>
      <p className="text-xl font-semibold text-tinta sm:text-[22px]">{ajuste.etiqueta}</p>
      <p className="mt-1 text-base text-tinta-suave sm:text-lg">{ajuste.ayuda}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => sumar(-1)}
            disabled={valor <= ajuste.min || guardando}
            aria-label="Menos"
            className={BOTON_PASO}
          >
            −
          </button>
          <span className="min-w-[3ch] text-center text-4xl font-[650] tracking-[-0.03em] text-tinta tabular-nums sm:text-5xl">
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
        </div>

        <button
          type="button"
          onClick={() => cambiado && guardar(valor)}
          disabled={!cambiado || guardando}
          className={`${BOTON_MARCA} h-14 min-w-40 flex-1 px-6 text-lg sm:h-16 sm:flex-none sm:text-xl`}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <p className="mt-3 text-base text-tinta-suave">
        De {ajuste.min} a {ajuste.max} (valor inicial: {ajuste.porDefecto}).
      </p>

      <Resultado error={error} listo={listo && !cambiado} textoGuardado={textoGuardado} />
    </div>
  );
}

// Ajuste sí/no: toda la fila es el interruptor y se guarda al tocarla (no hay
// "Guardar": es un solo toque, como en el teléfono).
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
    <div className={GRUPO}>
      <button
        type="button"
        role="switch"
        aria-checked={ajuste.valor}
        onClick={() => guardar(!ajuste.valor)}
        disabled={guardando}
        className="flex min-h-[72px] w-full items-center gap-4 p-4 text-left transition-colors active:bg-tinta/[0.04] disabled:opacity-60 sm:p-[18px]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-semibold text-tinta sm:text-[22px]">
            {ajuste.etiqueta}
          </span>
          <span className="mt-1 block text-base text-tinta-suave sm:text-lg">
            {ajuste.ayuda}
          </span>
        </span>
        <Interruptor prendido={ajuste.valor} />
      </button>
      {(error || listo) && (
        <div className="px-4 pb-4 sm:px-[18px]">
          <Resultado error={error} listo={listo} textoGuardado={textoGuardado} />
        </div>
      )}
    </div>
  );
}

// Ajuste de texto: un mensaje (varias líneas) o un link (una línea), con el
// largo a la vista y "Guardar" que se habilita solo si cambió y se puede
// guardar. "Usar el de fábrica" vuelve a poner el texto inicial (falta guardarlo).
function CampoTexto({
  ajuste,
  textoGuardado,
  onGuardado,
  onNoAutorizado,
}: CampoProps<AjusteTexto>) {
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

  const CAMPO =
    "w-full min-w-0 rounded-2xl bg-tinta/[0.05] px-4 text-xl text-tinta caret-[#be8a18] outline-none transition-colors placeholder:text-[#A89B84] focus:bg-marca/[0.12] sm:text-[22px]";

  return (
    <div className={`${GRUPO} p-4 sm:p-[18px]`}>
      <label>
        <span className="block text-xl font-semibold text-tinta sm:text-[22px]">
          {ajuste.etiqueta}
        </span>
        <span className="mt-1 block text-base text-tinta-suave sm:text-lg">{ajuste.ayuda}</span>
        {ajuste.multilinea ? (
          <textarea
            value={valor}
            rows={4}
            onChange={(e) => cambiar(e.target.value)}
            className={`${CAMPO} mt-4 resize-y py-3 leading-snug`}
          />
        ) : (
          <input
            type={ajuste.formato === "url" ? "url" : "text"}
            inputMode={ajuste.formato === "url" ? "url" : undefined}
            autoComplete="off"
            value={valor}
            placeholder={ajuste.formato === "url" ? "https://…" : undefined}
            onChange={(e) => cambiar(e.target.value)}
            className={`${CAMPO} mt-4 h-14 sm:h-16`}
          />
        )}
      </label>

      <p
        className={`mt-2 px-1 text-right text-base tabular-nums ${
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
          className={`${BOTON_MARCA} h-14 min-w-40 flex-1 px-6 text-lg sm:h-16 sm:flex-none sm:text-xl`}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {ajuste.porDefecto && valor !== ajuste.porDefecto && (
          <button
            type="button"
            onClick={() => cambiar(ajuste.porDefecto)}
            disabled={guardando}
            className={`${BOTON_SUAVE} h-14 px-6 text-lg sm:h-16 sm:text-xl`}
          >
            Usar el de fábrica
          </button>
        )}
      </div>

      <Resultado error={error} listo={listo && !cambiado} textoGuardado={textoGuardado} />
    </div>
  );
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
