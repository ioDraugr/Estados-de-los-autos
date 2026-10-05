// Tiempo promedio de cada servicio (de "en proceso" a "terminado"): una fila
// por área con su punto de color, una barra fina proporcional al más largo, la
// duración ("2 h 15 min") y sobre cuántos servicios se promedió. Un área sin
// ninguna vuelta completa en el período dice "Sin datos". Barras hechas con
// divs (no hace falta Recharts para esto) y sin animación.
import { COLOR_AREA, NOMBRE_AREA, formatearDuracion } from "../../dominio";
import type { TipoServicio } from "../../types";
import { ConsolaPunto } from "../ConsolaPunto";
import { PanelReporte } from "./PanelReporte";

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
    <PanelReporte
      titulo="Tiempo promedio por servicio"
      ayuda="Desde que pasa a “en proceso” hasta que queda terminado."
    >
      <ul className="flex flex-col gap-6">
        {tiempos.map(({ tipo, minutosPromedio, muestras }) => (
          <li key={tipo}>
            <div className="flex items-center gap-3">
              <ConsolaPunto tipo={tipo} tamano={12} />
              <span className="text-lg font-medium tracking-[-0.01em] text-con-texto">
                {NOMBRE_AREA[tipo]}
              </span>
              <span
                className={`ml-auto text-right tabular-nums ${
                  minutosPromedio === null
                    ? "text-base text-con-suave"
                    : "text-xl font-light text-con-texto"
                }`}
              >
                {minutosPromedio === null
                  ? "Sin datos"
                  : formatearDuracion(minutosPromedio)}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden bg-con-sup2">
              {minutosPromedio !== null && maximo > 0 && (
                <div
                  className="h-full"
                  style={{
                    // Al menos un poquito, para que un promedio corto se vea.
                    width: `${Math.max(4, (minutosPromedio / maximo) * 100)}%`,
                    backgroundColor: COLOR_AREA[tipo],
                  }}
                />
              )}
            </div>
            <p className="mt-1.5 text-sm text-con-suave">
              {muestras === 0
                ? "Ningún servicio con inicio y fin en el período."
                : `Promedio de ${muestras} ${muestras === 1 ? "servicio" : "servicios"}.`}
            </p>
          </li>
        ))}
      </ul>
    </PanelReporte>
  );
}
