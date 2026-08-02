// Tarjeta de un auto en /taller: los trabajadores SOLO cambian el estado de cada
// servicio. Nada de alta/editar/agregar/quitar/retirar (eso es de /admin).
// Botones grandes y separados, para una tablet usada a veces con las manos
// ocupadas. Muestra la matrícula entera para identificar el auto que se tiene
// adelante (igual que /admin; /display sí la oculta).
import { COLOR_AREA, NOMBRE_AREA, autoTerminado } from "../dominio";
import type { EstadoServicio, Vehiculo } from "../types";
import { PASTILLA_LISTO, RESALTE_LISTO, TARJETA } from "../tema";
import { BotonesEstado } from "./BotonesEstado";
import { Cono } from "./Cono";

interface Props {
  vehiculo: Vehiculo;
  ocupado: boolean;
  onCambiarEstado: (servicioId: number, estado: EstadoServicio) => void;
}

export function TallerTarjeta({ vehiculo, ocupado, onCambiarEstado }: Props) {
  const terminado = autoTerminado(vehiculo);

  return (
    <div
      className={`flex flex-col gap-5 p-5 sm:p-6 ${TARJETA} ${
        terminado ? RESALTE_LISTO : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-black break-words text-tinta sm:text-3xl">
            {vehiculo.marca} {vehiculo.modelo}
          </p>
          <p className="text-lg text-tinta-suave sm:text-xl">
            {vehiculo.color} · {vehiculo.matricula}
          </p>
        </div>
        {terminado && (
          <span className={`${PASTILLA_LISTO} px-4 py-1 text-base sm:text-xl`}>
            Listo
          </span>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {vehiculo.servicios.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-linea bg-crema p-4"
          >
            <div className="mb-3 flex items-center gap-3">
              <Cono
                color={COLOR_AREA[s.tipo]}
                estado={s.estado}
                className="h-12 w-12 shrink-0 sm:h-14 sm:w-14"
              />
              <span className="text-2xl font-bold text-tinta sm:text-3xl">
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
    </div>
  );
}
