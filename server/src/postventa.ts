// Post-venta por WhatsApp: después de que el cliente retira el auto, un pedido
// de reseña (a los N días) y, si el auto tuvo vitrificado, un recordatorio de
// mantenimiento (a los N meses). Usan la misma cola `avisos` y el mismo
// despachador que los avisos del taller (avisos.ts), con tres diferencias:
// - solo salen dentro del horario configurado (y los domingos, si se permite);
//   fuera de hora esperan sin gastar intentos;
// - entre dos mensajes de post-venta pasan al menos los minutos de espaciado;
// - solo a clientes que aceptaron recibir mensajes (vehiculos.acepta_whatsapp).
// Todo se configura desde /admin → Configuración (ajustes.ts). Los días y meses
// se aplican al retirar; lo demás (activado, textos, link, horario, espaciado)
// se mira justo antes de mandar.
// Solo importa la base y los ajustes: avisos.ts y vehiculos.ts lo llaman a él.
import { leerAjuste } from "./ajustes.js";
import { db } from "./db.js";

export type TipoPostventa = "resena" | "mantenimiento";

export const TIPOS_POSTVENTA: readonly TipoPostventa[] = ["resena", "mantenimiento"];

export function esPostventa(tipo: string): tipo is TipoPostventa {
  return (TIPOS_POSTVENTA as readonly string[]).includes(tipo);
}

/**
 * Deja programados los mensajes de post-venta de un auto que se acaba de
 * retirar (se llama dentro de la transacción del retiro). La reseña siempre; el
 * mantenimiento, solo si el auto tiene un vitrificado (no quitado). Se encolan
 * aunque en ese momento estén desactivados o el cliente no haya aceptado: al
 * vencer, el despachador decide y deja anotado por qué no salió.
 */
export function programarPostventa(vehiculoId: number): void {
  const programar = db.prepare(
    `INSERT OR IGNORE INTO avisos (vehiculo_id, tipo, enviar_en)
     VALUES (?, ?, datetime('now', ?))`,
  );
  programar.run(vehiculoId, "resena", `+${leerAjuste("postventa_resena_dias")} days`);

  const tuvoVitrificado = db
    .prepare(
      `SELECT 1 FROM servicios
       WHERE vehiculo_id = ? AND tipo = 'vitrificado' AND eliminado_en IS NULL`,
    )
    .get(vehiculoId);
  if (tuvoVitrificado) {
    programar.run(
      vehiculoId,
      "mantenimiento",
      `+${leerAjuste("postventa_mantenimiento_meses")} months`,
    );
  }
}

/**
 * ¿Se puede mandar post-venta en este momento? Dentro de [desde, hasta) en la
 * hora local de la PC servidor y, si es domingo, solo si está permitido.
 */
export function horarioAbierto(ahora: Date): boolean {
  if (ahora.getDay() === 0 && !leerAjuste("postventa_domingos")) return false;
  const hora = ahora.getHours();
  return hora >= leerAjuste("postventa_hora_desde") && hora < leerAjuste("postventa_hora_hasta");
}

/**
 * ¿Ya pasó el espaciado desde el último mensaje de post-venta enviado? Se mira
 * en la misma tabla (enviado_en, en UTC como datetime('now')). Los avisos del
 * taller no cuentan.
 */
export function espaciadoCumplido(): boolean {
  const minutos = leerAjuste("postventa_espaciado_min");
  if (minutos === 0) return true;
  const reciente = db
    .prepare(
      `SELECT 1 FROM avisos
       WHERE tipo IN ('resena', 'mantenimiento') AND estado = 'enviado'
         AND enviado_en > datetime('now', ?)`,
    )
    .get(`-${minutos} minutes`);
  return !reciente;
}

/**
 * Por qué un mensaje de post-venta ya no tiene que salir (o null si hay que
 * mandarlo). El celular se revisa aparte (queda como sin_telefono, igual que
 * los avisos del taller).
 */
export function motivoPostventa(tipo: TipoPostventa, aceptaWhatsapp: number): string | null {
  if (tipo === "resena" && !leerAjuste("postventa_resena_activa")) {
    return "el pedido de reseña está desactivado";
  }
  if (tipo === "mantenimiento" && !leerAjuste("postventa_mantenimiento_activo")) {
    return "el recordatorio de mantenimiento está desactivado";
  }
  if (aceptaWhatsapp !== 1) return "el cliente no aceptó mensajes";
  if (tipo === "resena" && !leerAjuste("postventa_resena_link")) {
    return "no hay link de reseñas cargado";
  }
  return null;
}

/**
 * El texto a mandar, armado en el momento con el texto configurado: {marca},
 * {modelo} y {link} se cambian por los datos. Nunca lleva la matrícula
 * (privacidad): ni siquiera se le pasa.
 */
export function mensajePostventa(
  tipo: TipoPostventa,
  auto: { marca: string; modelo: string },
): string {
  const texto =
    tipo === "resena"
      ? leerAjuste("postventa_resena_texto")
      : leerAjuste("postventa_mantenimiento_texto");
  return texto
    .replaceAll("{marca}", auto.marca)
    .replaceAll("{modelo}", auto.modelo)
    .replaceAll("{link}", leerAjuste("postventa_resena_link"));
}
