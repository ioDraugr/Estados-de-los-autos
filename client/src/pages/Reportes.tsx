// Vista /reportes: cómo rinde el taller, para el dueño. Tiene su PIN propio,
// distinto del de /admin y /taller (los vendedores no entran). Si todavía no
// existe, se crea acá pidiendo también el PIN de administración
// (components/reportes/CrearPinReportes.tsx).
// Ya adentro: elegir semana o mes y moverse entre períodos; números grandes
// arriba (autos atendidos, servicios terminados, tiempo promedio), dos
// gráficos de barras, el tiempo promedio de cada servicio y los autos que más
// tardaron. Sin tiempo real: el reporte se pide al cambiar de período.
// Pensada para PC o tablet, con el mismo estilo "Vidrio cálido" que /admin.
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
import { borrarPinReportes, guardarPinReportes, leerPinReportes } from "../sesion";
import type { PeriodoReporte, Reporte } from "../types";
import {
  AVISO_ERROR,
  BOTON_MARCA,
  BOTON_SUAVE,
  TARJETA,
  TEXTO_VACIO,
} from "../tema";
import { CabeceraCurva } from "../components/CabeceraCurva";
import { CambiarPin } from "../components/CambiarPin";
import { LogoML } from "../components/LogoML";
import { PinLogin } from "../components/PinLogin";
import { TituloSeccion } from "../components/TituloSeccion";
import { AutosLentos } from "../components/reportes/AutosLentos";
import { CrearPinReportes } from "../components/reportes/CrearPinReportes";
import { GraficoAutos, GraficoServicios } from "../components/reportes/Graficos";
import { SelectorPeriodo } from "../components/reportes/SelectorPeriodo";
import { TiemposPromedio } from "../components/reportes/TiemposPromedio";

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

  // Consultando o sin conexión: sobre el mismo fondo oscuro del teclado.
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 fondo-oscuro px-6 py-8 text-center text-crema">
      <LogoML className="h-12 w-auto sm:h-[50px]" />
      {acceso === "consultando" ? (
        <p className="text-2xl text-crema/70">Cargando…</p>
      ) : (
        <>
          <p className="max-w-md rounded-3xl bg-peligro/30 px-4 py-1.5 text-xl font-semibold text-[#F6B7A9]">
            No se pudo conectar con el servidor.
          </p>
          <button
            type="button"
            onClick={consultarAcceso}
            className={`${BOTON_MARCA} h-14 px-8 text-xl`}
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
  const [vista, setVista] = useState<"reporte" | "pin">("reporte");

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
  const esActual = reporte !== null && reporte.desde <= hoy && hoy <= reporte.hasta;

  return (
    <div className="min-h-full fondo-claro">
      <CabeceraCurva
        alto="compacta"
        tono="claro"
        acciones={
          <>
            {vista === "reporte" && (
              <button
                type="button"
                onClick={() => setVista("pin")}
                className={`${BOTON_SUAVE} h-11 px-5 text-base sm:h-12 sm:px-[22px] sm:text-[17px]`}
              >
                Cambiar PIN
              </button>
            )}
            <button
              type="button"
              onClick={onSalir}
              className={`${BOTON_SUAVE} h-11 px-5 text-base sm:h-12 sm:px-[22px] sm:text-[17px]`}
            >
              Salir
            </button>
          </>
        }
      />

      <main className="px-4 pt-7 pb-10 sm:px-8 sm:pt-10 sm:pb-14 xl:px-12">
        {vista === "pin" ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <TituloSeccion titulo="PIN de reportes" />
              <button
                type="button"
                onClick={() => setVista("reporte")}
                className={`${BOTON_SUAVE} h-14 px-6 text-lg sm:text-xl`}
              >
                ← Volver a los reportes
              </button>
            </div>
            <div className="mt-6 max-w-xl sm:mt-9">
              <CambiarPin
                titulo="Cambiar PIN de reportes"
                ayuda="Solo para /reportes. No puede ser igual al de /admin."
                textoListo="PIN cambiado. Las otras pestañas abiertas en /reportes van a pedir el PIN nuevo."
                cambiar={cambiarPinReportes}
                guardar={guardarPinReportes}
                onNoAutorizado={onNoAutorizado}
              />
            </div>
          </>
        ) : (
          <>
            <TituloSeccion
              titulo="Reportes"
              ayuda="Cómo rindió el taller: autos atendidos, servicios terminados y tiempos."
            />

            <div className="mt-6 sm:mt-9">
              <SelectorPeriodo
                periodo={periodo}
                onPeriodo={setPeriodo}
                etiqueta={reporte?.periodo === periodo ? reporte.etiqueta : null}
                onAnterior={() => reporte && setFecha(reporte.fechaAnterior)}
                onSiguiente={() => reporte && setFecha(reporte.fechaSiguiente)}
                onHoy={() => setFecha(null)}
                puedeAnterior={!cargando && reporte !== null}
                puedeSiguiente={!cargando && reporte !== null && reporte.hasta < hoy}
                puedeHoy={!cargando && !esActual}
              />
            </div>

            {error && (
              <div
                className={`${AVISO_ERROR} mt-6 flex flex-wrap items-center justify-center gap-4 px-4 py-3 text-lg sm:mt-8 sm:text-xl`}
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setIntento((n) => n + 1)}
                  className={`${BOTON_SUAVE} h-12 px-6 text-lg`}
                >
                  Reintentar
                </button>
              </div>
            )}

            {reporte === null ? (
              !error && (
                <p className={`${TEXTO_VACIO} p-10 text-2xl sm:p-16`}>Cargando…</p>
              )
            ) : (
              <div
                aria-busy={cargando}
                className={`transition-opacity ${cargando ? "opacity-60" : ""}`}
              >
                <ContenidoReporte reporte={reporte} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ContenidoReporte({ reporte }: { reporte: Reporte }) {
  const servicios = reporte.serviciosPorTipo.reduce((suma, s) => suma + s.cantidad, 0);
  // Promedio general: el de cada área pesado por cuántos servicios lo forman.
  const muestras = reporte.tiempoPromedioPorTipo.reduce((suma, t) => suma + t.muestras, 0);
  const minutos = reporte.tiempoPromedioPorTipo.reduce(
    (suma, t) => suma + (t.minutosPromedio ?? 0) * t.muestras,
    0,
  );
  const promedio = muestras > 0 ? minutos / muestras : null;

  if (reporte.autosAtendidos.total === 0 && servicios === 0) {
    return (
      <div className={`${TARJETA} mt-6 px-6 py-14 text-center sm:mt-8 sm:py-20`}>
        <p className="text-2xl font-semibold tracking-[-0.02em] text-tinta sm:text-3xl">
          Sin trabajos terminados en este período.
        </p>
        <p className="mt-2 text-lg text-tinta-suave sm:text-xl">
          Probá con otro período con las flechas, o cambiá entre semana y mes.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:mt-8 sm:grid-cols-3 sm:gap-7">
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

      <div className="mt-5 grid grid-cols-1 gap-5 sm:mt-7 sm:gap-7 lg:grid-cols-2">
        <GraficoAutos serie={reporte.autosAtendidos.serie} periodo={reporte.periodo} />
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

// Tarjeta con un número grande (autos, servicios, tiempo).
function Numero({ titulo, valor, ayuda }: NumeroProps) {
  return (
    <section className={`${TARJETA} flex flex-col p-5 sm:p-7`}>
      <h3 className="text-lg font-medium text-tinta-suave sm:text-xl">{titulo}</h3>
      <p className="mt-1 text-5xl leading-tight font-[650] tracking-[-0.05em] text-tinta tabular-nums sm:text-[56px]">
        {valor}
      </p>
      <p className="mt-1 text-base text-tinta-suave sm:text-lg">{ayuda}</p>
    </section>
  );
}
