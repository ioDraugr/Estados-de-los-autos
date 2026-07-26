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
`);
