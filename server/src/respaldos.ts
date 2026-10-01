// Backups automáticos de la base: uno al arrancar el server y uno por día, en
// CARPETA_BACKUPS (por defecto la carpeta "backups" al lado de la base). Se
// guardan los últimos MAX_BACKUPS archivos; los más viejos se borran solos.
//
// La copia se hace con el backup de SQLite (db.backup de better-sqlite3): sale
// consistente aunque el server esté escribiendo y trae también lo que todavía
// está en el -wal. Copiar taller.db a mano con el server andando NO es seguro.
import Database from "better-sqlite3";
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { db, rutaDb } from "./db.js";

export type MotivoBackup = "arranque" | "diario" | "manual";

export interface InfoBackup {
  archivo: string; // solo el nombre, dentro de CARPETA_BACKUPS
  fecha: string; // ISO (UTC), sale del nombre del archivo
  bytes: number;
}

export interface EstadoBackups {
  carpeta: string;
  ultimo: InfoBackup | null;
  // El error del último intento, si falló (en memoria: se borra al reiniciar o
  // cuando un backup sale bien).
  ultimoError: { fecha: string; mensaje: string } | null;
  cantidad: number;
  maximo: number; // MAX_BACKUPS
}

export const CARPETA_BACKUPS = process.env.CARPETA_BACKUPS
  ? resolve(process.env.CARPETA_BACKUPS)
  : join(dirname(rutaDb), "backups");

// Cuántos archivos se guardan (los de arranque, diarios y manuales cuentan igual).
export const MAX_BACKUPS = 30;

// Cada cuánto se revisa si ya hay backup de hoy.
const REVISION_MS = 60 * 60 * 1000;

// Los backups se llaman taller-AAAA-MM-DD_HH-MM-SS-<motivo>.db, en hora local.
// Con los números rellenos con ceros, ordenar por nombre = ordenar por fecha.
// Solo se tocan los archivos con esta forma: lo demás de la carpeta no se borra.
const ES_BACKUP = /^taller-.*\.db$/;
const FECHA_EN_NOMBRE = /^taller-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/;
// Mientras se copia, el archivo lleva un punto adelante y .tmp al final: si el
// server se corta a la mitad, queda un temporal (no un backup roto) que la
// próxima rotación limpia.
const ES_TEMPORAL = /^\.taller-.*\.tmp/;

let enCurso: Promise<InfoBackup> | null = null;
let ultimoError: EstadoBackups["ultimoError"] = null;

/**
 * Hace un backup ya. Si hay uno en curso, no arranca otro: devuelve la misma
 * promesa (el que llegó segundo se queda con el backup del primero, aunque
 * haya pedido otro motivo). Si falla, rechaza y queda anotado en ultimoError.
 */
export function hacerBackup(motivo: MotivoBackup): Promise<InfoBackup> {
  enCurso ??= copiar(motivo).finally(() => {
    enCurso = null;
  });
  return enCurso;
}

// ¿Hay algún backup (de cualquier motivo) con la fecha local de `ahora`?
export function hayBackupDeHoy(ahora: Date = new Date()): boolean {
  const prefijo = `taller-${fechaLocal(ahora)}_`;
  return listarBackups().some((archivo) => archivo.startsWith(prefijo));
}

// El backup diario: lo hace solo si todavía no hay uno de hoy. Devuelve null si
// no hizo falta.
export async function revisarDiario(ahora: Date = new Date()): Promise<InfoBackup | null> {
  if (hayBackupDeHoy(ahora)) return null;
  return hacerBackup("diario");
}

// Dónde están, cuál es el último y si el último intento falló. El último sale
// de la carpeta, así que sobrevive a los reinicios.
export function estadoBackups(): EstadoBackups {
  const archivos = listarBackups();
  const ultimo = archivos.at(-1);
  return {
    carpeta: CARPETA_BACKUPS,
    ultimo: ultimo ? infoDe(ultimo) : null,
    ultimoError,
    cantidad: archivos.length,
    maximo: MAX_BACKUPS,
  };
}

/**
 * Arranca los backups automáticos: uno ya ("arranque") y después, cada hora,
 * uno "diario" si todavía no hay ninguno de hoy. Los errores se loguean y
 * quedan en estadoBackups(); nunca tiran abajo el server.
 */
export function iniciarBackups(): void {
  console.log(
    `Backups de la base en ${CARPETA_BACKUPS} (al arrancar y una vez por día; se guardan los últimos ${MAX_BACKUPS}).`,
  );
  // hacerBackup ya logueó el error: acá solo se evita el rechazo sin atender.
  hacerBackup("arranque").catch(() => {});
  setInterval(() => {
    revisarDiario().catch(() => {});
  }, REVISION_MS).unref();
}

async function copiar(motivo: MotivoBackup): Promise<InfoBackup> {
  let temporal: string | null = null;
  try {
    mkdirSync(CARPETA_BACKUPS, { recursive: true });
    const archivo = nombreLibre(new Date(), motivo);
    temporal = join(CARPETA_BACKUPS, `.${archivo}.tmp`);
    await db.backup(temporal);
    // La copia sale en modo WAL, como la base. La pasamos al modo clásico para
    // que sea un solo archivo que se pueda abrir o copiar al pendrive sin que
    // aparezcan -wal/-shm al lado.
    const copia = new Database(temporal);
    try {
      copia.pragma("journal_mode = DELETE");
    } finally {
      copia.close();
    }
    renameSync(temporal, join(CARPETA_BACKUPS, archivo));
    temporal = null;

    ultimoError = null;
    const info = infoDe(archivo);
    console.log(`[backup] Listo (${motivo}): ${archivo} (${Math.ceil(info.bytes / 1024)} KB).`);
    rotar();
    return info;
  } catch (error) {
    if (temporal) rmSync(temporal, { force: true });
    const mensaje = error instanceof Error ? error.message : String(error);
    ultimoError = { fecha: new Date().toISOString(), mensaje };
    console.error(`[backup] No se pudo hacer el backup (${motivo}) en ${CARPETA_BACKUPS}:`, error);
    throw error;
  }
}

// Borra los backups que sobran (los más viejos) y los temporales de copias que
// se cortaron. Un archivo que no se puede borrar se avisa y se sigue.
function rotar(): void {
  const sobrantes = listarBackups().slice(0, -MAX_BACKUPS);
  const temporales = readdirSync(CARPETA_BACKUPS).filter((archivo) => ES_TEMPORAL.test(archivo));
  for (const archivo of [...sobrantes, ...temporales]) {
    try {
      rmSync(join(CARPETA_BACKUPS, archivo), { force: true });
    } catch (error) {
      console.error(`[backup] No se pudo borrar ${archivo}:`, error);
    }
  }
}

// Los backups de la carpeta, del más viejo al más nuevo. Si la carpeta no
// existe (o no se puede leer), ninguno: el próximo backup la crea o, si no
// puede, deja el error en ultimoError.
function listarBackups(): string[] {
  let archivos: string[];
  try {
    archivos = readdirSync(CARPETA_BACKUPS);
  } catch {
    return [];
  }
  return archivos.filter((archivo) => ES_BACKUP.test(archivo)).sort();
}

// Nombre para un backup de `ahora`. Si en ese mismo segundo ya hubo otro, se le
// agrega _2, _3… después de la hora ("_" va después de "-" al ordenar, así que
// sigue quedando más nuevo que el anterior).
function nombreLibre(ahora: Date, motivo: MotivoBackup): string {
  const sello = `${fechaLocal(ahora)}_${horaLocal(ahora)}`;
  const existentes = listarBackups();
  const usado = (base: string): boolean =>
    existentes.some((archivo) => archivo.startsWith(`${base}-`));
  let base = `taller-${sello}`;
  for (let n = 2; usado(base); n++) base = `taller-${sello}_${n}`;
  return `${base}-${motivo}.db`;
}

function infoDe(archivo: string): InfoBackup {
  const { size, mtime } = statSync(join(CARPETA_BACKUPS, archivo));
  // La fecha sale del nombre (sigue valiendo si el archivo se copia y vuelve);
  // si alguien lo renombró a mano, la de modificación.
  const partes = FECHA_EN_NOMBRE.exec(archivo)?.slice(1).map(Number);
  const fecha = partes
    ? new Date(partes[0], partes[1] - 1, partes[2], partes[3], partes[4], partes[5])
    : mtime;
  return { archivo, fecha: fecha.toISOString(), bytes: size };
}

// AAAA-MM-DD y HH-MM-SS en hora local (la del taller, TZ).
function fechaLocal(fecha: Date): string {
  return [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()].map(dosCifras).join("-");
}

function horaLocal(fecha: Date): string {
  return [fecha.getHours(), fecha.getMinutes(), fecha.getSeconds()].map(dosCifras).join("-");
}

function dosCifras(numero: number): string {
  return String(numero).padStart(2, "0");
}
