// Comandos sobre los servicios de un auto (cambiar estado, agregar, quitar).
import { evaluarAvisos } from "./avisos.js";
import { db } from "./db.js";
import { ErrorValidacion } from "./errores.js";
import { registrarEvento } from "./historial.js";
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

// Lo que se lee de un servicio activo antes de cambiarlo o quitarlo.
interface FilaActiva {
  vehiculo_id: number;
  tipo: TipoServicio;
  estado: EstadoServicio;
}

/**
 * Cambia el estado de un servicio y marca cuándo se hizo el cambio
 * (actualizado_en), que /display usa para ocultar los terminados hace rato.
 * Después revisa los avisos por WhatsApp del auto ("ya arrancamos" / "listo").
 * Anota el cambio en el historial, salvo que el estado sea el mismo que ya
 * tenía (eso no es un cambio; igual se actualiza la fecha y los avisos).
 */
export function cambiarEstado(id: number, estado: EstadoServicio): boolean {
  if (!ESTADOS_SERVICIO.includes(estado)) {
    throw new ErrorValidacion("Estado inválido.");
  }
  // Todo o nada: el cambio de estado, su historial y los avisos que dispara van juntos.
  const cambiar = db.transaction((): boolean => {
    const servicio = db
      .prepare(
        "SELECT vehiculo_id, tipo, estado FROM servicios WHERE id = ? AND eliminado_en IS NULL",
      )
      .get(id) as FilaActiva | undefined;
    if (!servicio) return false; // no existe o ya estaba quitado

    db.prepare(
      `UPDATE servicios
       SET estado = ?, actualizado_en = datetime('now')
       WHERE id = ?`,
    ).run(estado, id);
    if (servicio.estado !== estado) {
      registrarEvento({
        vehiculoId: servicio.vehiculo_id,
        evento: "cambio_estado",
        servicioId: id,
        tipoServicio: servicio.tipo,
        estadoAnterior: servicio.estado,
        estadoNuevo: estado,
      });
    }
    evaluarAvisos(servicio.vehiculo_id);
    return true;
  });
  return cambiar();
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

  // Un servicio nuevo en "esperando" puede sacarle el "listo" a un auto que
  // estaba terminado: por eso se revisan los avisos.
  db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO servicios (vehiculo_id, tipo, estado) VALUES (?, ?, 'esperando')",
      )
      .run(vehiculoId, tipo);
    registrarEvento({
      vehiculoId,
      evento: "servicio_agregado",
      servicioId: Number(lastInsertRowid),
      tipoServicio: tipo,
      estadoNuevo: "esperando",
    });
    evaluarAvisos(vehiculoId);
  })();
}

/**
 * Quita un servicio (soft delete): se marca con fecha y desaparece de las vistas,
 * pero la fila queda como historial. Rechaza si es el último servicio activo del
 * auto: un auto no puede quedar sin servicios (si terminó, se retira el auto).
 */
export function quitarServicio(id: number): boolean {
  const servicio = db
    .prepare(
      "SELECT vehiculo_id, tipo, estado FROM servicios WHERE id = ? AND eliminado_en IS NULL",
    )
    .get(id) as FilaActiva | undefined;
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

  // Quitar el único servicio que faltaba (o el que estaba en proceso) cambia
  // qué avisos corresponden: por eso se revisan.
  db.transaction(() => {
    db.prepare(
      "UPDATE servicios SET eliminado_en = datetime('now') WHERE id = ?",
    ).run(id);
    // Se anota en qué estado estaba cuando lo quitaron (estado_nuevo queda NULL).
    registrarEvento({
      vehiculoId: servicio.vehiculo_id,
      evento: "servicio_quitado",
      servicioId: id,
      tipoServicio: servicio.tipo,
      estadoAnterior: servicio.estado,
    });
    evaluarAvisos(servicio.vehiculo_id);
  })();
  return true;
}
