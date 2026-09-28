// Tarjeta de un auto en /admin: cambiar el estado de cada servicio, agregar o
// quitar servicios, editar los datos del auto y retirarlo. Botones grandes,
// pensados para usar en una tablet parado al lado del auto.
// A diferencia de /display, acá SÍ se muestra la matrícula entera: los
// trabajadores la necesitan para identificar el auto. Lo mismo el celular del
// cliente (si se cargó): solo existe acá, nunca en /taller ni en /display.
// Tarjeta de vidrio claro como la de /taller: los servicios van separados por
// líneas finas y las acciones son cápsulas.
import {
  AREAS,
  COLOR_AREA,
  NOMBRE_AREA,
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
import { Cono } from "./Cono";
import { ConoCirculo } from "./ConoCirculo";
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
      className={`flex flex-col p-5 sm:p-[26px] ${TARJETA} ${
        terminado ? RESALTE_LISTO : ""
      }`}
    >
      {/* Encabezado: datos del auto. */}
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[26px] leading-[1.04] font-[650] tracking-[-0.045em] break-words text-tinta sm:text-[30px]">
          {vehiculo.marca} {vehiculo.modelo}
        </p>
        {terminado && (
          <PastillaListo className="h-[34px] text-[15px] sm:text-base" />
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="text-base text-tinta-suave sm:text-[17px]">
          {vehiculo.color}
        </span>
        <span className={`${CAPSULA_MATRICULA_CLARA} text-[15px]`}>
          {vehiculo.matricula}
        </span>
      </div>
      {vehiculo.telefono && (
        <p className="mt-3 inline-flex min-h-8 items-center gap-2 self-start rounded-full bg-listo/10 px-3 text-[15px] font-medium text-listo tabular-nums">
          <span
            aria-hidden="true"
            className="h-[7px] w-[7px] shrink-0 rounded-full bg-listo-vivo"
          />
          WhatsApp: {celularLocal(vehiculo.telefono)}
        </p>
      )}

      {/* Un servicio por fila con su cono y los tres estados, separados por
          líneas finas. */}
      <div className="mt-[18px]">
        {vehiculo.servicios.map((s) => (
          <div
            key={s.id}
            className="border-t border-tinta/[0.08] pt-3.5 pb-4"
          >
            <div className="mb-2.5 flex items-center gap-3">
              <ConoCirculo
                color={COLOR_AREA[s.tipo]}
                estado={s.estado}
                tamano="tarjeta"
                tono="claro"
              />
              <span className="min-w-0 flex-1 text-xl font-semibold tracking-[-0.02em] text-tinta">
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
                className="h-11 shrink-0 rounded-full bg-tinta/[0.06] px-4 text-[15px] font-semibold text-tinta-suave transition hover:bg-tinta/[0.12] hover:text-tinta active:scale-95 disabled:opacity-40"
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
              className="inline-flex h-[46px] items-center gap-2 rounded-full border border-dashed border-tinta/[0.22] bg-white/40 px-4 text-base font-semibold text-tinta transition hover:border-tinta/35 hover:bg-white/80 active:scale-95 disabled:opacity-40"
            >
              <Cono
                color={COLOR_AREA[tipo]}
                estado="esperando"
                className="h-[19px] w-auto shrink-0"
              />
              + {NOMBRE_AREA[tipo]}
            </button>
          ))}
        </div>
      )}

      {/* Acciones sobre el auto: dos cápsulas del mismo ancho. */}
      <div className="mt-auto flex gap-2.5 pt-5">
        <button
          type="button"
          onClick={() => onEditar(vehiculo)}
          disabled={ocupado}
          className={`${BOTON_SUAVE} h-[54px] flex-1 text-[17px]`}
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
          className={`${BOTON_PELIGRO} h-[54px] flex-1 text-[17px]`}
        >
          Retirar
        </button>
      </div>
    </div>
  );
}
