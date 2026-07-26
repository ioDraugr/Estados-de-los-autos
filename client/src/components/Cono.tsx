// Ícono de cono de tránsito coloreado, uno por área de trabajo.
// El estado "terminado" se atenúa un poco para que se note de un vistazo.
// El tamaño va por className (ej. "h-10 w-10 sm:h-14 sm:w-14") para que pueda
// achicarse en el celular y agrandarse en la pantalla del showroom.
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
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      style={{ opacity: atenuado ? 0.4 : 1 }}
    >
      {/* Base del cono */}
      <ellipse cx="32" cy="56" rx="24" ry="5" fill="#111827" opacity="0.35" />
      <rect x="8" y="50" width="48" height="7" rx="3" fill={color} />
      {/* Cuerpo del cono */}
      <path d="M32 6 L48 50 L16 50 Z" fill={color} />
      {/* Franjas reflectantes */}
      <path d="M27 26 L37 26 L39 34 L25 34 Z" fill="#ffffff" opacity="0.9" />
      <path d="M24 38 L40 38 L42 46 L22 46 Z" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}
