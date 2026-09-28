// Los 3 botones de estado de un servicio (esperando / en proceso / terminado).
// Compartido por /admin y /taller para no duplicar la lógica. El botón del estado
// actual va resaltado; tocar otro dispara onCambiar con el nuevo estado.
//
// Se dibuja como un selector segmentado: una pista apenas tintada con los tres
// segmentos adentro. El activo se enciende con el color de su estado (y una
// sombra de ese color); los otros quedan transparentes, en tinta suave.
import { NOMBRE_ESTADO } from "../dominio";
import type { EstadoServicio } from "../types";

const ESTADOS: EstadoServicio[] = ["esperando", "en_proceso", "terminado"];

// Cómo se ve el segmento activo según el estado.
const ACTIVO: Record<EstadoServicio, string> = {
  esperando: "bg-white text-tinta shadow-[0_3px_10px_-2px_rgba(43,35,27,0.22)]",
  en_proceso:
    "bg-marca text-tinta shadow-[0_8px_20px_-8px_rgba(190,138,24,0.9)]",
  terminado:
    "bg-listo text-crema-alta shadow-[0_8px_20px_-8px_rgba(46,94,58,0.9)]",
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
  const pista = grande
    ? "gap-1 rounded-[20px] p-[5px]"
    : "gap-[3px] rounded-2xl p-1";
  // Letra que entra en el celular: en una tarjeta angosta cada segmento mide
  // ~100 px, así que el texto no pasa de 16–18 px. min-w-0 deja que el
  // segmento se achique con la grilla y, si igual no entra, "En proceso" baja
  // a dos líneas (leading-tight) en vez de salirse del botón. Con tres
  // columnas (xl) las tarjetas vuelven a ser angostas: letra un punto menor
  // hasta las pantallas bien anchas (2xl).
  const segmento = grande
    ? "min-h-14 rounded-[15px] text-base sm:min-h-[62px] sm:text-lg xl:text-base 2xl:text-lg"
    : "min-h-12 rounded-xl text-[15px] sm:text-base";

  return (
    <div className={`grid grid-cols-3 bg-tinta/[0.06] ${pista}`}>
      {ESTADOS.map((e) => {
        const activo = e === estado;
        return (
          <button
            key={e}
            type="button"
            aria-pressed={activo}
            onClick={() => !activo && onCambiar(e)}
            disabled={disabled}
            className={`min-w-0 px-1 leading-tight font-semibold tracking-[-0.01em] break-words transition-[background-color,color,box-shadow,scale] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:scale-[0.96] disabled:opacity-60 ${segmento} ${
              activo
                ? ACTIVO[e]
                : "bg-transparent text-tinta-suave hover:text-tinta"
            }`}
          >
            {NOMBRE_ESTADO[e]}
          </button>
        );
      })}
    </div>
  );
}
