// Lógica pura del tablero de /taller: un TRABAJO es un servicio de un auto. Se
// arman a partir de los vehículos, se filtran por área y se agrupan por estado.
import { AREAS } from "../dominio";
import type {
  EstadoServicio,
  Servicio,
  TipoServicio,
  Vehiculo,
} from "../types";

export interface Trabajo {
  vehiculo: Vehiculo;
  servicio: Servicio;
}

// Último servicio tocado en esta pantalla: la tarjeta destella un instante.
export interface Toque {
  servicioId: number;
  clave: number;
}

export const ESTADOS_TABLERO: EstadoServicio[] = [
  "esperando",
  "en_proceso",
  "terminado",
];

export type Tablero = Record<EstadoServicio, Trabajo[]>;

// Los autos más viejos (ingreso, y a igual fecha el id) van arriba.
function porAntiguedad(a: Trabajo, b: Trabajo): number {
  if (a.vehiculo.fecha_ingreso !== b.vehiculo.fecha_ingreso) {
    return a.vehiculo.fecha_ingreso < b.vehiculo.fecha_ingreso ? -1 : 1;
  }
  return a.vehiculo.id - b.vehiculo.id || a.servicio.id - b.servicio.id;
}

export function armarTablero(
  vehiculos: Vehiculo[],
  area: TipoServicio | null,
): Tablero {
  const tablero: Tablero = { esperando: [], en_proceso: [], terminado: [] };
  for (const vehiculo of vehiculos) {
    for (const servicio of vehiculo.servicios) {
      if (area === null || servicio.tipo === area) {
        tablero[servicio.estado].push({ vehiculo, servicio });
      }
    }
  }
  for (const e of ESTADOS_TABLERO) tablero[e].sort(porAntiguedad);
  return tablero;
}

// Pestaña inicial en pantallas angostas: "En proceso" y, si está vacía y otra
// tiene trabajos, la primera que no esté vacía.
export function pestanaInicial(tablero: Tablero): EstadoServicio {
  if (tablero.en_proceso.length > 0) return "en_proceso";
  return ESTADOS_TABLERO.find((e) => tablero[e].length > 0) ?? "en_proceso";
}

// Estado al que se puede volver desde cada uno (esperando es el primero).
export function estadoAnterior(e: EstadoServicio): EstadoServicio | null {
  if (e === "terminado") return "en_proceso";
  if (e === "en_proceso") return "esperando";
  return null;
}

// Último sector usado en esta tablet: solo resalta esa opción en la pantalla
// de elección de sector (no se salta la pantalla).
// localStorage puede fallar (modo privado, cuota): nunca debe romper la vista.
const CLAVE_AREA = "taller_area";

export function leerArea(): TipoServicio | null {
  try {
    const v = localStorage.getItem(CLAVE_AREA);
    return AREAS.find((a) => a === v) ?? null;
  } catch {
    return null;
  }
}

export function guardarArea(area: TipoServicio): void {
  try {
    localStorage.setItem(CLAVE_AREA, area);
  } catch {
    // Sin almacenamiento: la elección vale solo mientras la pantalla esté abierta.
  }
}

// Autos del más viejo al más nuevo (ingreso y, a igual fecha, id).
export function ordenarVehiculos(vehiculos: Vehiculo[]): Vehiculo[] {
  return [...vehiculos].sort(
    (a, b) =>
      (a.fecha_ingreso < b.fecha_ingreso
        ? -1
        : a.fecha_ingreso > b.fecha_ingreso
          ? 1
          : 0) || a.id - b.id,
  );
}

// Pendiente = tiene algún servicio sin terminar.
export function esPendiente(v: Vehiculo): boolean {
  return v.servicios.some((s) => s.estado !== "terminado");
}

// Contadores de un sector para la pantalla de elección.
export function contarSector(vehiculos: Vehiculo[], area: TipoServicio) {
  const c = { esperando: 0, en_proceso: 0 };
  for (const v of vehiculos)
    for (const s of v.servicios)
      if (s.tipo === area && s.estado !== "terminado") c[s.estado]++;
  return c;
}
