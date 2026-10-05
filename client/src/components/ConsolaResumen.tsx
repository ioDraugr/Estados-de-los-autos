// Franja de contadores de la consola de /admin. Cada uno es un botón que aplica
// el filtro de estado correspondiente (el activo lleva aria-pressed).
import type { FiltroEstado } from "./consola";

interface Props {
  conteo: Record<FiltroEstado, number>;
  filtro: FiltroEstado;
  onFiltro: (f: FiltroEstado) => void;
}

const ITEMS: { clave: FiltroEstado; etiqueta: string; acento: string }[] = [
  { clave: "todos", etiqueta: "En el taller", acento: "text-con-texto" },
  {
    clave: "en_proceso",
    etiqueta: "En proceso",
    acento: "text-con-acento-claro",
  },
  { clave: "esperando", etiqueta: "Esperando", acento: "text-con-texto" },
  {
    clave: "listo",
    etiqueta: "Listos para entregar",
    acento: "text-con-listo-claro",
  },
];

export function ConsolaResumen({ conteo, filtro, onFiltro }: Props) {
  return (
    <section
      aria-label="Resumen del taller"
      className="grid shrink-0 grid-cols-2 gap-2 border-b border-con-borde px-3 py-3 sm:px-6 lg:grid-cols-4"
    >
      {ITEMS.map(({ clave, etiqueta, acento }) => {
        const activo = filtro === clave;
        return (
          <button
            key={clave}
            type="button"
            aria-pressed={activo}
            onClick={() => onFiltro(clave)}
            className={`con-foco flex min-h-16 flex-col items-start justify-center rounded-sm border px-4 py-2 text-left transition-colors ${
              activo
                ? "border-con-acento-claro bg-[#f0f0f2]"
                : "border-con-borde bg-con-sup hover:bg-con-sup2"
            }`}
          >
            <span className="text-[11px] font-medium font-mono tracking-[0.12em] text-con-suave uppercase">
              {etiqueta}
            </span>
            <span
              className={`text-4xl leading-none font-light tabular-nums ${acento}`}
            >
              {conteo[clave]}
            </span>
          </button>
        );
      })}
    </section>
  );
}
