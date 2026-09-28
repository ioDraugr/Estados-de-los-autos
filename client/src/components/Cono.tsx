// Ícono de cono de tránsito coloreado, uno por área de trabajo.
// El estado "terminado" se atenúa un poco para que se note de un vistazo.
// El tamaño va por className (ej. "h-10 w-10 sm:h-14 sm:w-14") para que pueda
// achicarse en el celular y agrandarse en la pantalla del showroom.
//
// El dibujo es más alto que ancho (40×48): con un className cuadrado queda
// centrado sin deformarse (el SVG lo encaja solo); con "h-6 w-auto" toma su
// ancho justo.
import type { EstadoServicio } from "../types";

interface Props {
  color: string;
  estado: EstadoServicio;
  className?: string;
}

export function Cono({ color, estado, className = "h-14 w-14" }: Props) {
  const atenuado = estado === "terminado";
  return (
    <svg
      viewBox="0 0 40 48"
      className={className}
      aria-hidden="true"
      style={{ opacity: atenuado ? 0.45 : 1 }}
    >
      {/* Cuerpo del cono, con la punta apenas redondeada. */}
      <path d="M18.9 6.7 Q20 3 21.1 6.7 L31 40 L9 40 Z" fill={color} />
      {/* Franjas reflectantes, en papel (no blanco puro) para ir con la paleta. */}
      <path d="M15.54 18 L24.46 18 L26.54 25 L13.46 25 Z" fill="#FAF6EE" />
      <path d="M11.97 30 L28.03 30 L29.81 36 L10.19 36 Z" fill="#FAF6EE" />
      {/* Base */}
      <rect x="4" y="40" width="32" height="5" rx="2.5" fill={color} />
    </svg>
  );
}
