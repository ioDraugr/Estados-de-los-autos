// Tarjeta de un auto en la grilla del showroom. Toda la tarjeta es táctil.
// Los tamaños escalan con la pantalla: cómodos en un celular en la mano,
// enormes en la pantalla del showroom que se mira de lejos.
import type { Vehiculo } from "../types";
import { COLOR_AREA, autoTerminado, ultimosDigitos } from "../dominio";
import { PASTILLA_LISTO, RESALTE_LISTO, TARJETA } from "../tema";
import { Cono } from "./Cono";
import { Flecha } from "./Flecha";

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
      className={`flex flex-col gap-3 p-5 text-left transition-transform active:scale-[0.98] sm:gap-4 sm:p-7 ${TARJETA} ${
        terminado ? RESALTE_LISTO : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* min-w-0 + break-words: un modelo largo corta en vez de desbordar. */}
        <div className="min-w-0">
          <p className="text-2xl leading-tight font-black break-words text-tinta sm:text-3xl 2xl:text-4xl">
            {vehiculo.marca} {vehiculo.modelo}
          </p>
          <p className="mt-1 text-lg font-bold text-tinta/80 sm:text-xl 2xl:text-2xl">
            {vehiculo.color}
          </p>
        </div>

        {/* Botón redondo de "ver más": es la pista visual de que la tarjeta se
            toca. Decorativo, porque quien recibe el toque es la tarjeta entera. */}
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca-suave text-tinta sm:h-12 sm:w-12"
        >
          <Flecha direccion="derecha" className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
      </div>

      <p className="text-lg tracking-widest text-tinta-suave sm:text-xl 2xl:text-2xl">
        …{ultimosDigitos(vehiculo.matricula)}
      </p>

      {/* flex-wrap: con 3 servicios y la tarjeta angosta, los conos bajan de fila. */}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          {vehiculo.servicios.map((s) => (
            <Cono
              key={s.id}
              color={COLOR_AREA[s.tipo]}
              estado={s.estado}
              className="h-11 w-11 shrink-0 sm:h-14 sm:w-14 2xl:h-16 2xl:w-16"
            />
          ))}
        </div>
        {terminado && (
          <span
            className={`${PASTILLA_LISTO} px-4 py-1 text-base sm:px-5 sm:py-2 sm:text-xl`}
          >
            Listo
          </span>
        )}
      </div>
    </button>
  );
}
