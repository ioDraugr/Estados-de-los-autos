// Tarjeta de un auto en /admin: cambiar el estado de cada servicio, agregar o
// quitar servicios, editar los datos del auto y retirarlo. Botones grandes,
// pensados para usar en una tablet parado al lado del auto.
// A diferencia de /display, acá SÍ se muestra la matrícula entera: los
// trabajadores la necesitan para identificar el auto.
import { AREAS, COLOR_AREA, NOMBRE_AREA, autoTerminado } from "../dominio";
import type { EstadoServicio, TipoServicio, Vehiculo } from "../types";
import {
  BOTON_PELIGRO,
  BOTON_SUAVE,
  PASTILLA_LISTO,
  RESALTE_LISTO,
  TARJETA,
} from "../tema";
import { BotonesEstado } from "./BotonesEstado";
import { Cono } from "./Cono";

interface Props {
  vehiculo: Vehiculo;
  ocupado: boolean;
  onCambiarEstado: (servicioId: number, estado: EstadoServicio) => void;
  onAgregarServicio: (vehiculoId: number, tipo: TipoServicio) => void;
  onQuitarServicio: (servicioId: number) => void;
  onEditar: (vehiculo: Vehiculo) => void;
  onRetirar: (vehiculo: Vehiculo) => void;
}

export function AdminTarjeta({
  vehiculo,
  ocupado,
  onCambiarEstado,
  onAgregarServicio,
  onQuitarServicio,
  onEditar,
  onRetirar,
}: Props) {
  const terminado = autoTerminado(vehiculo);
  const soloUnServicio = vehiculo.servicios.length <= 1;
  const tiene = new Set(vehiculo.servicios.map((s) => s.tipo));
  const faltantes = AREAS.filter((t) => !tiene.has(t));

  return (
    <div
      className={`flex flex-col gap-4 p-4 sm:p-6 ${TARJETA} ${
        terminado ? RESALTE_LISTO : ""
      }`}
    >
      {/* Encabezado: datos del auto + acciones sobre el auto. */}
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

      {/* Un servicio por fila con su cono y los tres estados. */}
      <div className="flex flex-col gap-3">
        {vehiculo.servicios.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-linea bg-crema p-3 sm:p-4"
          >
            <div className="flex items-center gap-3">
              <Cono
                color={COLOR_AREA[s.tipo]}
                estado={s.estado}
                className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
              />
              <span className="flex-1 text-xl font-bold text-tinta sm:text-2xl">
                {NOMBRE_AREA[s.tipo]}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(`¿Quitar ${NOMBRE_AREA[s.tipo]} de este auto?`)
                  ) {
                    onQuitarServicio(s.id);
                  }
                }}
                disabled={ocupado || soloUnServicio}
                title={
                  soloUnServicio
                    ? "Si terminó, retiralo"
                    : `Quitar ${NOMBRE_AREA[s.tipo]}`
                }
                className={`${BOTON_SUAVE} shrink-0 px-3 py-2 text-base disabled:opacity-40 sm:text-lg`}
              >
                Quitar
              </button>
            </div>

            <div className="mt-3">
              <BotonesEstado
                estado={s.estado}
                disabled={ocupado}
                onCambiar={(estado) => onCambiarEstado(s.id, estado)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Agregar un servicio que el auto todavía no tiene. */}
      {faltantes.length > 0 && (
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {faltantes.map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => onAgregarServicio(vehiculo.id, tipo)}
              disabled={ocupado}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-tinta/25 px-3 py-2 text-base font-bold text-tinta active:scale-95 disabled:opacity-40 sm:text-lg"
            >
              <Cono
                color={COLOR_AREA[tipo]}
                estado="esperando"
                className="h-6 w-6 shrink-0"
              />
              + {NOMBRE_AREA[tipo]}
            </button>
          ))}
        </div>
      )}

      {/* Acciones sobre el auto. */}
      <div className="mt-auto flex gap-3">
        <button
          type="button"
          onClick={() => onEditar(vehiculo)}
          disabled={ocupado}
          className={`${BOTON_SUAVE} flex-1 py-3 text-lg`}
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                `¿Retirar ${vehiculo.marca} ${vehiculo.modelo}? Sale de la lista.`,
              )
            ) {
              onRetirar(vehiculo);
            }
          }}
          disabled={ocupado}
          className={`${BOTON_PELIGRO} flex-1 py-3 text-lg`}
        >
          Retirar
        </button>
      </div>
    </div>
  );
}
