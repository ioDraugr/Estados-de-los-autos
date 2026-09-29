// Ficha de un auto en el showroom: una hoja de vidrio oscuro que se apoya
// sobre la lista desenfocada. Lista cada servicio con su cono, su estado y una
// barra de progreso en tres tramos (esperando → en proceso → terminado).
// La hoja nunca pasa del 90 % del alto de la ventana: si no entra (celular
// acostado), scrollea todo lo de arriba y el botón Cerrar queda siempre a la
// vista. En la pantalla del showroom (variante tv) la hoja y todo lo de
// adentro crecen en proporción, para que se lea de lejos.
import type { EstadoServicio, Vehiculo } from "../types";
import {
  COLOR_AREA_OSCURO,
  NOMBRE_AREA,
  NOMBRE_ESTADO,
  autoTerminado,
  ultimosDigitos,
} from "../dominio";
import { CAPSULA_MATRICULA, PASTILLA_LISTO_OSCURO } from "../tema";
import { ConoCirculo } from "./ConoCirculo";

// Color del nombre del estado, a la derecha de cada servicio.
const TEXTO_ESTADO: Record<EstadoServicio, string> = {
  esperando: "font-medium text-crema/60",
  en_proceso: "font-semibold text-marca-suave",
  terminado: "font-semibold text-listo-claro",
};

// Barra de progreso: cuántos de los tres tramos se llenan y de qué color.
// El último tramo lleno brilla (en proceso, además, titila suave).
const TRAMOS: Record<EstadoServicio, number> = {
  esperando: 1,
  en_proceso: 2,
  terminado: 3,
};

const TRAMO_LLENO: Record<EstadoServicio, string> = {
  esperando: "bg-arena/55",
  en_proceso: "bg-marca",
  terminado: "bg-[#6FAF7E]",
};

const TRAMO_BRILLO: Record<EstadoServicio, string> = {
  esperando: "",
  en_proceso: "shadow-[0_0_12px_rgba(235,184,47,0.7)] animate-titilar",
  terminado: "shadow-[0_0_12px_rgba(111,175,126,0.7)]",
};

interface Props {
  vehiculo: Vehiculo;
  onCerrar: () => void;
}

export function DetalleVehiculo({ vehiculo, onCerrar }: Props) {
  const terminado = autoTerminado(vehiculo);

  return (
    // El fondo oscurece y desenfoca la lista; tocarlo cierra la ficha. Sin
    // desenfoque (sin-vidrio) oscurece más, para que la lista no distraiga.
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-tinta/45 p-3 backdrop-blur-[26px] backdrop-saturate-[1.4] sm:p-4 sin-vidrio:bg-tinta/80"
      onClick={onCerrar}
    >
      <div
        className="animate-hoja flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-[32px] p-5 text-crema vidrio-hoja-oscura sm:rounded-[40px] sm:p-10 bajo:rounded-[28px] bajo:p-5 tv:max-w-4xl tv:rounded-[52px] tv:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Todo menos Cerrar: si no entra en el alto, scrollea acá adentro.
            min-h-0 para que el overflow funcione dentro del flex column. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between gap-3">
            {/* Nunca la matrícula entera: solo los últimos dígitos. */}
            <span
              className={`${CAPSULA_MATRICULA} h-9 px-4 text-lg sm:h-10 sm:text-xl tv:h-13 tv:px-5 tv:text-[26px]`}
            >
              <span aria-hidden="true" className="tracking-[0.12em] text-crema/45">
                ••••
              </span>
              {ultimosDigitos(vehiculo.matricula)}
            </span>
            {terminado && (
              <span
                className={`${PASTILLA_LISTO_OSCURO} px-4 py-1.5 text-base sm:px-5 sm:py-2 sm:text-xl tv:px-6 tv:py-2.5 tv:text-[26px]`}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-[#CFE6D3]"
                />
                Listo
              </span>
            )}
          </div>

          <div className="mt-5 min-w-0 sm:mt-7 bajo:mt-3 tv:mt-9">
            <p className="pb-[0.06em] text-4xl leading-none font-[650] tracking-[-0.055em] break-words texto-degrade sm:text-6xl bajo:text-4xl tv:text-[84px]">
              {vehiculo.marca} {vehiculo.modelo}
            </p>
            <p className="mt-2 text-lg text-crema/60 sm:text-2xl bajo:mt-1 bajo:text-lg tv:mt-3 tv:text-[32px]">
              {vehiculo.color}
            </p>
          </div>

          {/* Lista agrupada: un solo contenedor con separadores finos. */}
          <ul className="mt-6 rounded-3xl border border-crema/[0.08] bg-crema/[0.05] sm:mt-7 bajo:mt-4 tv:mt-10 tv:rounded-[32px]">
            {vehiculo.servicios.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-4 border-t border-crema/[0.08] px-4 py-4 first:border-t-0 sm:gap-5 sm:px-6 sm:py-5 bajo:py-3 tv:gap-7 tv:px-8 tv:py-6"
              >
                <ConoCirculo
                  color={COLOR_AREA_OSCURO[s.tipo]}
                  estado={s.estado}
                  tamano="ficha"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-3 tv:gap-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-xl font-semibold tracking-[-0.03em] sm:text-[26px] tv:text-[36px]">
                      {NOMBRE_AREA[s.tipo]}
                    </span>
                    <span className={`text-base sm:text-lg tv:text-[26px] ${TEXTO_ESTADO[s.estado]}`}>
                      {NOMBRE_ESTADO[s.estado]}
                    </span>
                  </div>
                  <div aria-hidden="true" className="grid grid-cols-3 gap-1.5 tv:gap-2">
                    {[1, 2, 3].map((tramo) => {
                      const lleno = tramo <= TRAMOS[s.estado];
                      const ultimo = tramo === TRAMOS[s.estado];
                      // Los tramos de un trabajo empezado se llenan al abrir la
                      // ficha; el de "esperando" ya está ahí.
                      const llena = s.estado !== "esperando" ? "animate-llenar" : "";
                      return (
                        <span
                          key={tramo}
                          className={`h-1.5 rounded-full tv:h-2.5 ${
                            lleno
                              ? `${llena} ${TRAMO_LLENO[s.estado]} ${ultimo ? TRAMO_BRILLO[s.estado] : ""}`
                              : "bg-crema/10"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={onCerrar}
          className="mt-5 w-full shrink-0 rounded-full bg-crema py-4 text-2xl font-semibold tracking-[-0.02em] text-tinta transition hover:bg-white active:scale-[0.98] sm:mt-8 sm:py-5 sm:text-3xl bajo:mt-3 bajo:py-3 bajo:text-2xl tv:mt-10 tv:py-6 tv:text-[40px]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
