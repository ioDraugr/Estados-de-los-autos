// Base de datos SQLite local (un solo archivo). Crea las tablas si no existen.
// El esquema sigue el modelo de datos del CLAUDE.md.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// El archivo de la base queda en server/data/taller.db, salvo que se indique
// otro con la env var DB_PATH (sirve para probar contra una base descartable
// sin tocar la real). La carpeta no está en git (la base es local), así que la
// creamos si falta. Se exporta para ubicar los backups al lado (respaldos.ts).
export const rutaDb = process.env.DB_PATH
  ? resolve(process.env.DB_PATH)
  : join(__dirname, "..", "data", "taller.db");
mkdirSync(dirname(rutaDb), { recursive: true });

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

  -- Cola de avisos automáticos por WhatsApp (ver avisos.ts). Cada aviso sale a lo
  -- sumo una vez por auto (UNIQUE). Las fechas van en UTC con el mismo formato
  -- que datetime('now'), así se comparan como texto.
  CREATE TABLE IF NOT EXISTS avisos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    vehiculo_id  INTEGER NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
    tipo         TEXT NOT NULL CHECK (tipo IN ('ingreso','en_proceso','listo')),
    estado       TEXT NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','enviado','cancelado','sin_telefono','fallido')),
    enviar_en    TEXT NOT NULL,
    intentos     INTEGER NOT NULL DEFAULT 0,
    ultimo_error TEXT,
    creado_en    TEXT NOT NULL DEFAULT (datetime('now')),
    enviado_en   TEXT,
    UNIQUE (vehiculo_id, tipo)
  );

  -- El despachador busca siempre "pendientes que ya vencieron".
  CREATE INDEX IF NOT EXISTS avisos_por_vencer ON avisos (estado, enviar_en);
`);

// --- Migraciones sobre bases que ya existían ---
// CREATE TABLE IF NOT EXISTS no agrega columnas nuevas a una tabla vieja, así que
// las sumamos a mano si faltan (soft delete de autos y de servicios, y el
// celular opcional del cliente para los avisos por WhatsApp).
agregarColumnaSiFalta("vehiculos", "retirado_en", "TEXT");
agregarColumnaSiFalta("servicios", "eliminado_en", "TEXT");
agregarColumnaSiFalta("vehiculos", "telefono", "TEXT");

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
