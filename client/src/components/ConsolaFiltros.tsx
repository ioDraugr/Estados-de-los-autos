// Búsqueda y filtros (estado y área) de la lista de /admin.
import { AREAS, NOMBRE_AREA } from "../dominio";
import type { TipoServicio } from "../types";
import type { FiltroEstado } from "./consola";
import { ConsolaPunto } from "./ConsolaPunto";

interface Props {
  busqueda: string;
  onBusqueda: (t: string) => void;
  estado: FiltroEstado;
  onEstado: (f: FiltroEstado) => void;
  area: TipoServicio | null;
  onArea: (a: TipoServicio | null) => void;
}

const ESTADOS: { clave: FiltroEstado; etiqueta: string }[] = [
  { clave: "todos", etiqueta: "Todos" },
  { clave: "en_proceso", etiqueta: "En proceso" },
  { clave: "esperando", etiqueta: "Esperando" },
  { clave: "listo", etiqueta: "Listos" },
];

function chip(activo: boolean) {
  return `con-foco inline-flex min-h-11 items-center gap-2 rounded-sm border px-3 text-[15px] font-medium transition-colors ${
    activo
      ? "border-con-acento bg-con-acento text-white"
      : "border-con-borde-fuerte bg-con-sup text-con-texto hover:bg-con-sup2"
  }`;
}

export function ConsolaFiltros({
  busqueda,
  onBusqueda,
  estado,
  onEstado,
  area,
  onArea,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          placeholder="Buscar marca, modelo, color o matrícula"
          aria-label="Buscar autos"
          autoComplete="off"
          className="con-foco h-12 w-full min-w-0 rounded-sm border border-con-borde-fuerte bg-con-sup pr-12 pl-4 text-lg text-con-texto placeholder:text-con-suave"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => onBusqueda("")}
            aria-label="Borrar búsqueda"
            className="con-foco absolute top-1 right-1 flex h-10 w-10 items-center justify-center rounded-sm text-xl text-con-suave hover:bg-con-sup2 hover:text-con-texto"
          >
            ×
          </button>
        )}
      </div>

      <div
        role="group"
        aria-label="Filtrar por estado"
        className="flex flex-wrap gap-2"
      >
        {ESTADOS.map(({ clave, etiqueta }) => (
          <button
            key={clave}
            type="button"
            aria-pressed={estado === clave}
            onClick={() => onEstado(clave)}
            className={chip(estado === clave)}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label="Filtrar por área"
        className="flex flex-wrap gap-2"
      >
        {AREAS.map((tipo) => (
          <button
            key={tipo}
            type="button"
            aria-pressed={area === tipo}
            onClick={() => onArea(area === tipo ? null : tipo)}
            className={chip(area === tipo)}
          >
            <ConsolaPunto tipo={tipo} />
            {NOMBRE_AREA[tipo]}
          </button>
        ))}
      </div>
    </div>
  );
}
