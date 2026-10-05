// Punto de color de un área (rojo / azul / amarillo) en la consola de /admin.
// Con `estado`: esperando = aro vacío, en proceso = lleno, terminado = lleno
// con tilde. El estado además siempre se escribe en texto al lado.
import { COLOR_AREA_OSCURO } from "../dominio";
import type { EstadoServicio, TipoServicio } from "../types";

interface Props {
  tipo: TipoServicio;
  estado?: EstadoServicio;
  tamano?: number;
}

export function ConsolaPunto({ tipo, estado, tamano = 12 }: Props) {
  const color = COLOR_AREA_OSCURO[tipo];
  const vacio = estado === "esperando";
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: tamano,
        height: tamano,
        backgroundColor: vacio ? "transparent" : color,
        border: `2px solid ${color}`,
      }}
    >
      {estado === "terminado" && tamano >= 16 && (
        <svg viewBox="0 0 12 12" className="h-2/3 w-2/3" fill="none">
          <path
            d="M2.5 6.5l2.5 2.5 4.5-5.5"
            stroke="#0b0d10"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}
