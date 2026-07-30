// Base de datos SQLite local (un solo archivo). Crea las tablas si no existen.
// El esquema sigue el modelo de datos del CLAUDE.md.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// El archivo de la base queda en server/data/taller.db
// La carpeta no está en git (la base es local), así que la creamos si falta.
const carpetaDatos = join(__dirname, "..", "data");
mkdirSync(carpetaDatos, { recursive: true });
const rutaDb = join(carpetaDatos, "taller.db");

export const db = new Database(rutaDb);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS vehiculos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    marca         TEXT NOT NULL,
    modelo        TEXT NOT NULL,
    color         TEXT NOT NULL,
    matricula     TEXT NOT NULL,
    fecha_ingreso TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS servicios (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    vehiculo_id    INTEGER NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
    tipo           TEXT NOT NULL CHECK (tipo IN ('instalacion','polarizado','vitrificado')),
    estado         TEXT NOT NULL DEFAULT 'esperando'
                   CHECK (estado IN ('esperando','en_proceso','terminado')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Config general del taller (clave/valor). Guarda el PIN de /admin, entre otros.
  CREATE TABLE IF NOT EXISTS config (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );
`);

// --- Migraciones sobre bases que ya existían ---
// CREATE TABLE IF NOT EXISTS no agrega columnas nuevas a una tabla vieja, así que
// las sumamos a mano si faltan (soft delete de autos y de servicios).
agregarColumnaSiFalta("vehiculos", "retirado_en", "TEXT");
agregarColumnaSiFalta("servicios", "eliminado_en", "TEXT");

// PIN inicial de /admin. Se puede fijar el primero con la env var ADMIN_PIN;
// después vive en la base (config) y no se vuelve a tocar.
sembrarPinSiFalta();

// Agrega `columna` a `tabla` solo si todavía no existe.
function agregarColumnaSiFalta(tabla: string, columna: string, tipo: string): void {
  const columnas = db.prepare(`PRAGMA table_info(${tabla})`).all() as {
    name: string;
  }[];
  if (!columnas.some((c) => c.name === columna)) {
    db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${tipo}`);
  }
}

// Deja el PIN en config si no hay uno guardado. INSERT OR IGNORE para no pisar
// un PIN ya elegido.
function sembrarPinSiFalta(): void {
  const pinInicial = process.env.ADMIN_PIN ?? "1234";
  db.prepare("INSERT OR IGNORE INTO config (clave, valor) VALUES ('pin', ?)").run(
    pinInicial,
  );
}
