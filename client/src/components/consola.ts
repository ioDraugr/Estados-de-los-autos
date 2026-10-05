// Lógica pura de la consola de /admin: estado "del auto" para el resumen y los
// filtros, búsqueda sin tildes y el siguiente estado de un servicio.
import { autoTerminado } from "../dominio";
import type { EstadoServicio, TipoServicio, Vehiculo } from "../types";

export type FiltroEstado = "todos" | "en_proceso" | "esperando" | "listo";

// Cada auto cae en un solo grupo (así los contadores suman el total):
// listo = todos sus servicios terminados; en proceso = alguno en proceso;
// esperando = el resto (nada empezado, o lo que falta todavía no arrancó).
export function grupoDeAuto(v: Vehiculo): Exclude<FiltroEstado, "todos"> {
  if (autoTerminado(v)) return "listo";
  if (v.servicios.some((s) => s.estado === "en_proceso")) return "en_proceso";
  return "esperando";
}

export function contarGrupos(vehiculos: Vehiculo[]) {
  const c = { todos: vehiculos.length, en_proceso: 0, esperando: 0, listo: 0 };
  for (const v of vehiculos) c[grupoDeAuto(v)]++;
  return c;
}

// Minúsculas, sin tildes.
function sinTildes(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// La matrícula se compara sin espacios ni guiones ("ABC 1234" = "abc-1234").
function sinSeparadores(t: string): string {
  return sinTildes(t).replace(/[\s-]/g, "");
}

export function coincideBusqueda(v: Vehiculo, busqueda: string): boolean {
  const q = sinTildes(busqueda).trim();
  if (!q) return true;
  const texto = sinTildes(`${v.marca} ${v.modelo} ${v.color}`);
  if (q.split(/\s+/).every((palabra) => texto.includes(palabra))) return true;
  const qMat = sinSeparadores(busqueda);
  return qMat.length > 0 && sinSeparadores(v.matricula).includes(qMat);
}

export function filtrarVehiculos(
  vehiculos: Vehiculo[],
  busqueda: string,
  estado: FiltroEstado,
  area: TipoServicio | null,
): Vehiculo[] {
  return vehiculos.filter(
    (v) =>
      (estado === "todos" || grupoDeAuto(v) === estado) &&
      (area === null || v.servicios.some((s) => s.tipo === area)) &&
      coincideBusqueda(v, busqueda),
  );
}

// esperando -> en proceso -> terminado (terminado no avanza).
export function siguienteEstado(e: EstadoServicio): EstadoServicio | null {
  if (e === "esperando") return "en_proceso";
  if (e === "en_proceso") return "terminado";
  return null;
}

// Texto corto del estado para las filas.
export const ESTADO_CORTO: Record<EstadoServicio, string> = {
  esperando: "Esperando",
  en_proceso: "En proceso",
  terminado: "Listo",
};
