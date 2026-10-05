// Vista /reportes: cómo rinde el taller, para el dueño. Tiene su PIN propio,
// distinto del de /admin y /taller (los vendedores no entran). Si todavía no
// existe, se crea acá pidiendo también el PIN de administración
// (components/reportes/CrearPinReportes.tsx).
// Ya adentro: elegir semana o mes y moverse entre períodos; números grandes
// arriba (autos atendidos, servicios terminados, tiempo promedio), dos
// gráficos de barras, el tiempo promedio de cada servicio y los autos que más
// tardaron. Sin tiempo real: el reporte se pide al cambiar de período.
// Pensada para PC o tablet, con la misma estética de consola que /admin.
import { useCallback, useEffect, useState } from "react";
import {
  NoAutorizado,
  cambiarPinReportes,
  existePinReportes,
  loginReportes,
  obtenerReporte,
  textoDeError,
} from "../api";
import { formatearDuracion } from "../dominio";
import {
  borrarPinReportes,
  guardarPinReportes,
  leerPinReportes,
} from "../sesion";
import type { PeriodoReporte, Reporte } from "../types";
import { CambiarPin } from "../components/CambiarPin";
import { ConsolaVentana } from "../components/ConsolaVentana";
import { LogoML } from "../components/LogoML";
import { PinLogin } from "../components/PinLogin";
import { AutosLentos } from "../components/reportes/AutosLentos";
import { CrearPinReportes } from "../components/reportes/CrearPinReportes";
import {
  GraficoAutos,
  GraficoServicios,
} from "../components/reportes/Graficos";
import { SelectorPeriodo } from "../components/reportes/SelectorPeriodo";
import { TiemposPromedio } from "../components/reportes/TiemposPromedio";

const BOTON_NEUTRO =
  "con-foco inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-con-borde-fuerte bg-con-sup px-4 text-base font-medium text-con-texto transition-colors hover:bg-con-sup2 disabled:opacity-50";

// En qué pantalla está: preguntando al server si ya hay PIN del dueño, sin
// conexión para saberlo, creándolo, ingresándolo o ya adentro.
type Acceso = "consultando" | "sinConexion" | "crear" | "ingresar" | "adentro";

export function Reportes() {
  // Con el PIN ya guardado en esta pestaña se entra directo; si no sirve, el
  // primer reporte da 401 y se vuelve a consultar.
  const [acceso, setAcceso] = useState<Acceso>(() =>
    leerPinReportes() !== null ? "adentro" : "consultando",
  );

  // ¿Existe el PIN del dueño? Decide entre crearlo o ingresarlo. Estable,
  // porque el panel lo usa cuando el PIN guardado deja de servir.
  const consultarAcceso = useCallback(async () => {
    setAcceso("consultando");
    try {
      setAcceso((await existePinReportes()) ? "ingresar" : "crear");
    } catch {
      setAcceso("sinConexion");
    }
  }, []);

  useEffect(() => {
    if (leerPinReportes() === null) consultarAcceso();
  }, [consultarAcceso]);

  function salir() {
    borrarPinReportes();
    consultarAcceso();
  }

  if (acceso === "adentro") {
    return <PanelReportes onNoAutorizado={consultarAcceso} onSalir={salir} />;
  }
  if (acceso === "crear") {
    return (
      <CrearPinReportes
        onCreado={() => setAcceso("adentro")}
        onVolverAEmpezar={consultarAcceso}
      />
    );
  }
  if (acceso === "ingresar") {
    return (
      <PinLogin
        titulo="Reportes"
        ayuda="Ingresá el PIN de reportes."
        verificar={loginReportes}
        guardar={guardarPinReportes}
        onIngresar={() => setAcceso("adentro")}
      />
    );
  }

  // Consultando o sin conexión: pantalla clara, con el mismo estilo de la consola.
  return (
    <div className="tema-consola flex min-h-full flex-col items-center justify-center gap-6 bg-con-fondo px-6 py-8 text-center text-con-texto">
      <LogoML className="h-12 w-auto sm:h-[50px]" />
      {acceso === "consultando" ? (
        <p className="text-xl font-light text-con-suave">Cargando…</p>
      ) : (
        <>
          <p className="max-w-md rounded-sm border border-con-peligro/60 bg-con-peligro/10 px-4 py-3 text-lg font-medium text-[#8f1d17]">
            No se pudo conectar con el servidor.
          </p>
          <button
            type="button"
            onClick={consultarAcceso}
            className={BOTON_NEUTRO}
          >
            Reintentar
          </button>
        </>
      )}
    </div>
  );
}

// Día de hoy en hora local, como lo manda el server ("YYYY-MM-DD").
function diaDeHoy(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

interface PanelProps {
  // Tiene que ser estable (useCallback): la carga depende de él.
  onNoAutorizado: () => void;
  onSalir: () => void;
}

function PanelReportes({ onNoAutorizado, onSalir }: PanelProps) {
  const [periodo, setPeriodo] = useState<PeriodoReporte>("semana");
  // Un día cualquiera del período que se mira; null = el de hoy.
  const [fecha, setFecha] = useState<string | null>(null);
  // Para "Reintentar" después de un error: cambia la clave y se vuelve a pedir.
  const [intento, setIntento] = useState(0);
  // El último reporte que llegó: se sigue viendo (atenuado) mientras carga el
  // del período nuevo, así la pantalla no salta al tocar las flechas.
  const [reporte, setReporte] = useState<Reporte | null>(null);
  // Qué pedido terminó último (su clave) y si dio error.
  const [respuesta, setRespuesta] = useState<{
    clave: string;
    error: string | null;
  } | null>(null);
  const [cambiandoPin, setCambiandoPin] = useState(false);

  const clave = `${periodo}|${fecha ?? "hoy"}|${intento}`;
  const cargando = respuesta?.clave !== clave;
  const error = cargando ? null : respuesta.error;

  useEffect(() => {
    // Si se cambia de período antes de que llegue la respuesta, la vieja se
    // descarta.
    let vigente = true;
    obtenerReporte(periodo, fecha)
      .then((r) => {
        if (!vigente) return;
        setReporte(r);
        setRespuesta({ clave, error: null });
      })
      .catch((e) => {
        if (!vigente) return;
        if (e instanceof NoAutorizado) onNoAutorizado();
        else setRespuesta({ clave, error: textoDeError(e) });
      });
    return () => {
      vigente = false;
    };
  }, [clave, periodo, fecha, onNoAutorizado]);

  const hoy = diaDeHoy();
  // ¿El reporte en pantalla es el del período de hoy?
  const esActual =
    reporte !== null && reporte.desde <= hoy && hoy <= reporte.hasta;

  return (
    <div className="min-h-full bg-con-fondo tracking-[-0.01em] text-con-texto">
      <header className="flex items-center gap-3 border-b border-con-borde bg-con-sup px-3 py-3 sm:px-6">
        <LogoML className="h-10 w-auto shrink-0" />
        <span className="invisible min-w-0 flex-1 truncate font-mono sm:visible text-xs tracking-[0.08em] text-con-suave uppercase sm:text-sm">
          Reportes
        </span>
        <button
          type="button"
          onClick={() => setCambiandoPin(true)}
          className={BOTON_NEUTRO}
        >
          Cambiar PIN
        </button>
        <button type="button" onClick={onSalir} className={BOTON_NEUTRO}>
          Salir
        </button>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 pt-8 pb-12 sm:px-8 sm:pt-12 sm:pb-16">
        <h1 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
          Reportes
        </h1>
        <p className="mt-2 text-base text-con-suave sm:text-lg">
          Cómo rindió el taller: autos atendidos, servicios terminados y
          tiempos.
        </p>

        <div className="mt-6 sm:mt-8">
          <SelectorPeriodo
            periodo={periodo}
            onPeriodo={setPeriodo}
            etiqueta={reporte?.periodo === periodo ? reporte.etiqueta : null}
            onAnterior={() => reporte && setFecha(reporte.fechaAnterior)}
            onSiguiente={() => reporte && setFecha(reporte.fechaSiguiente)}
            onHoy={() => setFecha(null)}
            puedeAnterior={!cargando && reporte !== null}
            puedeSiguiente={
              !cargando && reporte !== null && reporte.hasta < hoy
            }
            puedeHoy={!cargando && !esActual}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 flex flex-wrap items-center justify-center gap-4 rounded-sm border border-con-peligro/60 bg-con-peligro/10 px-4 py-3 text-lg font-medium text-[#8f1d17] sm:mt-8"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setIntento((n) => n + 1)}
              className={BOTON_NEUTRO}
            >
              Reintentar
            </button>
          </div>
        )}

        {reporte === null ? (
          !error && (
            <p className="mt-6 rounded-sm border border-con-borde bg-con-sup p-10 text-center text-xl font-light text-con-suave sm:mt-8 sm:p-16">
              Cargando…
            </p>
          )
        ) : (
          <div
            aria-busy={cargando}
            className={`transition-opacity ${cargando ? "opacity-60" : ""}`}
          >
            <ContenidoReporte reporte={reporte} />
          </div>
        )}
      </main>

      {cambiandoPin && (
        <ConsolaVentana
          titulo="PIN de reportes"
          onCerrar={() => setCambiandoPin(false)}
        >
          <div className="max-w-xl">
            <CambiarPin
              titulo="Cambiar PIN de reportes"
              ayuda="Solo para /reportes. No puede ser igual al de /admin."
              textoListo="PIN cambiado. Las otras pestañas abiertas en /reportes van a pedir el PIN nuevo."
              cambiar={cambiarPinReportes}
              guardar={guardarPinReportes}
              onNoAutorizado={onNoAutorizado}
            />
          </div>
        </ConsolaVentana>
      )}
    </div>
  );
}

function ContenidoReporte({ reporte }: { reporte: Reporte }) {
  const servicios = reporte.serviciosPorTipo.reduce(
    (suma, s) => suma + s.cantidad,
    0,
  );
  // Promedio general: el de cada área pesado por cuántos servicios lo forman.
  const muestras = reporte.tiempoPromedioPorTipo.reduce(
    (suma, t) => suma + t.muestras,
    0,
  );
  const minutos = reporte.tiempoPromedioPorTipo.reduce(
    (suma, t) => suma + (t.minutosPromedio ?? 0) * t.muestras,
    0,
  );
  const promedio = muestras > 0 ? minutos / muestras : null;

  if (reporte.autosAtendidos.total === 0 && servicios === 0) {
    return (
      <div className="mt-6 rounded-sm border border-con-borde bg-con-sup px-6 py-14 text-center sm:mt-8 sm:py-20">
        <p className="text-2xl font-light tracking-[-0.02em] text-con-texto sm:text-3xl">
          Sin trabajos terminados en este período.
        </p>
        <p className="mt-2 text-base text-con-suave sm:text-lg">
          Probá con otro período con las flechas, o cambiá entre semana y mes.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-1 divide-y divide-con-borde rounded-sm border border-con-borde bg-con-sup sm:mt-8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Numero
          titulo="Autos atendidos"
          valor={String(reporte.autosAtendidos.total)}
          ayuda="Con al menos un servicio terminado."
        />
        <Numero
          titulo="Servicios terminados"
          valor={String(servicios)}
          ayuda="Sumando las tres áreas."
        />
        <Numero
          titulo="Tiempo promedio"
          valor={promedio === null ? "Sin datos" : formatearDuracion(promedio)}
          ayuda="Por servicio, de “en proceso” a terminado."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
        <GraficoAutos
          serie={reporte.autosAtendidos.serie}
          periodo={reporte.periodo}
        />
        <GraficoServicios servicios={reporte.serviciosPorTipo} />
        <TiemposPromedio tiempos={reporte.tiempoPromedioPorTipo} />
        <AutosLentos autos={reporte.autosQueMasTardaron} />
      </div>
    </>
  );
}

interface NumeroProps {
  titulo: string;
  valor: string;
  ayuda: string;
}

// Celda de la franja de KPIs: etiqueta, número grande liviano y una ayuda.
function Numero({ titulo, valor, ayuda }: NumeroProps) {
  const esNumero = /^\d/.test(valor);
  return (
    <section className="flex flex-col p-5 sm:p-7">
      <h3 className="font-mono text-xs tracking-[0.08em] text-con-suave uppercase">
        {titulo}
      </h3>
      <p
        className={`mt-3 leading-none font-light tracking-[-0.04em] text-con-texto tabular-nums ${
          esNumero ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"
        }`}
      >
        {valor}
      </p>
      <p className="mt-3 text-sm text-con-suave">{ayuda}</p>
    </section>
  );
}
