// Consultas de vehículos para la API.
import { db } from "./db.js";
import type { Servicio, Vehiculo } from "./tipos.js";

// Un auto con TODOS sus servicios terminados se sigue mostrando en el showroom
// durante estas horas (para que el cliente lo vea) y después desaparece solo.
export const HORAS_VISIBLE_TERMINADO =
  Number(process.env.HORAS_VISIBLE_TERMINADO) || 4;

type FilaVehiculo = Omit<Vehiculo, "servicios">;
type FilaServicio = Servicio & { actualizado_en: string };

/**
 * Vehículos que tiene que mostrar /display: los que están en el taller, más
 * los terminados hace poco. El que hace más tiempo que entró va primero.
 */
export function listarVehiculosVisibles(): Vehiculo[] {
  const vehiculos = db
    .prepare(
      `SELECT id, marca, modelo, color, matricula, fecha_ingreso
       FROM vehiculos
       ORDER BY fecha_ingreso ASC, id ASC`,
    )
    .all() as FilaVehiculo[];

  const servicios = db
    .prepare(
      `SELECT id, vehiculo_id, tipo, estado, actualizado_en
       FROM servicios
       ORDER BY id ASC`,
    )
    .all() as FilaServicio[];

  // Agrupamos en JS (dos SELECT simples se leen mejor que un json_group_array).
  const porVehiculo = new Map<number, FilaServicio[]>();
  for (const servicio of servicios) {
    const lista = porVehiculo.get(servicio.vehiculo_id) ?? [];
    lista.push(servicio);
    porVehiculo.set(servicio.vehiculo_id, lista);
  }

  const limite = Date.now() - HORAS_VISIBLE_TERMINADO * 60 * 60 * 1000;

  return vehiculos
    .filter((v) => !estaVencido(porVehiculo.get(v.id) ?? [], limite))
    .map((v) => ({
      ...v,
      // Fuera del filtro, actualizado_en no le sirve al front: no lo mandamos.
      servicios: (porVehiculo.get(v.id) ?? []).map(
        ({ actualizado_en: _omitido, ...servicio }) => servicio,
      ),
    }));
}

// Vencido = todos sus servicios terminados y el último se terminó hace rato.
function estaVencido(servicios: FilaServicio[], limite: number): boolean {
  if (servicios.length === 0) return false;
  if (!servicios.every((s) => s.estado === "terminado")) return false;

  const ultimoCambio = Math.max(
    ...servicios.map((s) => fechaSqliteAMs(s.actualizado_en)),
  );
  return ultimoCambio < limite;
}

// SQLite guarda "YYYY-MM-DD HH:MM:SS" en UTC; Date lo parsea si le marcamos la Z.
function fechaSqliteAMs(valor: string): number {
  const ms = Date.parse(valor.replace(" ", "T") + "Z");
  // Si el dato viniera raro, preferimos mostrar el auto antes que esconderlo.
  return Number.isNaN(ms) ? Date.now() : ms;
}
