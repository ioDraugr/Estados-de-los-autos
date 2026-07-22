// Tarjeta de un auto en la grilla del showroom. Toda la tarjeta es táctil.
import type { Vehiculo } from "../types";
import { COLOR_AREA, autoTerminado, ultimosDigitos } from "../dominio";
import { Cono } from "./Cono";

interface Props {
  vehiculo: Vehiculo;
  onSeleccionar: (v: Vehiculo) => void;
}

export function TarjetaVehiculo({ vehiculo, onSeleccionar }: Props) {
  const terminado = autoTerminado(vehiculo);

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(vehiculo)}
      className={`flex flex-col gap-4 rounded-3xl border-4 p-6 text-left transition-transform active:scale-[0.98] ${
        terminado
          ? "border-green-500 bg-green-950/40"
          : "border-zinc-700 bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-bold leading-tight text-white">
            {vehiculo.marca} {vehiculo.modelo}
          </p>
          <p className="text-2xl text-zinc-300">{vehiculo.color}</p>
        </div>
        {terminado && (
          <span className="rounded-full bg-green-600 px-4 py-2 text-xl font-bold text-white">
            Listo
          </span>
        )}
      </div>

      <p className="text-2xl font-mono tracking-widest text-zinc-400">
        …{ultimosDigitos(vehiculo.matricula)}
      </p>

      <div className="mt-auto flex items-end gap-4">
        {vehiculo.servicios.map((s) => (
          <Cono key={s.id} color={COLOR_AREA[s.tipo]} estado={s.estado} />
        ))}
      </div>
    </button>
  );
}
