// Conmutador de sector de /taller: tres chips grandes (>= 48px), activo = negro.
import { AREAS, NOMBRE_AREA } from "../dominio";
import type { TipoServicio } from "../types";
import { ConsolaPunto } from "./ConsolaPunto";

interface Props {
  area: TipoServicio;
  onArea: (a: TipoServicio) => void;
}

function chip(activo: boolean) {
  return `con-foco inline-flex min-h-12 items-center justify-center gap-2.5 rounded-sm border px-4 text-base font-medium transition-colors sm:px-5 sm:text-lg ${
    activo
      ? "border-con-acento bg-con-acento text-white"
      : "border-con-borde-fuerte bg-con-sup text-con-texto hover:bg-con-sup2"
  }`;
}

export function TallerFiltroArea({ area, onArea }: Props) {
  return (
    <div
      role="group"
      aria-label="Cambiar de sector"
      className="flex flex-wrap gap-2"
    >
      {AREAS.map((tipo) => (
        <button
          key={tipo}
          type="button"
          aria-pressed={area === tipo}
          onClick={() => onArea(tipo)}
          className={chip(area === tipo)}
        >
          <ConsolaPunto tipo={tipo} tamano={14} />
          {NOMBRE_AREA[tipo]}
        </button>
      ))}
    </div>
  );
}
