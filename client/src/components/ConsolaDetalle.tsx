// Detalle del auto elegido en /admin: datos completos, un selector de estado por
// servicio, agregar/quitar servicios y, al pie, Editar y Retirar (esta última
// separada, es la acción destructiva).
// A diferencia de /display, acá SÍ se ve la matrícula entera y el celular.
import {
  AREAS,
  NOMBRE_AREA,
  NOMBRE_ESTADO,
  autoTerminado,
  celularLocal,
} from "../dominio";
import type {
  EstadoServicio,
  Servicio,
  TipoServicio,
  Vehiculo,
} from "../types";
import { ConsolaEstados } from "./ConsolaEstados";
import { ConsolaPunto } from "./ConsolaPunto";

interface Props {
  vehiculo: Vehiculo;
  ocupado: boolean;
  onVolver: () => void; // solo se ve en móvil
  onCambiarEstado: (servicioId: number, estado: EstadoServicio) => void;
  onAgregarServicio: (vehiculoId: number, tipo: TipoServicio) => void;
  onQuitarServicio: (servicio: Servicio) => void; // pide confirmación
  onEditar: (vehiculo: Vehiculo) => void;
  onRetirar: (vehiculo: Vehiculo) => void; // pide confirmación
}

const SECCION =
  "text-[11px] font-medium font-mono tracking-[0.12em] text-con-suave uppercase";

export function ConsolaDetalle({
  vehiculo,
  ocupado,
  onVolver,
  onCambiarEstado,
  onAgregarServicio,
  onQuitarServicio,
  onEditar,
  onRetirar,
}: Props) {
  const listo = autoTerminado(vehiculo);
  const soloUno = vehiculo.servicios.length <= 1;
  const tiene = new Set(vehiculo.servicios.map((s) => s.tipo));
  const faltantes = AREAS.filter((t) => !tiene.has(t));

  return (
    <article className="flex min-h-full flex-col gap-6 p-4 sm:p-6">
      <button
        type="button"
        onClick={onVolver}
        className="con-foco flex min-h-12 items-center gap-2 self-start rounded-sm border border-con-borde-fuerte bg-con-sup px-4 text-base font-medium text-con-texto transition-colors hover:bg-con-sup2 lg:hidden"
      >
        <span aria-hidden="true">←</span> Volver a la lista
      </button>

      <header>
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-4xl leading-tight font-normal tracking-[-0.025em] break-words text-con-texto">
            {vehiculo.marca} {vehiculo.modelo}
          </h2>
          {listo && (
            <span className="shrink-0 rounded-sm bg-con-listo px-2.5 py-1 text-sm font-medium font-mono tracking-wide text-white uppercase">
              ✓ Listo
            </span>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className={SECCION}>Color</dt>
            <dd className="mt-1 text-lg text-con-texto">{vehiculo.color}</dd>
          </div>
          <div>
            <dt className={SECCION}>Matrícula</dt>
            <dd className="mt-1">
              <span className="inline-block rounded-sm border border-con-borde-fuerte px-2.5 py-0.5 text-lg font-medium tracking-wider text-con-texto tabular-nums">
                {vehiculo.matricula}
              </span>
            </dd>
          </div>
          {vehiculo.telefono && (
            <div>
              <dt className={SECCION}>WhatsApp</dt>
              <dd className="mt-1 text-lg text-con-texto tabular-nums">
                {celularLocal(vehiculo.telefono)}
              </dd>
            </div>
          )}
        </dl>
      </header>

      <section aria-label="Servicios">
        <h3 className={SECCION}>Servicios</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {vehiculo.servicios.map((s) => (
            <li
              key={s.id}
              className="rounded-sm border border-con-borde bg-con-sup p-3 sm:p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <ConsolaPunto tipo={s.tipo} estado={s.estado} tamano={20} />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg leading-tight font-medium text-con-texto">
                    {NOMBRE_AREA[s.tipo]}
                  </span>
                  <span className="block text-sm text-con-suave">
                    {NOMBRE_ESTADO[s.estado]}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onQuitarServicio(s)}
                  disabled={ocupado || soloUno}
                  title={soloUno ? "Si terminó, retirá el auto" : undefined}
                  className="con-foco min-h-12 shrink-0 rounded-sm border border-con-borde-fuerte px-4 text-[15px] font-medium text-con-texto transition-colors hover:bg-con-sup2 disabled:opacity-40"
                >
                  Quitar servicio
                </button>
              </div>
              <ConsolaEstados
                estado={s.estado}
                disabled={ocupado}
                etiquetaServicio={NOMBRE_AREA[s.tipo]}
                onCambiar={(e) => onCambiarEstado(s.id, e)}
              />
            </li>
          ))}
        </ul>

        {faltantes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {faltantes.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => onAgregarServicio(vehiculo.id, tipo)}
                disabled={ocupado}
                className="con-foco inline-flex min-h-12 items-center gap-2 rounded-sm border border-dashed border-con-borde-fuerte px-3 text-[15px] font-medium text-con-texto transition-colors hover:bg-con-sup2 disabled:opacity-40"
              >
                <ConsolaPunto tipo={tipo} />+ {NOMBRE_AREA[tipo]}
              </button>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-auto flex items-center gap-3 border-t border-con-borde pt-5">
        <button
          type="button"
          onClick={() => onEditar(vehiculo)}
          disabled={ocupado}
          className="con-foco min-h-12 rounded-sm border border-con-borde-fuerte bg-con-sup px-6 text-base font-medium text-con-texto transition-colors hover:bg-con-sup2 disabled:opacity-50"
        >
          Editar
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onRetirar(vehiculo)}
          disabled={ocupado}
          className="con-foco min-h-12 rounded-sm border border-con-peligro/60 px-6 text-base font-medium text-con-peligro transition-colors hover:bg-con-peligro/10 disabled:opacity-50"
        >
          Retirar auto
        </button>
      </footer>
    </article>
  );
}
