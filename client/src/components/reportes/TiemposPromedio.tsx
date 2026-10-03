// Tiempo promedio de cada servicio (de "en proceso" a "terminado"): una fila
// por área con su cono, una barra horizontal proporcional al más largo, la
// duración ("2 h 15 min") y sobre cuántos servicios se promedió. Un área sin
// ninguna vuelta completa en el período dice "Sin datos". Barras hechas con
// divs (no hace falta Recharts para esto) y sin animación.
import { COLOR_AREA, NOMBRE_AREA, formatearDuracion } from "../../dominio";
import type { TipoServicio } from "../../types";
import { Cono } from "../Cono";
import { TarjetaConfig } from "../TarjetaConfig";

interface Props {
  tiempos: {
    tipo: TipoServicio;
    minutosPromedio: number | null;
    muestras: number;
  }[];
}

export function TiemposPromedio({ tiempos }: Props) {
  const maximo = Math.max(0, ...tiempos.map((t) => t.minutosPromedio ?? 0));

  return (
    <TarjetaConfig
      titulo="Tiempo promedio por servicio"
      ayuda="Desde que pasa a “en proceso” hasta que queda terminado."
    >
      <ul className="flex flex-col gap-5 sm:gap-6">
        {tiempos.map(({ tipo, minutosPromedio, muestras }) => (
          <li key={tipo}>
            <div className="flex items-center gap-3">
              <Cono
                color={COLOR_AREA[tipo]}
                estado="esperando"
                className="h-7 w-auto shrink-0"
              />
              <span className="text-xl font-semibold text-tinta sm:text-[22px]">
                {NOMBRE_AREA[tipo]}
              </span>
              <span
                className={`ml-auto text-right text-xl font-semibold tabular-nums sm:text-2xl ${
                  minutosPromedio === null ? "text-tinta-suave" : "text-tinta"
                }`}
              >
                {minutosPromedio === null
                  ? "Sin datos"
                  : formatearDuracion(minutosPromedio)}
              </span>
            </div>
            <div className="mt-2.5 h-3.5 overflow-hidden rounded-full bg-tinta/[0.07]">
              {minutosPromedio !== null && maximo > 0 && (
                <div
                  className="h-full rounded-full"
                  style={{
                    // Al menos un poquito, para que un promedio corto se vea.
                    width: `${Math.max(4, (minutosPromedio / maximo) * 100)}%`,
                    backgroundColor: COLOR_AREA[tipo],
                  }}
                />
              )}
            </div>
            <p className="mt-1.5 text-base text-tinta-suave">
              {muestras === 0
                ? "Ningún servicio con inicio y fin en el período."
                : `Promedio de ${muestras} ${muestras === 1 ? "servicio" : "servicios"}.`}
            </p>
          </li>
        ))}
      </ul>
    </TarjetaConfig>
  );
}
