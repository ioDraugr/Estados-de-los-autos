// "Autos que más tardaron" en el período: desde que entraron al taller hasta
// que quedaron con todos sus servicios terminados. Cada auto como en el
// showroom: "Marca Modelo Color" y solo los últimos dígitos de la matrícula
// (el server nunca manda la entera), con su tiempo y los servicios que tuvo.
import { COLOR_AREA, NOMBRE_AREA, formatearDuracion } from "../../dominio";
import type { AutoLento } from "../../types";
import { CAPSULA_MATRICULA_CLARA, TEXTO_VACIO } from "../../tema";
import { TarjetaConfig } from "../TarjetaConfig";

interface Props {
  autos: AutoLento[];
}

export function AutosLentos({ autos }: Props) {
  return (
    <TarjetaConfig
      titulo="Autos que más tardaron"
      ayuda="Desde que entraron hasta que terminaron todos sus servicios."
    >
      {autos.length === 0 ? (
        <p className={`${TEXTO_VACIO} py-6 text-xl`}>
          Ningún auto terminó todos sus servicios en este período.
        </p>
      ) : (
        <ol className="flex flex-col">
          {autos.map((auto, i) => (
            <li
              key={auto.id}
              className="flex items-center gap-3 border-t border-tinta/[0.08] py-4 first:border-t-0 first:pt-0 last:pb-0 sm:gap-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tinta/[0.07] text-lg font-semibold text-tinta-suave tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-xl font-semibold tracking-[-0.02em] text-tinta sm:text-[22px]">
                    {auto.marca} {auto.modelo} {auto.color}
                  </span>
                  <span className={CAPSULA_MATRICULA_CLARA}>
                    <span aria-hidden="true" className="tracking-[0.12em] text-tinta-suave">
                      ••
                    </span>
                    {auto.ultimosDigitos}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {auto.tipos.map((tipo) => (
                    <span
                      key={tipo}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-base font-medium text-tinta"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLOR_AREA[tipo] }}
                      />
                      {NOMBRE_AREA[tipo]}
                    </span>
                  ))}
                </div>
              </div>
              <span className="shrink-0 text-right text-xl font-semibold text-tinta tabular-nums sm:text-2xl">
                {formatearDuracion(auto.minutos)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </TarjetaConfig>
  );
}
