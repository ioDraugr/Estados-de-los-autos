// Tarjeta de un auto en la grilla del showroom. Toda la tarjeta es táctil.
// Los tamaños escalan con la pantalla: cómodos en un celular en la mano,
// enormes en la pantalla del showroom que se mira de lejos.
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
      className={`flex flex-col gap-3 rounded-2xl border-4 p-4 text-left transition-transform active:scale-[0.98] sm:gap-4 sm:rounded-3xl sm:p-6 ${
        terminado
          ? "border-green-500 bg-green-950/40"
          : "border-zinc-700 bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* min-w-0 + break-words: un modelo largo corta en vez de desbordar. */}
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight break-words text-white sm:text-3xl 2xl:text-4xl">
            {vehiculo.marca} {vehiculo.modelo}
          </p>
          <p className="text-lg text-zinc-300 sm:text-2xl">{vehiculo.color}</p>
        </div>
        {terminado && (
          <span className="shrink-0 rounded-full bg-green-600 px-3 py-1 text-base font-bold text-white sm:px-4 sm:py-2 sm:text-xl">
            Listo
          </span>
        )}
      </div>

      <p className="font-mono text-lg tracking-widest text-zinc-400 sm:text-2xl">
        …{ultimosDigitos(vehiculo.matricula)}
      </p>

      {/* flex-wrap: con 3 servicios y la tarjeta angosta, los conos bajan de fila. */}
      <div className="mt-auto flex flex-wrap items-end gap-3 sm:gap-4">
        {vehiculo.servicios.map((s) => (
          <Cono
            key={s.id}
            color={COLOR_AREA[s.tipo]}
            estado={s.estado}
            className="h-11 w-11 shrink-0 sm:h-14 sm:w-14 2xl:h-16 2xl:w-16"
          />
        ))}
      </div>
    </button>
  );
}
