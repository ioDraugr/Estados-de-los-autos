// Los 3 botones de estado de un servicio (esperando / en proceso / terminado).
// Compartido por /admin y /taller para no duplicar la lógica. El botón del estado
// actual va resaltado; tocar otro dispara onCambiar con el nuevo estado.
//
// Selector segmentado sobrio: tres segmentos pegados dentro de un borde fino.
// El activo se rellena con color sólido y lleva un borde más fuerte y un tilde
// (así el estado se entiende por texto y forma, no solo por color); los otros
// quedan en papel, con el texto en tinta. Sin sombras, sin brillo ni escalado.
import { NOMBRE_ESTADO } from "../dominio";
import type { EstadoServicio } from "../types";

const ESTADOS: EstadoServicio[] = ["esperando", "en_proceso", "terminado"];

// Cómo se ve el segmento activo según el estado (texto de alto contraste:
// carbón sobre arena y oro, papel sobre el verde bosque).
const ACTIVO: Record<EstadoServicio, string> = {
  esperando: "border-tinta bg-arena text-tinta",
  en_proceso: "border-tinta bg-marca text-tinta",
  terminado: "border-listo bg-listo text-crema-alta",
};

interface Props {
  estado: EstadoServicio;
  onCambiar: (estado: EstadoServicio) => void;
  disabled: boolean;
  // "grande" = botones más altos para la tablet del taller.
  tamano?: "normal" | "grande";
}

export function BotonesEstado({
  estado,
  onCambiar,
  disabled,
  tamano = "normal",
}: Props) {
  const grande = tamano === "grande";
  // Letra que entra en el celular: en una tarjeta angosta cada segmento mide
  // ~100 px. min-w-0 deja que el segmento se achique con la grilla y, si
  // igual no entra, "En proceso" baja a dos líneas (leading-tight).
  const segmento = grande
    ? "min-h-14 text-base sm:text-lg xl:text-base 2xl:text-lg"
    : "min-h-12 text-[15px] sm:text-base";

  return (
    <div
      role="group"
      aria-label="Estado del servicio"
      className="grid grid-cols-3 gap-1.5"
    >
      {ESTADOS.map((e) => {
        const activo = e === estado;
        return (
          <button
            key={e}
            type="button"
            aria-pressed={activo}
            onClick={() => !activo && onCambiar(e)}
            disabled={disabled}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg border-2 px-1 leading-tight font-semibold break-words transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:opacity-60 ${segmento} ${
              activo
                ? ACTIVO[e]
                : "border-linea bg-crema-alta text-tinta hover:bg-arena/60"
            }`}
          >
            {activo && (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4 shrink-0"
              >
                <path
                  d="M5 12.5 L10 17 L19 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {NOMBRE_ESTADO[e]}
          </button>
        );
      })}
    </div>
  );
}
