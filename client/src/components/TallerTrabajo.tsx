// Tarjeta de un trabajo en /taller: un servicio de un auto. Una acción
// principal grande (Iniciar / Terminar) y, aparte y más discreta, volver atrás.
// La matrícula va entera: sirve para identificar el auto que se tiene delante.
import type { CSSProperties } from "react";
import { NOMBRE_AREA, NOMBRE_ESTADO, autoTerminado } from "../dominio";
import type { EstadoServicio } from "../types";
import { ConsolaPunto } from "./ConsolaPunto";
import { estadoAnterior, type Trabajo } from "./tallerTablero";

interface Props {
  trabajo: Trabajo;
  ocupado: boolean;
  onCambiar: (trabajo: Trabajo, estado: EstadoServicio) => void;
  // Entrada escalonada de la primera carga y destello (clave > 0) al cambiar.
  entrada?: { className: string; style?: CSSProperties };
  destello?: number;
}

export function TallerTrabajo({
  trabajo,
  ocupado,
  onCambiar,
  entrada,
  destello = 0,
}: Props) {
  const { vehiculo: v, servicio: s } = trabajo;
  const area = NOMBRE_AREA[s.tipo];
  const auto = `${v.marca} ${v.modelo}`;
  const listo = s.estado === "terminado" && autoTerminado(v);
  const otros = v.servicios.filter((o) => o.id !== s.id);
  const atras = estadoAnterior(s.estado);

  return (
    <li
      style={entrada?.style}
      className={`relative flex flex-col gap-4 rounded-sm border border-con-borde bg-con-sup p-4 ${entrada?.className ?? ""}`}
    >
      {destello > 0 && <span key={destello} className="con-anim-destello" />}
      <div className="flex items-center gap-2.5">
        <ConsolaPunto tipo={s.tipo} estado={s.estado} tamano={20} />
        <span className="min-w-0 flex-1 text-xl font-medium text-con-texto">
          {area}
        </span>
        {listo && (
          <span className="shrink-0 rounded-sm bg-con-listo px-2 py-0.5 font-mono text-xs font-medium tracking-wide text-white uppercase">
            ✓ Listo
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-2xl leading-tight font-medium tracking-[-0.02em] break-words text-con-texto">
          {auto}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="rounded-sm border border-con-borde-fuerte px-2.5 py-0.5 text-lg font-medium tracking-wider text-con-texto tabular-nums">
            {v.matricula}
          </span>
          <span className="text-base text-con-suave">{v.color}</span>
        </div>
      </div>

      {otros.length > 0 && (
        <ul
          aria-label="Otros servicios del auto"
          className="flex flex-wrap gap-x-4 gap-y-1 border-t border-con-borde pt-3"
        >
          {otros.map((o) => (
            <li
              key={o.id}
              className="inline-flex items-center gap-1.5 text-sm text-con-suave"
            >
              <ConsolaPunto tipo={o.tipo} estado={o.estado} />
              {NOMBRE_AREA[o.tipo]}: {NOMBRE_ESTADO[o.estado]}
            </li>
          ))}
        </ul>
      )}

      {s.estado === "esperando" && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onCambiar(trabajo, "en_proceso")}
          aria-label={`Iniciar ${area} de ${auto}`}
          className="con-foco min-h-16 w-full rounded-sm bg-con-acento text-xl font-medium text-white transition-colors hover:bg-[#3a3d47] disabled:opacity-50"
        >
          Iniciar
        </button>
      )}
      {s.estado === "en_proceso" && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onCambiar(trabajo, "terminado")}
          aria-label={`Terminar ${area} de ${auto}`}
          className="con-foco min-h-16 w-full rounded-sm bg-con-listo text-xl font-medium text-white transition-colors hover:bg-[#24573b] disabled:opacity-50"
        >
          Terminar
        </button>
      )}
      {s.estado === "terminado" && (
        <p className="text-base font-medium text-con-listo">
          ✓ {NOMBRE_ESTADO.terminado}
        </p>
      )}

      {atras && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onCambiar(trabajo, atras)}
          aria-label={`Volver a ${NOMBRE_ESTADO[atras].toLowerCase()}: ${area} de ${auto}`}
          className="con-foco min-h-12 self-start rounded-sm border border-con-borde-fuerte px-4 text-[15px] font-medium text-con-suave transition-colors hover:bg-con-sup2 hover:text-con-texto disabled:opacity-50"
        >
          Volver a {NOMBRE_ESTADO[atras].toLowerCase()}
        </button>
      )}
    </li>
  );
}
