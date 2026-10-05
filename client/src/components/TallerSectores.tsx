// Elección de sector (modo Por sector): tres tarjetas grandes con los
// contadores de lo pendiente. El último sector usado se resalta, pero no se
// salta esta pantalla.
import { AREAS, NOMBRE_AREA } from "../dominio";
import type { TipoServicio, Vehiculo } from "../types";
import { ConsolaPunto } from "./ConsolaPunto";
import { contarSector } from "./tallerTablero";

interface Props {
  vehiculos: Vehiculo[];
  ultimo: TipoServicio | null;
  onElegir: (a: TipoServicio) => void;
}

export function TallerSectores({ vehiculos, ultimo, onElegir }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-2xl font-light tracking-[-0.02em] text-con-texto sm:text-3xl">
        ¿En qué sector estás?
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {AREAS.map((tipo) => {
          const c = contarSector(vehiculos, tipo);
          const es = tipo === ultimo;
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => onElegir(tipo)}
              aria-label={`${NOMBRE_AREA[tipo]}: ${c.esperando} esperando, ${c.en_proceso} en proceso`}
              className={`con-foco flex min-h-52 flex-col items-start justify-between gap-6 rounded-sm border p-6 text-left transition-[transform,background-color] duration-150 hover:bg-con-sup2 active:scale-[0.98] ${
                es
                  ? "border-2 border-con-acento bg-con-sup"
                  : "border-con-borde-fuerte bg-con-sup"
              }`}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <ConsolaPunto tipo={tipo} tamano={32} />
                {es && (
                  <span className="font-mono text-xs font-medium tracking-[0.12em] text-con-suave uppercase">
                    Último usado
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-2">
                <span className="text-4xl leading-none font-light tracking-[-0.03em] text-con-texto">
                  {NOMBRE_AREA[tipo]}
                </span>
                <span className="text-lg text-con-suave tabular-nums">
                  {c.esperando} esperando · {c.en_proceso} en proceso
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
