// Tarjeta de un auto en /taller: los trabajadores SOLO cambian el estado de cada
// servicio. Nada de alta/editar/agregar/quitar/retirar (eso es de /admin).
// Botones grandes, para una tablet usada a veces con las manos ocupadas.
// Muestra la matrícula entera para identificar el auto que se tiene adelante
// (igual que /admin; /display sí la oculta).
// Tarjeta de vidrio claro: arriba el auto y, separados por líneas finas (sin
// cajas adentro de la tarjeta), sus servicios con el selector de estado.
import { COLOR_AREA, NOMBRE_AREA, autoTerminado } from "../dominio";
import type { EstadoServicio, Vehiculo } from "../types";
import { CAPSULA_MATRICULA_CLARA, RESALTE_LISTO, TARJETA } from "../tema";
import { BotonesEstado } from "./BotonesEstado";
import { ConoCirculo } from "./ConoCirculo";
import { PastillaListo } from "./PastillaListo";

interface Props {
  vehiculo: Vehiculo;
  ocupado: boolean;
  onCambiarEstado: (servicioId: number, estado: EstadoServicio) => void;
}

export function TallerTarjeta({ vehiculo, ocupado, onCambiarEstado }: Props) {
  const terminado = autoTerminado(vehiculo);

  return (
    <div
      className={`flex flex-col px-5 pt-6 pb-1 sm:px-7 sm:pt-7 xl:px-6 2xl:px-7 ${TARJETA} ${
        terminado ? RESALTE_LISTO : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 pb-4 sm:pb-[18px]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <p className="text-[28px] leading-[1.04] font-[650] tracking-[-0.045em] break-words text-tinta sm:text-[34px]">
            {vehiculo.marca} {vehiculo.modelo}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-base text-tinta-suave sm:text-lg">
              {vehiculo.color}
            </span>
            <span className={`${CAPSULA_MATRICULA_CLARA} text-[15px] sm:text-base`}>
              {vehiculo.matricula}
            </span>
          </div>
        </div>
        {terminado && (
          <PastillaListo className="h-9 text-base sm:h-[38px] sm:text-[17px]" />
        )}
      </div>

      {vehiculo.servicios.map((s) => (
        <div
          key={s.id}
          className="border-t border-tinta/[0.08] pt-4 pb-5 sm:pt-[18px]"
        >
          <div className="mb-3 flex items-center gap-3.5 sm:mb-3.5">
            <ConoCirculo
              color={COLOR_AREA[s.tipo]}
              estado={s.estado}
              tamano="ficha"
              tono="claro"
            />
            <span className="min-w-0 text-[22px] font-semibold tracking-[-0.03em] text-tinta sm:text-2xl">
              {NOMBRE_AREA[s.tipo]}
            </span>
          </div>
          <BotonesEstado
            estado={s.estado}
            disabled={ocupado}
            tamano="grande"
            onCambiar={(estado) => onCambiarEstado(s.id, estado)}
          />
        </div>
      ))}
    </div>
  );
}
