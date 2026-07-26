// Modal de detalle de un auto: lista cada servicio con su cono y estado.
// En pantallas bajas (celular acostado) el panel se limita al alto de la
// ventana: la lista scrollea y el botón Cerrar queda siempre a la vista.
import type { Vehiculo } from "../types";
import {
  COLOR_AREA,
  ESTILO_ESTADO,
  NOMBRE_AREA,
  NOMBRE_ESTADO,
  autoTerminado,
  ultimosDigitos,
} from "../dominio";
import { Cono } from "./Cono";

interface Props {
  vehiculo: Vehiculo;
  onCerrar: () => void;
}

export function DetalleVehiculo({ vehiculo, onCerrar }: Props) {
  const terminado = autoTerminado(vehiculo);

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/80 p-3 sm:p-4"
      onClick={onCerrar}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-2xl border-4 border-zinc-700 bg-zinc-900 p-5 sm:rounded-3xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-bold break-words text-white sm:text-4xl">
              {vehiculo.marca} {vehiculo.modelo}
            </p>
            <p className="text-lg text-zinc-300 sm:text-3xl">
              {vehiculo.color} · …{ultimosDigitos(vehiculo.matricula)}
            </p>
          </div>
          {terminado && (
            <span className="shrink-0 rounded-full bg-green-600 px-3 py-1 text-base font-bold text-white sm:px-5 sm:py-2 sm:text-2xl">
              Listo
            </span>
          )}
        </div>

        {/* min-h-0 para que el overflow funcione dentro del flex column. */}
        <ul className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto sm:mt-8 sm:gap-4">
          {vehiculo.servicios.map((s) => (
            <li
              key={s.id}
              className="flex shrink-0 items-center gap-3 rounded-2xl bg-zinc-800 p-3 sm:gap-5 sm:p-4"
            >
              <Cono
                color={COLOR_AREA[s.tipo]}
                estado={s.estado}
                className="h-12 w-12 shrink-0 sm:h-16 sm:w-16"
              />
              {/* En el celular el estado va debajo del área (no entran a lo
                  ancho); de tablet para arriba, uno a cada lado. */}
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <span className="text-xl font-semibold text-white sm:text-3xl">
                  {NOMBRE_AREA[s.tipo]}
                </span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-base font-bold sm:px-5 sm:py-2 sm:text-2xl ${ESTILO_ESTADO[s.estado]}`}
                >
                  {NOMBRE_ESTADO[s.estado]}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onCerrar}
          className="mt-5 w-full shrink-0 rounded-2xl bg-zinc-700 py-4 text-2xl font-bold text-white active:scale-[0.98] sm:mt-8 sm:py-5 sm:text-3xl"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
