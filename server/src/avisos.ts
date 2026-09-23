// Avisos automáticos por WhatsApp: "tu auto entró", "ya arrancamos", "está listo".
// Cada aviso se guarda en la tabla `avisos` (pendiente, con fecha de envío) y un
// despachador los manda cuando vencen. La demora de seguridad existe para que un
// toque sin querer en /admin no le escriba al cliente: al momento de enviar se
// vuelve a revisar que la condición siga siendo cierta.
// Solo importa la base y los envíos: vehiculos.ts y servicios.ts lo llaman a él.
import { db } from "./db.js";
import { ErrorDefinitivo, type Enviador } from "./enviadores.js";

export type TipoAviso = "ingreso" | "en_proceso" | "listo";

// Minutos entre el cambio y el envío. Acepta decimales (0.1 = 6 s, para probar).
export const DEMORA_MIN = leerNumero("AVISOS_DEMORA_MIN", 5);
// Cada cuántos segundos el despachador busca avisos vencidos.
export const INTERVALO_SEG = leerNumero("AVISOS_INTERVALO_SEG", 30, 1);

// Tras este número de intentos fallidos, el aviso queda "fallido" y no se reintenta
// solo (evaluarAvisos lo reprograma si un cambio de servicios lo hace corresponder).
const MAX_INTENTOS = 5;

// Lo que se le manda al cliente. Sin matrícula (privacidad): marca y modelo alcanzan.
const MENSAJES: Record<TipoAviso, (auto: { marca: string; modelo: string }) => string> = {
  ingreso: ({ marca, modelo }) =>
    `¡Hola! Tu ${marca} ${modelo} ya ingresó al taller de ML Center. Te vamos a ir avisando por acá cómo va.`,
  en_proceso: ({ marca, modelo }) =>
    `¡Buenas! Ya arrancamos a trabajar en tu ${marca} ${modelo}. Te avisamos cuando esté listo.`,
  listo: ({ marca, modelo }) =>
    `¡Tu ${marca} ${modelo} está listo! Ya podés pasar a buscarlo por ML Center.`,
};

// "+N seconds" para datetime('now', ?): la demora ya pasada a segundos enteros.
const DESPLAZAMIENTO_DEMORA = `+${Math.round(DEMORA_MIN * 60)} seconds`;

/**
 * Deja programado el aviso de ingreso. Se llama solo al dar de alta el auto
 * (dentro de la misma transacción); nunca se vuelve a programar después.
 */
export function programarIngreso(vehiculoId: number): void {
  db.prepare(
    `INSERT OR IGNORE INTO avisos (vehiculo_id, tipo, enviar_en)
     VALUES (?, 'ingreso', datetime('now', ?))`,
  ).run(vehiculoId, DESPLAZAMIENTO_DEMORA);
}

/**
 * Revisa los avisos "ya arrancamos" y "está listo" de un auto después de que
 * cambiaron sus servicios (estado, agregar o quitar):
 * - condición cierta y el aviso no existe (o quedó cancelado, sin teléfono o
 *   fallido) => pendiente con la demora contada desde ahora y los intentos en
 *   cero;
 * - condición cierta y el aviso ya está pendiente o enviado => no se toca (no
 *   se atrasa ni se vuelve a mandar);
 * - condición falsa y el aviso está pendiente => cancelado (los demás quedan
 *   como están).
 * Un fallido se reprograma en cualquier cambio de servicios que deje la
 * condición cierta, aunque ya lo estuviera (por ejemplo, un segundo servicio que
 * pasa a "en proceso"). Está bien así: el cliente todavía no recibió ese aviso,
 * la ronda extra de intentos solo la dispara alguien tocando un servicio, y
 * distinguir "volvió a cumplirse" de "sigue cumpliéndose" pediría guardar la
 * condición anterior. El de ingreso no pasa por acá: nunca se reprograma.
 */
export function evaluarAvisos(vehiculoId: number): void {
  // Un auto retirado (o que no existe) ya no recibe avisos.
  if (!autoActivo(vehiculoId)) {
    cancelarAvisos(vehiculoId);
    return;
  }

  const condiciones = condicionesActuales(vehiculoId);
  for (const tipo of ["en_proceso", "listo"] as const) {
    if (condiciones[tipo]) {
      db.prepare(
        `INSERT INTO avisos (vehiculo_id, tipo, enviar_en)
         VALUES (@vehiculoId, @tipo, datetime('now', @demora))
         ON CONFLICT (vehiculo_id, tipo) DO UPDATE
           SET estado = 'pendiente', enviar_en = excluded.enviar_en,
               intentos = 0, ultimo_error = NULL
           WHERE avisos.estado IN ('cancelado', 'sin_telefono', 'fallido')`,
      ).run({ vehiculoId, tipo, demora: DESPLAZAMIENTO_DEMORA });
    } else {
      db.prepare(
        `UPDATE avisos SET estado = 'cancelado'
         WHERE vehiculo_id = ? AND tipo = ? AND estado = 'pendiente'`,
      ).run(vehiculoId, tipo);
    }
  }
}

// Cancela todo lo que el auto tenga pendiente. Se llama al retirarlo.
export function cancelarAvisos(vehiculoId: number): void {
  db.prepare(
    "UPDATE avisos SET estado = 'cancelado' WHERE vehiculo_id = ? AND estado = 'pendiente'",
  ).run(vehiculoId);
}

// --- Despachador ---

interface AvisoAEnviar {
  id: number;
  vehiculo_id: number;
  tipo: TipoAviso;
  intentos: number;
  marca: string;
  modelo: string;
  telefono: string | null;
  retirado_en: string | null;
}

/**
 * Manda los avisos pendientes que ya vencieron (el más viejo primero). Antes de
 * cada uno revisa que siga teniendo sentido; si el envío falla, lo reprograma
 * con una espera cada vez más larga. Un aviso que falla no frena a los demás.
 */
export async function despacharPendientes(enviador: Enviador): Promise<void> {
  // Si el envío no está listo (WhatsApp desconectado, QR sin escanear), no se
  // toca la cola: los avisos esperan sin gastar intentos.
  if (!enviadorListo(enviador)) return;

  const vencidos = db
    .prepare(
      `SELECT id FROM avisos
       WHERE estado = 'pendiente' AND enviar_en <= datetime('now')
       ORDER BY enviar_en ASC, id ASC`,
    )
    .all() as { id: number }[];

  for (const { id } of vencidos) {
    // Si se cortó en medio de la pasada, el resto espera a la próxima.
    if (!enviadorListo(enviador)) return;
    try {
      await despacharUno(id, enviador);
    } catch (error) {
      // Un error inesperado (de la base, por ejemplo) no corta el resto.
      console.error(`[aviso] Error inesperado con el aviso ${id}:`, error);
    }
  }
}

/**
 * Arranca el despachador: una pasada ya y después cada INTERVALO_SEG. Si una
 * pasada tarda más que el intervalo, la siguiente se saltea (no se pisan).
 */
export function iniciarAvisos(enviador: Enviador): void {
  let despachando = false;
  const pasada = (): void => {
    if (despachando) return;
    despachando = true;
    despacharPendientes(enviador)
      .catch((error) => console.error("[aviso] Falló la revisión de avisos:", error))
      .finally(() => {
        despachando = false;
      });
  };

  console.log(
    `Avisos por WhatsApp: envío "${enviador.nombre}", demora ${DEMORA_MIN} min, revisión cada ${INTERVALO_SEG} s.`,
  );
  pasada();
  setInterval(pasada, INTERVALO_SEG * 1000);
}

async function despacharUno(id: number, enviador: Enviador): Promise<void> {
  // Se vuelve a leer justo antes de mandar: mientras se mandaban los anteriores
  // pudo haber cambiado algo (lo cancelaron, retiraron el auto, etc.).
  const aviso = db
    .prepare(
      `SELECT a.id, a.vehiculo_id, a.tipo, a.intentos,
              v.marca, v.modelo, v.telefono, v.retirado_en
       FROM avisos a JOIN vehiculos v ON v.id = a.vehiculo_id
       WHERE a.id = ? AND a.estado = 'pendiente' AND a.enviar_en <= datetime('now')`,
    )
    .get(id) as AvisoAEnviar | undefined;
  if (!aviso) return;

  const motivo = motivoParaNoMandar(aviso);
  if (motivo) {
    marcar(id, "cancelado");
    console.log(`[aviso] "${aviso.tipo}" del auto ${aviso.vehiculo_id} cancelado: ${motivo}.`);
    return;
  }
  if (!aviso.telefono) {
    marcar(id, "sin_telefono");
    console.log(`[aviso] "${aviso.tipo}" del auto ${aviso.vehiculo_id} no sale: no tiene celular.`);
    return;
  }

  try {
    await enviador.enviar(aviso.telefono, MENSAJES[aviso.tipo](aviso));
  } catch (error) {
    registrarFalla(aviso, error);
    return;
  }

  // Salió: queda enviado aunque mientras tanto lo hayan cancelado (ya se mandó).
  db.prepare(
    "UPDATE avisos SET estado = 'enviado', enviado_en = datetime('now') WHERE id = ?",
  ).run(id);
}

// Por qué el aviso ya no tiene sentido (o null si hay que mandarlo).
function motivoParaNoMandar(aviso: AvisoAEnviar): string | null {
  if (aviso.retirado_en) return "el auto ya se retiró";
  if (aviso.tipo === "ingreso") return null;
  const condiciones = condicionesActuales(aviso.vehiculo_id);
  if (aviso.tipo === "en_proceso" && !condiciones.en_proceso) {
    return "ya no hay ningún servicio en proceso";
  }
  if (aviso.tipo === "listo" && !condiciones.listo) {
    return "no están todos los servicios terminados";
  }
  return null;
}

// Cuenta el intento fallido. Espera 1, 2, 4 y 8 min entre intentos; al quinto
// fallo queda "fallido" y no se reintenta más. Un ErrorDefinitivo (por ejemplo,
// el número no tiene WhatsApp) lo deja "fallido" de una.
function registrarFalla(aviso: AvisoAEnviar, error: unknown): void {
  const intentos = aviso.intentos + 1;
  const mensaje = error instanceof Error ? error.message : String(error);
  const definitivo = error instanceof ErrorDefinitivo;
  const agotado = definitivo || intentos >= MAX_INTENTOS;
  const espera = `+${60 * 2 ** (intentos - 1)} seconds`;

  // Solo si sigue pendiente: si lo cancelaron mientras se mandaba, queda cancelado.
  db.prepare(
    `UPDATE avisos
     SET intentos = @intentos, ultimo_error = @mensaje,
         estado = CASE WHEN @agotado THEN 'fallido' ELSE 'pendiente' END,
         enviar_en = CASE WHEN @agotado THEN enviar_en ELSE datetime('now', @espera) END
     WHERE id = @id AND estado = 'pendiente'`,
  ).run({ id: aviso.id, intentos, mensaje, agotado: agotado ? 1 : 0, espera });

  console.error(
    definitivo
      ? `[aviso] No se puede mandar "${aviso.tipo}" del auto ${aviso.vehiculo_id}: ${mensaje}. Queda como fallido (no se reintenta).`
      : agotado
      ? `[aviso] No se pudo mandar "${aviso.tipo}" del auto ${aviso.vehiculo_id} (intento ${intentos} de ${MAX_INTENTOS}): ${mensaje}. Queda como fallido.`
      : `[aviso] No se pudo mandar "${aviso.tipo}" del auto ${aviso.vehiculo_id} (intento ${intentos} de ${MAX_INTENTOS}): ${mensaje}. Se reintenta en ${2 ** (intentos - 1)} min.`,
  );
}

// --- Auxiliares ---

// Qué avisos corresponden hoy según los servicios ACTIVOS del auto:
// "en_proceso" si alguno está en proceso; "listo" si hay al menos uno y todos
// están terminados.
function condicionesActuales(vehiculoId: number): Record<"en_proceso" | "listo", boolean> {
  const { total, en_proceso, terminados } = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(estado = 'en_proceso'), 0) AS en_proceso,
              COALESCE(SUM(estado = 'terminado'), 0) AS terminados
       FROM servicios
       WHERE vehiculo_id = ? AND eliminado_en IS NULL`,
    )
    .get(vehiculoId) as { total: number; en_proceso: number; terminados: number };
  return {
    en_proceso: en_proceso > 0,
    listo: total > 0 && terminados === total,
  };
}

function autoActivo(vehiculoId: number): boolean {
  return Boolean(
    db
      .prepare("SELECT 1 FROM vehiculos WHERE id = ? AND retirado_en IS NULL")
      .get(vehiculoId),
  );
}

function marcar(id: number, estado: "cancelado" | "sin_telefono"): void {
  db.prepare("UPDATE avisos SET estado = ? WHERE id = ?").run(estado, id);
}

// Cómo estaba el envío en la última consulta. Arranca en true: si ya está listo
// desde la primera pasada no hay nada que avisar; si arranca sin estar listo,
// eso ya cuenta como cambio y se avisa.
let ultimoListo = true;

// ¿El envío puede mandar ahora? Los que no dicen nada (listo ausente) siempre
// pueden. Avisa en la consola solo cuando cambia respecto de la vez anterior
// (de listo a en espera o al revés), no en cada pasada.
function enviadorListo(enviador: Enviador): boolean {
  const listo = enviador.listo ? enviador.listo() : true;
  if (listo !== ultimoListo) {
    ultimoListo = listo;
    console.log(
      listo
        ? `[aviso] El envío "${enviador.nombre}" está listo: se retoman los avisos.`
        : `[aviso] El envío "${enviador.nombre}" no está listo (¿WhatsApp sin conectar o sin vincular?): los avisos esperan, sin gastar intentos.`,
    );
  }
  return listo;
}

// Número de una env var; si falta, no es un número o es menor que `minimo`,
// se usa el default.
function leerNumero(nombre: string, porDefecto: number, minimo = 0): number {
  const crudo = process.env[nombre];
  if (crudo === undefined || crudo.trim() === "") return porDefecto;
  const valor = Number(crudo);
  if (!Number.isFinite(valor) || valor < minimo) {
    console.warn(`${nombre}="${crudo}" no es válido; se usa ${porDefecto}.`);
    return porDefecto;
  }
  return valor;
}
