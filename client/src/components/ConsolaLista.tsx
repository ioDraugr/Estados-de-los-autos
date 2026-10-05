// Lista compacta de autos de /admin. Cada fila: botón para elegir el auto
// (marca modelo, matrícula en cápsula, color, servicios con su estado en texto)
// y, a la derecha, el cambio de estado rápido.
// Cambio rápido: si al auto le falta UN solo servicio por terminar, la fila
// ofrece un botón "Iniciar" / "Terminar" (alto >= 44px) para ese servicio. Con
// dos o más pendientes no se adivina cuál: se elige en el detalle (la fila
// entera abre el detalle; la flecha de la derecha lo indica).
import { NOMBRE_AREA, autoTerminado } from "../dominio";
import type { EstadoServicio, Servicio, Vehiculo } from "../types";
import { ESTADO_CORTO, siguienteEstado } from "./consola";
import { ConsolaPunto } from "./ConsolaPunto";

interface Props {
  vehiculos: Vehiculo[];
  seleccionadoId: number | null;
  ocupado: boolean;
  onSeleccionar: (id: number) => void;
  onAvanzar: (servicio: Servicio, estado: EstadoServicio) => void;
}

export function ConsolaLista({
  vehiculos,
  seleccionadoId,
  ocupado,
  onSeleccionar,
  onAvanzar,
}: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {vehiculos.map((v) => {
        const elegido = v.id === seleccionadoId;
        const listo = autoTerminado(v);
        const pendientes = v.servicios.filter((s) => s.estado !== "terminado");
        const unico = pendientes.length === 1 ? pendientes[0] : null;
        const proximo = unico ? siguienteEstado(unico.estado) : null;
        return (
          <li
            key={v.id}
            className={`flex items-stretch rounded-sm border transition-colors ${
              elegido
                ? "border-con-acento-claro bg-[#f0f0f2]"
                : "border-con-borde bg-con-sup hover:bg-con-sup2"
            }`}
          >
            <button
              type="button"
              onClick={() => onSeleccionar(v.id)}
              aria-current={elegido ? "true" : undefined}
              className="con-foco flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-l-md px-4 py-3 text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-lg leading-tight font-medium text-con-texto">
                    {v.marca} {v.modelo}
                  </span>
                  {listo && (
                    <span className="shrink-0 rounded-sm bg-con-listo px-2 py-0.5 text-xs font-medium font-mono tracking-wide text-white uppercase">
                      ✓ Listo
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="rounded-sm border border-con-borde-fuerte px-2 py-0.5 text-sm font-medium tracking-wider text-con-texto tabular-nums">
                    {v.matricula}
                  </span>
                  <span className="text-sm text-con-suave">{v.color}</span>
                </span>
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {v.servicios.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 text-[13px] text-con-suave"
                    >
                      <ConsolaPunto tipo={s.tipo} estado={s.estado} />
                      <span className="sr-only">{NOMBRE_AREA[s.tipo]}: </span>
                      <span
                        className={
                          s.estado === "en_proceso"
                            ? "text-con-acento-claro"
                            : ""
                        }
                      >
                        {ESTADO_CORTO[s.estado]}
                      </span>
                    </span>
                  ))}
                </span>
              </span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`h-5 w-5 shrink-0 ${elegido ? "text-con-acento-claro" : "text-con-suave"}`}
              >
                <path
                  d="M9 6l6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {unico && proximo ? (
              <div className="flex items-center border-l border-con-borde px-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => onAvanzar(unico, proximo)}
                  aria-label={`${NOMBRE_AREA[unico.tipo]} de ${v.marca} ${v.modelo}: pasar a ${ESTADO_CORTO[proximo].toLowerCase()}`}
                  className={`con-foco flex min-h-12 min-w-[104px] flex-col items-center justify-center rounded-sm px-3 text-[15px] leading-tight font-medium transition-colors disabled:opacity-50 ${
                    proximo === "terminado"
                      ? "bg-con-listo text-white hover:bg-[#24573b]"
                      : "bg-con-acento text-white hover:bg-[#3a3d47]"
                  }`}
                >
                  {proximo === "terminado" ? "Terminar" : "Iniciar"}
                  <span className="text-[11px] font-medium opacity-80">
                    {NOMBRE_AREA[unico.tipo]}
                  </span>
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
