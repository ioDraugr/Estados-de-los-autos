// Pantalla "Configuración" de /admin: reemplaza a la lista de autos (la
// cabecera queda) y se vuelve con "← Volver". Tarjetas de vidrio:
//   - PIN de acceso (CambiarPin.tsx),
//   - Backups: cuándo fue el último, cuántos hay y "Hacer backup ahora",
//   - Ajustes (pantalla del showroom y cuidados del aviso de "listo"): se arman
//     solos desde la lista que manda el server (GET /api/config), así un ajuste
//     nuevo en server/src/ajustes.ts aparece acá sin tocar esta pantalla (salvo
//     que sea de un tipo nuevo: ver CampoAjuste).
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
          ayuda="El PIN, los backups de la base, los ajustes del showroom y los cuidados del aviso de listo."
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
          <Ajustes
            ajustes={datos.ajustes}
            onGuardado={setDatos}
            onNoAutorizado={onNoAutorizado}
          />
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

interface AjustesProps {
  ajustes: Ajuste[];
  onGuardado: (datos: DatosConfig) => void;
  onNoAutorizado: () => void;
}

// Dos tarjetas a lo ancho: los enteros (hoy, las horas del showroom) y los
// textos (hoy, los cuidados que van en el WhatsApp de "listo"). Una tarjeta sin
// ajustes no se muestra.
function Ajustes({ ajustes, onGuardado, onNoAutorizado }: AjustesProps) {
  const grupos = [
    {
      titulo: "Pantalla del showroom",
      ayuda: undefined,
      ajustes: ajustes.filter((ajuste) => ajuste.tipo === "entero"),
    },
    {
      titulo: "Cuidados en el aviso de listo",
      ayuda:
        "Van al final del WhatsApp que avisa que el auto está listo, uno por cada servicio que se le hizo.",
      ajustes: ajustes.filter((ajuste) => ajuste.tipo === "texto"),
    },
  ];
  return grupos.map(
    (grupo) =>
      grupo.ajustes.length > 0 && (
        <div key={grupo.titulo} className="lg:col-span-2">
          <TarjetaConfig titulo={grupo.titulo} ayuda={grupo.ayuda}>
            <div className="flex flex-col gap-4">
              {grupo.ajustes.map((ajuste) => (
                <CampoAjuste
                  key={ajuste.clave}
                  ajuste={ajuste}
                  onGuardado={onGuardado}
                  onNoAutorizado={onNoAutorizado}
                />
              ))}
            </div>
          </TarjetaConfig>
        </div>
      ),
  );
}

interface CampoProps<A extends Ajuste> {
  ajuste: A;
  onGuardado: (datos: DatosConfig) => void;
  onNoAutorizado: () => void;
}

// Un campo por tipo de ajuste. Para sumar un tipo: agregarlo a `Ajuste` en
// types.ts y acá su caso, con su propio campo (el guardado es el mismo: PATCH
// /api/config con { clave: valor }).
function CampoAjuste({ ajuste, onGuardado, onNoAutorizado }: CampoProps<Ajuste>) {
  switch (ajuste.tipo) {
    case "entero":
      return (
        <CampoEntero
          ajuste={ajuste}
          onGuardado={onGuardado}
          onNoAutorizado={onNoAutorizado}
        />
      );
    case "texto":
      return (
        <CampoTexto
          ajuste={ajuste}
          onGuardado={onGuardado}
          onNoAutorizado={onNoAutorizado}
        />
      );
    default:
      // Un tipo que este front todavía no conoce (server más nuevo): no se muestra.
      return null;
  }
}

// Ajuste entero: "−" / valor / "+" grandes, entre min y max, y "Guardar" que
// se habilita solo si el valor cambió.
function CampoEntero({ ajuste, onGuardado, onNoAutorizado }: CampoProps<AjusteEntero>) {
  const [valor, setValor] = useState(ajuste.valor);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const cambiado = valor !== ajuste.valor;

  function sumar(paso: number) {
    setValor((v) => Math.min(ajuste.max, Math.max(ajuste.min, v + paso)));
    setError(null);
    setListo(false);
  }

  async function guardar() {
    if (!cambiado || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      onGuardado(await guardarAjustes({ [ajuste.clave]: valor }));
      setListo(true);
    } catch (e) {
      if (e instanceof NoAutorizado) onNoAutorizado();
      else setError(textoDeError(e));
    } finally {
      setGuardando(false);
    }
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
          onClick={guardar}
          disabled={!cambiado || guardando}
          className={`${BOTON_MARCA} h-14 min-w-40 flex-1 px-6 text-lg sm:h-16 sm:flex-none sm:text-xl`}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <p className="mt-3 text-base text-tinta-suave">
        De {ajuste.min} a {ajuste.max} (valor inicial: {ajuste.porDefecto}).
      </p>

      {error && (
        <p className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>{error}</p>
      )}
      {listo && !cambiado && (
        <p className={`${AVISO_OK} mt-4 px-4 py-3 text-lg`}>
          Guardado. El showroom ya se actualizó.
        </p>
      )}
    </div>
  );
}

// Ajuste de texto: un recuadro grande para escribir, con la cuenta de
// caracteres ("N/800") y "Guardar", que se habilita solo si el texto cambió.
// Los espacios de las puntas no cuentan (el server los saca al guardar).
function CampoTexto({ ajuste, onGuardado, onNoAutorizado }: CampoProps<AjusteTexto>) {
  const [valor, setValor] = useState(ajuste.valor);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const texto = valor.trim();
  const cambiado = texto !== ajuste.valor;
  const largo = texto.length;
  const pasado = largo > ajuste.maxLargo;

  function cambiar(nuevo: string) {
    setValor(nuevo);
    setError(null);
    setListo(false);
  }

  async function guardar() {
    if (!cambiado || pasado || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      onGuardado(await guardarAjustes({ [ajuste.clave]: texto }));
      setValor(texto);
      setListo(true);
    } catch (e) {
      if (e instanceof NoAutorizado) onNoAutorizado();
      else setError(textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={`${GRUPO} p-4 sm:p-[18px]`}>
      <label
        htmlFor={ajuste.clave}
        className="block text-xl font-semibold text-tinta sm:text-[22px]"
      >
        {ajuste.etiqueta}
      </label>
      <p className="mt-1 text-base text-tinta-suave sm:text-lg">{ajuste.ayuda}</p>

      <textarea
        id={ajuste.clave}
        value={valor}
        rows={5}
        disabled={guardando}
        placeholder="Sin cuidados: no se manda nada para este servicio."
        onChange={(e) => cambiar(e.target.value)}
        className="mt-4 block min-h-40 w-full resize-y rounded-2xl border border-tinta/[0.12] bg-white/80 px-4 py-3 text-xl leading-snug text-tinta caret-[#be8a18] outline-none placeholder:text-[#A89B84] focus:border-marca disabled:opacity-60 sm:text-[22px]"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <span
          className={`text-lg tabular-nums ${pasado ? "font-semibold text-peligro" : "text-tinta-suave"}`}
        >
          {largo}/{ajuste.maxLargo}
        </span>
        <button
          type="button"
          onClick={guardar}
          disabled={!cambiado || pasado || guardando}
          className={`${BOTON_MARCA} h-14 min-w-40 flex-1 px-6 text-lg sm:h-16 sm:flex-none sm:text-xl`}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {pasado && (
        <p className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>
          Es muy largo: puede tener hasta {ajuste.maxLargo} caracteres.
        </p>
      )}
      {error && (
        <p className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>{error}</p>
      )}
      {listo && !cambiado && (
        <p className={`${AVISO_OK} mt-4 px-4 py-3 text-lg`}>
          Guardado. Va en los próximos avisos de listo.
        </p>
      )}
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
