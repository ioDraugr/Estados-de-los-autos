// Cono de un servicio dentro de un círculo de vidrio, para el fondo oscuro del
// showroom (tarjeta y ficha del auto). El círculo cuenta el estado sin texto:
//   - esperando:  círculo apenas marcado.
//   - en_proceso: aro dorado (en la tarjeta, además, un pulso que se expande).
//   - terminado:  cono atenuado y una insignia verde con un tilde.
//
// Con tono="claro" (/taller, /admin y el alta de un auto) es un círculo blanco
// translúcido con sombra suave: sobre las tarjetas claras las franjas del cono
// se perdían contra el fondo. Ahí el círculo no cuenta el estado (lo dice el
// selector de al lado); solo el cono se atenúa cuando está terminado.
import type { EstadoServicio } from "../types";
import { Cono } from "./Cono";

interface Props {
  color: string;
  estado: EstadoServicio;
  // "ficha" es la versión grande del detalle; "tarjeta", la de la grilla.
  // En claro: "ficha" para /taller (más grande) y "tarjeta" para /admin y el
  // formulario.
  tamano: "tarjeta" | "ficha";
  tono?: "oscuro" | "claro";
}

export function ConoCirculo({ color, estado, tamano, tono = "oscuro" }: Props) {
  const ficha = tamano === "ficha";
  const enProceso = estado === "en_proceso";

  if (tono === "claro") {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-white/70 shadow-[0_4px_12px_-6px_rgba(43,35,27,0.35)] ${
          ficha ? "h-12 w-12" : "h-10 w-10 sm:h-11 sm:w-11"
        }`}
      >
        <Cono
          color={color}
          estado={estado}
          className={ficha ? "h-7 w-auto" : "h-[22px] w-auto sm:h-6"}
        />
      </span>
    );
  }

  const medida = ficha
    ? "h-14 w-14 sm:h-[60px] sm:w-[60px]"
    : "h-11 w-11 sm:h-12 sm:w-12 2xl:h-14 2xl:w-14";
  const aro = enProceso
    ? `border-[1.5px] border-marca ${ficha ? "bg-marca/10" : "bg-crema/[0.07] animate-anillo"}`
    : `border border-crema/10 ${ficha ? "bg-crema/[0.08]" : "bg-crema/[0.07]"}`;

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full ${medida} ${aro}`}
    >
      <Cono
        color={color}
        estado={estado}
        className={
          ficha ? "h-8 w-auto sm:h-[34px]" : "h-6 w-auto sm:h-7 2xl:h-8"
        }
      />
      {estado === "terminado" && (
        <span
          className={`absolute flex items-center justify-center rounded-full border-2 border-[#211b15] bg-listo-vivo ${
            ficha
              ? "-right-0.5 -bottom-0.5 h-[22px] w-[22px]"
              : "-right-[3px] -bottom-[3px] h-[18px] w-[18px] 2xl:h-5 2xl:w-5"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={ficha ? "h-[13px] w-[13px]" : "h-[11px] w-[11px]"}
          >
            <path
              d="M5 12.5 L10 17 L19 7"
              fill="none"
              stroke="#FAF6EE"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </span>
  );
}
