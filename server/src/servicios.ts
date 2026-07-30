// Comandos sobre los servicios de un auto (cambiar estado, agregar, quitar).
import { db } from "./db.js";
import { ErrorValidacion } from "./errores.js";
import type { EstadoServicio, TipoServicio } from "./tipos.js";

export const TIPOS_SERVICIO: TipoServicio[] = [
  "instalacion",
  "polarizado",
  "vitrificado",
];

export const ESTADOS_SERVICIO: EstadoServicio[] = [
  "esperando",
  "en_proceso",
  "terminado",
];

/**
 * Cambia el estado de un servicio y marca cuándo se hizo el cambio
 * (actualizado_en), que /display usa para ocultar los terminados hace rato.
 */
export function cambiarEstado(id: number, estado: EstadoServicio): boolean {
  if (!ESTADOS_SERVICIO.includes(estado)) {
    throw new ErrorValidacion("Estado inválido.");
  }
  const { changes } = db
    .prepare(
      `UPDATE servicios
       SET estado = ?, actualizado_en = datetime('now')
       WHERE id = ? AND eliminado_en IS NULL`,
    )
    .run(estado, id);
  return changes > 0;
}

/**
 * Agrega un servicio a un auto existente (arranca en "esperando"). No toca la
 * fecha de ingreso ni los demás servicios. Rechaza si el auto ya tiene ese
 * servicio activo (no se duplica; se miran solo los no eliminados).
 */
export function agregarServicio(vehiculoId: number, tipo: TipoServicio): void {
  if (!TIPOS_SERVICIO.includes(tipo)) {
    throw new ErrorValidacion("Tipo de servicio inválido.");
  }

  const auto = db
    .prepare("SELECT id FROM vehiculos WHERE id = ? AND retirado_en IS NULL")
    .get(vehiculoId);
  if (!auto) {
    throw new ErrorValidacion("El auto no existe.");
  }

  const yaTiene = db
    .prepare(
      `SELECT 1 FROM servicios
       WHERE vehiculo_id = ? AND tipo = ? AND eliminado_en IS NULL`,
    )
    .get(vehiculoId, tipo);
  if (yaTiene) {
    throw new ErrorValidacion("El auto ya tiene ese servicio.");
  }

  db.prepare(
    "INSERT INTO servicios (vehiculo_id, tipo, estado) VALUES (?, ?, 'esperando')",
  ).run(vehiculoId, tipo);
}

/**
 * Quita un servicio (soft delete): se marca con fecha y desaparece de las vistas,
 * pero la fila queda como historial. Rechaza si es el último servicio activo del
 * auto: un auto no puede quedar sin servicios (si terminó, se retira el auto).
 */
export function quitarServicio(id: number): boolean {
  const servicio = db
    .prepare(
      "SELECT vehiculo_id FROM servicios WHERE id = ? AND eliminado_en IS NULL",
    )
    .get(id) as { vehiculo_id: number } | undefined;
  if (!servicio) return false; // no existe o ya estaba quitado

  const { activos } = db
    .prepare(
      `SELECT COUNT(*) AS activos FROM servicios
       WHERE vehiculo_id = ? AND eliminado_en IS NULL`,
    )
    .get(servicio.vehiculo_id) as { activos: number };
  if (activos <= 1) {
    throw new ErrorValidacion(
      "Un auto no puede quedar sin servicios; si terminó, retiralo.",
    );
  }

  db.prepare(
    "UPDATE servicios SET eliminado_en = datetime('now') WHERE id = ?",
  ).run(id);
  return true;
}
