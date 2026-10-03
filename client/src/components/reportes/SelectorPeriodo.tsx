// Barra para elegir qué período se mira: Semana / Mes (control segmentado
// grande), flechas para ir al anterior o al siguiente con el nombre del
// período en el medio, y "Hoy" para volver al período actual.
import type { PeriodoReporte } from "../../types";
import { BOTON_SUAVE, TARJETA } from "../../tema";

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

// Flecha redonda: grande para el dedo.
const FLECHA = `${BOTON_SUAVE} flex h-14 w-14 shrink-0 items-center justify-center text-3xl leading-none`;

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
    <div
      className={`${TARJETA} flex flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:items-center lg:gap-6`}
    >
      {/* Control segmentado: el elegido es una cápsula blanca levantada. */}
      <div
        role="group"
        aria-label="Período"
        className="flex shrink-0 rounded-full bg-tinta/[0.07] p-1.5"
      >
        {OPCIONES.map(({ valor, texto }) => {
          const elegido = valor === periodo;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={elegido}
              onClick={() => onPeriodo(valor)}
              className={`h-12 flex-1 rounded-full px-8 text-lg font-semibold transition sm:h-13 sm:text-xl lg:flex-none ${
                elegido
                  ? "bg-white text-tinta shadow-[0_6px_16px_-8px_rgba(22,19,15,0.45)]"
                  : "text-tinta-suave hover:text-tinta active:scale-95"
              }`}
            >
              {texto}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onAnterior}
          disabled={!puedeAnterior}
          aria-label="Período anterior"
          className={FLECHA}
        >
          ‹
        </button>
        <p
          aria-live="polite"
          className="min-w-0 flex-1 text-center text-xl font-semibold tracking-[-0.02em] text-tinta sm:text-2xl"
        >
          {etiqueta ?? "…"}
        </p>
        <button
          type="button"
          onClick={onSiguiente}
          disabled={!puedeSiguiente}
          aria-label="Período siguiente"
          className={FLECHA}
        >
          ›
        </button>
        <button
          type="button"
          onClick={onHoy}
          disabled={!puedeHoy}
          className={`${BOTON_SUAVE} h-14 shrink-0 px-5 text-lg sm:px-6 sm:text-xl`}
        >
          Hoy
        </button>
      </div>
    </div>
  );
}
