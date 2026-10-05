// Primera pantalla de /taller (siempre, no se guarda): elegir el modo.
import type { ReactNode } from "react";

export type Modo = "general" | "sector";

interface Props {
  onElegir: (m: Modo) => void;
}

const ICONO = "h-12 w-12 shrink-0 text-con-texto";

const MODOS: {
  modo: Modo;
  etiqueta: string;
  titulo: string;
  ayuda: string;
  icono: ReactNode;
}[] = [
  {
    modo: "general",
    etiqueta: "Vista por auto",
    titulo: "General",
    ayuda: "Todos los sectores de cada auto en una sola tarjeta",
    icono: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={ICONO}
      >
        <path d="M6 30l4-10a4 4 0 0 1 3.7-2.5h20.6A4 4 0 0 1 38 20l4 10v7a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-2H13v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7Z" />
        <path d="M6 30h36M14 25h0M34 25h0" />
      </svg>
    ),
  },
  {
    modo: "sector",
    etiqueta: "Vista por sector",
    titulo: "Por sector",
    ayuda: "Elegí tu sector y mirá solo sus autos",
    icono: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={ICONO}
      >
        <rect x="6" y="6" width="15" height="15" rx="2" />
        <rect x="27" y="6" width="15" height="15" rx="2" />
        <rect x="6" y="27" width="15" height="15" rx="2" />
        <path d="M27 34.5h15M34.5 27v15" />
      </svg>
    ),
  },
];

export function TallerEleccionModo({ onElegir }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-2xl font-light tracking-[-0.02em] text-con-texto sm:text-3xl">
        ¿Cómo querés ver el taller?
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {MODOS.map(({ modo, etiqueta, titulo, ayuda, icono }) => (
          <button
            key={modo}
            type="button"
            onClick={() => onElegir(modo)}
            className="con-foco flex min-h-52 flex-col items-start justify-between gap-6 rounded-sm border border-con-borde-fuerte bg-con-sup p-6 text-left transition-[transform,background-color] duration-150 hover:bg-con-sup2 active:scale-[0.98]"
          >
            {icono}
            <span className="flex flex-col gap-1.5">
              <span className="font-mono text-xs font-medium tracking-[0.12em] text-con-suave uppercase">
                {etiqueta}
              </span>
              <span className="text-4xl leading-none font-light tracking-[-0.03em] text-con-texto">
                {titulo}
              </span>
              <span className="text-lg text-con-suave">{ayuda}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
