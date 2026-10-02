// Historial de cambios (tabla `historial`), para los reportes que vienen más
// adelante: tiempos por servicio, trabajos por período, etc. Por ahora solo se
// anota; no hay API ni pantalla que lo muestre.
import { db } from "./db.js";
import type { EstadoServicio, TipoServicio } from "./tipos.js";

export type EventoHistorial =
  | "ingreso"
  | "cambio_estado"
  | "retiro"
  | "servicio_agregado"
  | "servicio_quitado";

export interface DatosEvento {
  vehiculoId: number;
  evento: EventoHistorial;
  // En ingreso/retiro no hay servicio: se omiten (quedan NULL).
  servicioId?: number;
  tipoServicio?: TipoServicio;
  estadoAnterior?: EstadoServicio;
  estadoNuevo?: EstadoServicio;
}

/**
 * Anota un evento en el historial. NO abre su propia transacción: se llama
 * desde adentro de la transacción del cambio, así si el cambio falla tampoco
 * queda la fila. La fecha la pone la base (datetime('now'), en UTC).
 */
export function registrarEvento(datos: DatosEvento): void {
  db.prepare(
    `INSERT INTO historial
       (vehiculo_id, servicio_id, tipo_servicio, evento, estado_anterior, estado_nuevo)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    datos.vehiculoId,
    datos.servicioId ?? null,
    datos.tipoServicio ?? null,
    datos.evento,
    datos.estadoAnterior ?? null,
    datos.estadoNuevo ?? null,
  );
}
