// Tarjeta de un auto en /admin: cambiar el estado de cada servicio, agregar o
// quitar servicios, editar los datos del auto y retirarlo. Botones grandes,
// pensados para usar en una tablet parado al lado del auto.
// A diferencia de /display, acá SÍ se muestra la matrícula entera: los
// trabajadores la necesitan para identificar el auto. Lo mismo el celular del
// cliente (si se cargó): solo existe acá, nunca en /taller ni en /display.
// Tarjeta plana como la de /taller: los servicios van separados por líneas
// finas y las acciones son botones de esquinas chicas.
import {
  AREAS,
  NOMBRE_AREA,
  NOMBRE_ESTADO,
  autoTerminado,
  celularLocal,
} from "../dominio";
import type { EstadoServicio, TipoServicio, Vehiculo } from "../types";
import {
  BOTON_PELIGRO,
  BOTON_SUAVE,
  CAPSULA_MATRICULA_CLARA,
  RESALTE_LISTO,
  TARJETA,
} from "../tema";
import { BotonesEstado } from "./BotonesEstado";
import { IndicadorArea } from "./IndicadorArea";
import { PastillaListo } from "./PastillaListo";

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
      className={`flex flex-col p-5 sm:p-6 ${TARJETA} ${
        terminado ? RESALTE_LISTO : ""
      }`}
    >
      {/* Encabezado: datos del auto. */}
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-2xl leading-tight font-semibold break-words text-tinta">
          {vehiculo.marca} {vehiculo.modelo}
        </p>
        {terminado && (
          <PastillaListo className="h-9 text-base" />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-base text-tinta-suave">
          {vehiculo.color}
        </span>
        <span className={`${CAPSULA_MATRICULA_CLARA} text-[15px]`}>
          {vehiculo.matricula}
        </span>
      </div>
      {vehiculo.telefono && (
        <p className="mt-3 inline-flex min-h-8 items-center gap-2 self-start rounded-md border border-listo/40 bg-listo/10 px-3 text-[15px] font-medium text-listo tabular-nums">
          WhatsApp: {celularLocal(vehiculo.telefono)}
        </p>
      )}

      {/* Un servicio por fila con su cono y los tres estados, separados por
          líneas finas. */}
      <div className="mt-4">
        {vehiculo.servicios.map((s) => (
          <div
            key={s.id}
            className="border-t border-linea pt-4 pb-4"
          >
            <div className="mb-3 flex items-center gap-3">
              <IndicadorArea tipo={s.tipo} estado={s.estado} />
              <span className="min-w-0 flex-1">
                <span className="block text-lg leading-tight font-semibold text-tinta">
                  {NOMBRE_AREA[s.tipo]}
                </span>
                {/* El estado también va en texto, no solo en el color. */}
                <span className="block text-base text-tinta-suave">
                  {NOMBRE_ESTADO[s.estado]}
                </span>
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
                className="min-h-12 shrink-0 rounded-lg border border-linea bg-crema-alta px-4 text-base font-semibold text-tinta transition-colors hover:bg-arena focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:opacity-40"
              >
                Quitar
              </button>
            </div>

            <BotonesEstado
              estado={s.estado}
              disabled={ocupado}
              onCambiar={(estado) => onCambiarEstado(s.id, estado)}
            />
          </div>
        ))}
      </div>

      {/* Agregar un servicio que el auto todavía no tiene. */}
      {faltantes.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {faltantes.map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => onAgregarServicio(vehiculo.id, tipo)}
              disabled={ocupado}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-dashed border-tinta/50 bg-crema-alta px-3 text-base font-semibold text-tinta transition-colors hover:bg-arena focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:opacity-40"
            >
              <IndicadorArea tipo={tipo} />
              + {NOMBRE_AREA[tipo]}
            </button>
          ))}
        </div>
      )}

      {/* Acciones sobre el auto: dos cápsulas del mismo ancho. */}
      <div className="mt-auto flex gap-3 pt-5">
        <button
          type="button"
          onClick={() => onEditar(vehiculo)}
          disabled={ocupado}
          className={`${BOTON_SUAVE} h-14 flex-1 text-lg`}
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
          className={`${BOTON_PELIGRO} h-14 flex-1 text-lg`}
        >
          Retirar
        </button>
      </div>
    </div>
  );
}
