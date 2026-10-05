// Tarjeta de un AUTO en /taller (modo General): el auto arriba y, separados por
// líneas finas, sus servicios con el selector de estado ahí mismo. La matrícula
// va entera (identifica el auto que se tiene delante).
import type { CSSProperties } from "react";
import { NOMBRE_AREA, autoTerminado } from "../dominio";
import type { EstadoServicio, Vehiculo } from "../types";
import { ConsolaPunto } from "./ConsolaPunto";
import { TallerEstados } from "./TallerEstados";
import type { Trabajo } from "./tallerTablero";

interface Props {
  vehiculo: Vehiculo;
  ocupado: boolean;
  onCambiar: (trabajo: Trabajo, estado: EstadoServicio) => void;
  entrada?: { className: string; style?: CSSProperties };
  destelloServicio?: { servicioId: number; clave: number } | null;
}

export function TallerAuto({
  vehiculo: v,
  ocupado,
  onCambiar,
  entrada,
  destelloServicio,
}: Props) {
  const auto = `${v.marca} ${v.modelo}`;
  const listo = autoTerminado(v);

  return (
    <li
      style={entrada?.style}
      className={`flex flex-col rounded-sm border border-con-borde bg-con-sup ${entrada?.className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-2xl leading-tight font-medium tracking-[-0.02em] break-words text-con-texto">
            {auto}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="rounded-sm border border-con-borde-fuerte px-2.5 py-0.5 text-lg font-medium tracking-wider text-con-texto tabular-nums">
              {v.matricula}
            </span>
            <span className="text-base text-con-suave">{v.color}</span>
          </div>
        </div>
        {listo && (
          <span className="shrink-0 rounded-sm bg-con-listo px-2 py-0.5 font-mono text-xs font-medium tracking-wide text-white uppercase">
            ✓ Listo
          </span>
        )}
      </div>

      <ul>
        {v.servicios.map((s) => {
          const area = NOMBRE_AREA[s.tipo];
          const toque = destelloServicio?.servicioId === s.id;
          return (
            <li
              key={s.id}
              className="relative flex flex-col gap-3 border-t border-con-borde p-4"
            >
              {toque && (
                <span
                  key={destelloServicio.clave}
                  className="con-anim-destello"
                />
              )}
              <div className="flex items-center gap-2.5">
                <ConsolaPunto tipo={s.tipo} estado={s.estado} tamano={20} />
                <span className="text-xl font-medium text-con-texto">
                  {area}
                </span>
              </div>
              <TallerEstados
                estado={s.estado}
                disabled={ocupado}
                etiqueta={`${area} de ${auto}`}
                onCambiar={(estado) =>
                  onCambiar({ vehiculo: v, servicio: s }, estado)
                }
              />
            </li>
          );
        })}
      </ul>
    </li>
  );
}
