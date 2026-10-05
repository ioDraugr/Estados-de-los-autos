// "Autos que más tardaron" en el período: desde que entraron al taller hasta
// que quedaron con todos sus servicios terminados. Cada auto como en el
// showroom: "Marca Modelo Color" y solo los últimos dígitos de la matrícula
// (el server nunca manda la entera), con su tiempo y los servicios que tuvo.
import { NOMBRE_AREA, formatearDuracion } from "../../dominio";
import type { AutoLento } from "../../types";
import { ConsolaPunto } from "../ConsolaPunto";
import { PanelReporte } from "./PanelReporte";

interface Props {
  autos: AutoLento[];
}

export function AutosLentos({ autos }: Props) {
  return (
    <PanelReporte
      titulo="Autos que más tardaron"
      ayuda="Desde que entraron hasta que terminaron todos sus servicios."
    >
      {autos.length === 0 ? (
        <p className="py-6 text-center text-lg font-light text-con-suave">
          Ningún auto terminó todos sus servicios en este período.
        </p>
      ) : (
        <ol className="flex flex-col">
          {autos.map((auto, i) => (
            <li
              key={auto.id}
              className="flex items-start gap-3 border-t border-con-borde py-4 first:border-t-0 first:pt-0 last:pb-0 sm:gap-4"
            >
              <span className="w-6 shrink-0 pt-1 font-mono text-sm text-con-suave tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-lg font-medium tracking-[-0.01em] text-con-texto">
                    {auto.marca} {auto.modelo} {auto.color}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-sm border border-con-borde-fuerte bg-con-fondo px-2 py-0.5 font-mono text-sm text-con-texto">
                    <span aria-hidden="true" className="text-con-suave">
                      ••
                    </span>
                    {auto.ultimosDigitos}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {auto.tipos.map((tipo) => (
                    <span
                      key={tipo}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-con-borde px-2 py-0.5 font-mono text-xs tracking-[0.04em] text-con-texto uppercase"
                    >
                      <ConsolaPunto tipo={tipo} tamano={10} />
                      {NOMBRE_AREA[tipo]}
                    </span>
                  ))}
                </div>
              </div>
              <span className="shrink-0 pt-0.5 text-right text-xl font-light text-con-texto tabular-nums">
                {formatearDuracion(auto.minutos)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </PanelReporte>
  );
}
