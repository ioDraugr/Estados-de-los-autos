// Los 3 botones de estado de un servicio (esperando / en proceso / terminado).
// Compartido por /admin y /taller para no duplicar la lógica. El botón del estado
// actual va resaltado; tocar otro dispara onCambiar con el nuevo estado.
import { ESTILO_ESTADO, NOMBRE_ESTADO } from "../dominio";
import type { EstadoServicio } from "../types";

const ESTADOS: EstadoServicio[] = ["esperando", "en_proceso", "terminado"];

interface Props {
  estado: EstadoServicio;
  onCambiar: (estado: EstadoServicio) => void;
  disabled: boolean;
  // "grande" = botones más altos y separados para la tablet del taller.
  tamano?: "normal" | "grande";
}

export function BotonesEstado({
  estado,
  onCambiar,
  disabled,
  tamano = "normal",
}: Props) {
  const grande = tamano === "grande";
  const gapGrilla = grande ? "gap-3 sm:gap-4" : "gap-2 sm:gap-3";
  const tamBoton = grande
    ? "py-5 text-xl sm:text-2xl"
    : "py-3 text-base sm:text-lg";

  return (
    <div className={`grid grid-cols-3 ${gapGrilla}`}>
      {ESTADOS.map((e) => {
        const activo = e === estado;
        return (
          <button
            key={e}
            type="button"
            onClick={() => !activo && onCambiar(e)}
            disabled={disabled}
            className={`rounded-xl font-bold active:scale-95 disabled:opacity-60 ${tamBoton} ${
              activo
                ? ESTILO_ESTADO[e]
                : "border border-linea bg-crema-alta text-tinta-suave"
            }`}
          >
            {NOMBRE_ESTADO[e]}
          </button>
        );
      })}
    </div>
  );
}
