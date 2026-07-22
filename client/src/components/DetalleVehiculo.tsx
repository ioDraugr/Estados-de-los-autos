// Modal de detalle de un auto: lista cada servicio con su cono y estado.
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
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/80 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border-4 border-zinc-700 bg-zinc-900 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-4xl font-bold text-white">
              {vehiculo.marca} {vehiculo.modelo}
            </p>
            <p className="text-3xl text-zinc-300">
              {vehiculo.color} · …{ultimosDigitos(vehiculo.matricula)}
            </p>
          </div>
          {terminado && (
            <span className="rounded-full bg-green-600 px-5 py-2 text-2xl font-bold text-white">
              Listo
            </span>
          )}
        </div>

        <ul className="mt-8 flex flex-col gap-4">
          {vehiculo.servicios.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-5 rounded-2xl bg-zinc-800 p-4"
            >
              <Cono color={COLOR_AREA[s.tipo]} estado={s.estado} size={64} />
              <span className="flex-1 text-3xl font-semibold text-white">
                {NOMBRE_AREA[s.tipo]}
              </span>
              <span
                className={`rounded-full px-5 py-2 text-2xl font-bold ${ESTILO_ESTADO[s.estado]}`}
              >
                {NOMBRE_ESTADO[s.estado]}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onCerrar}
          className="mt-8 w-full rounded-2xl bg-zinc-700 py-5 text-3xl font-bold text-white active:scale-[0.98]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
