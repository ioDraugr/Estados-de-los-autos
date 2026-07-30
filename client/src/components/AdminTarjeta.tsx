// Tarjeta de un auto en /admin: cambiar el estado de cada servicio, agregar o
// quitar servicios, editar los datos del auto y retirarlo. Botones grandes,
// pensados para usar en una tablet parado al lado del auto.
// A diferencia de /display, acá SÍ se muestra la matrícula entera: los
// trabajadores la necesitan para identificar el auto.
import {
  COLOR_AREA,
  ESTILO_ESTADO,
  NOMBRE_AREA,
  NOMBRE_ESTADO,
  autoTerminado,
} from "../dominio";
import type { EstadoServicio, TipoServicio, Vehiculo } from "../types";
import { Cono } from "./Cono";

const AREAS: TipoServicio[] = ["instalacion", "polarizado", "vitrificado"];
const ESTADOS: EstadoServicio[] = ["esperando", "en_proceso", "terminado"];

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
      className={`flex flex-col gap-4 rounded-2xl border-4 p-4 sm:rounded-3xl sm:p-6 ${
        terminado ? "border-green-500 bg-green-950/30" : "border-zinc-700 bg-zinc-900"
      }`}
    >
      {/* Encabezado: datos del auto + acciones sobre el auto. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold break-words text-white sm:text-3xl">
            {vehiculo.marca} {vehiculo.modelo}
          </p>
          <p className="text-lg text-zinc-300 sm:text-xl">
            {vehiculo.color} · {vehiculo.matricula}
          </p>
        </div>
        {terminado && (
          <span className="shrink-0 rounded-full bg-green-600 px-3 py-1 text-base font-bold text-white sm:text-xl">
            Listo
          </span>
        )}
      </div>

      {/* Un servicio por fila con su cono y los tres estados. */}
      <div className="flex flex-col gap-3">
        {vehiculo.servicios.map((s) => (
          <div key={s.id} className="rounded-2xl bg-zinc-800 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Cono
                color={COLOR_AREA[s.tipo]}
                estado={s.estado}
                className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
              />
              <span className="flex-1 text-xl font-semibold text-white sm:text-2xl">
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
                className="shrink-0 rounded-xl bg-zinc-700 px-3 py-2 text-base font-bold text-zinc-200 active:scale-95 disabled:opacity-40 sm:text-lg"
              >
                Quitar
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              {ESTADOS.map((estado) => {
                const activo = s.estado === estado;
                return (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => !activo && onCambiarEstado(s.id, estado)}
                    disabled={ocupado}
                    className={`rounded-xl py-3 text-base font-bold active:scale-95 disabled:opacity-60 sm:text-lg ${
                      activo
                        ? ESTILO_ESTADO[estado]
                        : "bg-zinc-900 text-zinc-400 ring-2 ring-zinc-700"
                    }`}
                  >
                    {NOMBRE_ESTADO[estado]}
                  </button>
                );
              })}
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
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-600 px-3 py-2 text-base font-semibold text-zinc-200 active:scale-95 disabled:opacity-40 sm:text-lg"
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
          className="flex-1 rounded-xl bg-zinc-700 py-3 text-lg font-bold text-white active:scale-[0.98] disabled:opacity-50"
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
          className="flex-1 rounded-xl bg-red-700 py-3 text-lg font-bold text-white active:scale-[0.98] disabled:opacity-50"
        >
          Retirar
        </button>
      </div>
    </div>
  );
}
