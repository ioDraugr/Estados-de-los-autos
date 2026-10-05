// Los dos gráficos de barras de /reportes (Recharts), en paneles de consola:
//   - autos atendidos por día (semana) o por semana (mes),
//   - servicios terminados por área, cada barra con el color de su área.
// Sin animaciones (isAnimationActive={false}): el reporte se lee de una, y así
// no hay nada que respetar con prefers-reduced-motion. El globito al tocar una
// barra es cuadrado, blanco y en español ("3 autos", "1 servicio").
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from "recharts";
import { COLOR_AREA, NOMBRE_AREA } from "../../dominio";
import type { BarraAutos, TipoServicio } from "../../types";
import { PanelReporte } from "./PanelReporte";

// Colores de la consola (ver tokens con-* en index.css): negro azulado para
// las barras de autos, texto suave y línea fina para ejes y grilla.
const TEXTO_SUAVE = "#6b6e76";
const LINEA = "#e3e3e6";
const NEGRO_AZULADO = "#1c1e26";

// Letras de los ejes: monoespaciadas, legibles desde una tablet apoyada.
const LETRA_EJE = {
  fill: TEXTO_SUAVE,
  fontSize: 13,
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
};

// Alto del área del gráfico (el ancho lo pone la tarjeta).
const ALTO = 300;

// Lo que se usa de lo que Recharts le pasa al contenido del Tooltip.
type DatosGlobo = Pick<TooltipContentProps, "active" | "payload" | "label">;

interface GloboProps extends DatosGlobo {
  singular: string;
  plural: string;
}

// Globito al tocar una barra: el nombre de la barra y la cantidad con su unidad.
function Globo({ active, payload, label, singular, plural }: GloboProps) {
  if (!active || !payload?.length) return null;
  const cantidad = Number(payload[0].value ?? 0);
  return (
    <div className="rounded-sm border border-con-borde-fuerte bg-con-sup px-3 py-2 text-con-texto">
      <p className="text-sm text-con-suave">{label}</p>
      <p className="text-lg font-medium tabular-nums">
        {cantidad} {cantidad === 1 ? singular : plural}
      </p>
    </div>
  );
}

interface AutosProps {
  serie: BarraAutos[];
  periodo: "semana" | "mes";
}

export function GraficoAutos({ serie, periodo }: AutosProps) {
  return (
    <PanelReporte
      titulo="Autos atendidos"
      ayuda={
        periodo === "semana"
          ? "Autos con algún servicio terminado, día por día."
          : "Autos con algún servicio terminado, semana por semana (días del mes)."
      }
    >
      <div style={{ height: ALTO }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={serie}
            margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke={LINEA} />
            <XAxis
              dataKey="etiqueta"
              tick={LETRA_EJE}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={LETRA_EJE}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(28,30,38,0.05)" }}
              content={({ active, payload, label }) => (
                <Globo
                  active={active}
                  payload={payload}
                  label={label}
                  singular="auto"
                  plural="autos"
                />
              )}
            />
            <Bar
              dataKey="cantidad"
              fill={NEGRO_AZULADO}
              radius={[2, 2, 0, 0]}
              maxBarSize={56}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PanelReporte>
  );
}

interface ServiciosProps {
  servicios: { tipo: TipoServicio; cantidad: number }[];
}

export function GraficoServicios({ servicios }: ServiciosProps) {
  const datos = servicios.map((s) => ({ ...s, nombre: NOMBRE_AREA[s.tipo] }));
  return (
    <PanelReporte
      titulo="Servicios terminados"
      ayuda="Cuántos se terminaron de cada área en el período."
    >
      <div style={{ height: ALTO }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datos}
            margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke={LINEA} />
            <XAxis
              dataKey="nombre"
              tick={LETRA_EJE}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={LETRA_EJE}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(28,30,38,0.05)" }}
              content={({ active, payload, label }) => (
                <Globo
                  active={active}
                  payload={payload}
                  label={label}
                  singular="servicio"
                  plural="servicios"
                />
              )}
            />
            <Bar
              dataKey="cantidad"
              radius={[2, 2, 0, 0]}
              maxBarSize={88}
              isAnimationActive={false}
              // Cada barra con el color de su área.
              shape={(props: BarShapeProps) => (
                <Rectangle
                  {...props}
                  fill={
                    COLOR_AREA[(props.payload as { tipo: TipoServicio }).tipo]
                  }
                />
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PanelReporte>
  );
}
