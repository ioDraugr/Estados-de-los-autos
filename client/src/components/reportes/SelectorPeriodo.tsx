// Barra para elegir qué período se mira: Semana / Mes (control segmentado de
// esquinas rectas), flechas para ir al anterior o al siguiente con el nombre
// del período en el medio, y "Hoy" para volver al período actual.
import type { PeriodoReporte } from "../../types";

interface Props {
  periodo: PeriodoReporte;
  onPeriodo: (periodo: PeriodoReporte) => void;
  // Nombre del período ("Semana del 28 sep al 4 oct"); null mientras carga.
  etiqueta: string | null;
  onAnterior: () => void;
  onSiguiente: () => void;
  onHoy: () => void;
  puedeAnterior: boolean;
  // No se puede pasar del período actual (el futuro siempre está vacío).
  puedeSiguiente: boolean;
  puedeHoy: boolean;
}

const OPCIONES: { valor: PeriodoReporte; texto: string }[] = [
  { valor: "semana", texto: "Semana" },
  { valor: "mes", texto: "Mes" },
];

const BOTON =
  "con-foco inline-flex h-12 shrink-0 items-center justify-center rounded-sm border border-con-borde-fuerte bg-con-sup text-base font-medium text-con-texto transition-colors hover:bg-con-sup2 disabled:opacity-40 disabled:hover:bg-con-sup";

export function SelectorPeriodo({
  periodo,
  onPeriodo,
  etiqueta,
  onAnterior,
  onSiguiente,
  onHoy,
  puedeAnterior,
  puedeSiguiente,
  puedeHoy,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-con-borde bg-con-sup p-3 lg:flex-row lg:items-center lg:gap-6">
      <div
        role="group"
        aria-label="Período"
        className="flex shrink-0 rounded-sm border border-con-borde-fuerte p-0.5"
      >
        {OPCIONES.map(({ valor, texto }) => {
          const elegido = valor === periodo;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={elegido}
              onClick={() => onPeriodo(valor)}
              className={`con-foco h-11 flex-1 rounded-sm px-8 text-base font-medium transition-colors lg:flex-none ${
                elegido
                  ? "bg-con-acento text-white"
                  : "text-con-suave hover:bg-con-sup2 hover:text-con-texto"
              }`}
            >
              {texto}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onAnterior}
          disabled={!puedeAnterior}
          aria-label="Período anterior"
          className={`${BOTON} w-12 text-2xl leading-none`}
        >
          ‹
        </button>
        <p
          aria-live="polite"
          className="min-w-0 flex-1 text-center font-mono text-sm tracking-[0.02em] text-con-texto sm:text-base"
        >
          {etiqueta ?? "…"}
        </p>
        <button
          type="button"
          onClick={onSiguiente}
          disabled={!puedeSiguiente}
          aria-label="Período siguiente"
          className={`${BOTON} w-12 text-2xl leading-none`}
        >
          ›
        </button>
        <button
          type="button"
          onClick={onHoy}
          disabled={!puedeHoy}
          className={`${BOTON} px-5`}
        >
          Hoy
        </button>
      </div>
    </div>
  );
}
