// Indicador plano del área de un servicio para las vistas del personal
// (/taller, /admin, Configuración): un círculo sólido del color del área
// (rojo, azul o amarillo). Reemplaza al cono ilustrado; /display sigue con Cono.
// El estado "en proceso" se marca sin animación con un anillo estático
// alrededor; "terminado" se atenúa y lleva un tilde. El estado también viaja
// en el texto accesible, no solo en el color.
import { COLOR_AREA, NOMBRE_AREA, NOMBRE_ESTADO } from "../dominio";
import type { EstadoServicio, TipoServicio } from "../types";

interface Props {
  tipo: TipoServicio;
  // Si se pasa, se suma al texto accesible ("Instalación, en proceso").
  estado?: EstadoServicio;
  // "ficha" es la versión grande del detalle; "tarjeta", la de las listas.
  tamano?: "tarjeta" | "ficha";
  className?: string;
}

export function IndicadorArea({
  tipo,
  estado,
  tamano = "tarjeta",
  className = "",
}: Props) {
  const ficha = tamano === "ficha";
  const enProceso = estado === "en_proceso";
  const terminado = estado === "terminado";
  const etiqueta = estado
    ? `${NOMBRE_AREA[tipo]}, ${NOMBRE_ESTADO[estado].toLowerCase()}`
    : NOMBRE_AREA[tipo];

  return (
    <span
      role="img"
      aria-label={etiqueta}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${
        enProceso ? "border-tinta" : "border-transparent"
      } border-[3px] p-[3px] ${ficha ? "h-12 w-12" : "h-9 w-9"} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-full w-full items-center justify-center rounded-full ${
          terminado ? "opacity-60" : ""
        }`}
        style={{ backgroundColor: COLOR_AREA[tipo] }}
      >
        {terminado && (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={ficha ? "h-6 w-6" : "h-4 w-4"}
          >
            <path
              d="M5 12.5 L10 17 L19 7"
              fill="none"
              stroke="#16130F"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </span>
  );
}
