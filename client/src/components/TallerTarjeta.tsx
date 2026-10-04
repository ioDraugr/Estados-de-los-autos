// Tarjeta de un auto en /taller: los trabajadores SOLO cambian el estado de cada
// servicio. Nada de alta/editar/agregar/quitar/retirar (eso es de /admin).
// Botones grandes, para una tablet usada a veces con las manos ocupadas.
// Muestra la matrícula entera para identificar el auto que se tiene adelante
// (igual que /admin; /display sí la oculta).
// Tarjeta plana: arriba el auto y, separados por líneas finas (sin cajas
// adentro de la tarjeta), sus servicios con el selector de estado.
import { NOMBRE_AREA, NOMBRE_ESTADO, autoTerminado } from "../dominio";
import type { EstadoServicio, Vehiculo } from "../types";
import { CAPSULA_MATRICULA_CLARA, RESALTE_LISTO, TARJETA } from "../tema";
import { BotonesEstado } from "./BotonesEstado";
import { IndicadorArea } from "./IndicadorArea";
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
      className={`flex flex-col px-5 pt-5 pb-1 sm:px-6 ${TARJETA} ${
        terminado ? RESALTE_LISTO : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 pb-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-2xl leading-tight font-semibold break-words text-tinta">
            {vehiculo.marca} {vehiculo.modelo}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-base text-tinta-suave">
              {vehiculo.color}
            </span>
            <span className={`${CAPSULA_MATRICULA_CLARA} text-[15px]`}>
              {vehiculo.matricula}
            </span>
          </div>
        </div>
        {terminado && (
          <PastillaListo className="h-9 text-base" />
        )}
      </div>

      {vehiculo.servicios.map((s) => (
        <div
          key={s.id}
          className="border-t border-linea pt-4 pb-5"
        >
          <div className="mb-3 flex items-center gap-3">
            <IndicadorArea tipo={s.tipo} estado={s.estado} tamano="ficha" />
            <span className="min-w-0 flex-1 text-xl font-semibold text-tinta">
              {NOMBRE_AREA[s.tipo]}
            </span>
            {/* El estado también va en texto, no solo en el color. */}
            <span className="shrink-0 text-base font-medium text-tinta-suave">
              {NOMBRE_ESTADO[s.estado]}
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
