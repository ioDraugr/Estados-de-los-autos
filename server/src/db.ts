// Base de datos SQLite local (un solo archivo). Crea las tablas si no existen.
// El esquema sigue el modelo de datos del CLAUDE.md.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { MODO_DEMO, exigirBaseDemo } from "./demo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// El archivo de la base queda en server/data/taller.db, salvo que se indique
// otro con la env var DB_PATH (sirve para probar contra una base descartable
// sin tocar la real). La carpeta no está en git (la base es local), así que la
// creamos si falta. Se exporta para ubicar los backups al lado (respaldos.ts).
export const rutaDb = process.env.DB_PATH
  ? resolve(process.env.DB_PATH)
  : join(__dirname, "..", "data", "taller.db");
// Con MODO_DEMO solo se acepta una base llamada demo.db (ver demo.ts): se corta
// ANTES de crear carpetas o abrir nada.
exigirBaseDemo(MODO_DEMO, process.env.DB_PATH, rutaDb);
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

  -- Cola de avisos automáticos por WhatsApp (ver avisos.ts y postventa.ts).
  -- Cada aviso sale a lo sumo una vez por auto (UNIQUE). Las fechas van en UTC
  -- con el mismo formato que datetime('now'), así se comparan como texto.
  ${tablaAvisos("avisos")}

  -- El despachador busca siempre "pendientes que ya vencieron".
  CREATE INDEX IF NOT EXISTS avisos_por_vencer ON avisos (estado, enviar_en);

  -- Historial de cambios para los reportes que vienen (ver historial.ts). Solo se
  -- agregan filas, nunca se editan ni se borran. En ingreso/retiro no hay servicio
  -- (servicio_id y tipo_servicio quedan NULL); el tipo se copia para que los
  -- reportes no necesiten joins. La fecha va en UTC con el formato de datetime('now').
  CREATE TABLE IF NOT EXISTS historial (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    vehiculo_id     INTEGER NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
    servicio_id     INTEGER REFERENCES servicios(id) ON DELETE CASCADE,
    tipo_servicio   TEXT CHECK (tipo_servicio IN ('instalacion','polarizado','vitrificado')),
    evento          TEXT NOT NULL
                    CHECK (evento IN ('ingreso','cambio_estado','retiro',
                                      'servicio_agregado','servicio_quitado')),
    estado_anterior TEXT CHECK (estado_anterior IN ('esperando','en_proceso','terminado')),
    estado_nuevo    TEXT CHECK (estado_nuevo IN ('esperando','en_proceso','terminado')),
    fecha           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Los reportes van a pedir "lo que pasó entre tal y tal fecha" o "lo de este auto".
  CREATE INDEX IF NOT EXISTS historial_por_fecha ON historial (fecha);
  CREATE INDEX IF NOT EXISTS historial_por_vehiculo ON historial (vehiculo_id);
`);

// --- Migraciones sobre bases que ya existían ---
// CREATE TABLE IF NOT EXISTS no agrega columnas nuevas a una tabla vieja, así que
// las sumamos a mano si faltan (soft delete de autos y de servicios, y el
// celular opcional del cliente para los avisos por WhatsApp).
agregarColumnaSiFalta("vehiculos", "retirado_en", "TEXT");
agregarColumnaSiFalta("servicios", "eliminado_en", "TEXT");
agregarColumnaSiFalta("vehiculos", "telefono", "TEXT");
// Si el cliente aceptó recibir los mensajes de post-venta (reseña, mantenimiento).
// Los autos cargados antes de la casilla quedan en 0: nadie les preguntó.
agregarColumnaSiFalta("vehiculos", "acepta_whatsapp", "INTEGER NOT NULL DEFAULT 0");
// La post-venta sumó dos tipos de aviso al CHECK de la tabla avisos.
ampliarTiposDeAvisos();

// PIN inicial de /admin. Se puede fijar el primero con la env var ADMIN_PIN;
// después vive en la base (config) y no se vuelve a tocar.
sembrarPinSiFalta();

// La tabla de avisos, con el nombre que se pida: la usa el CREATE de arriba y la
// migración de abajo, así las dos quedan siempre iguales.
// Tipos: los del taller (ingreso, en_proceso, listo) y los de post-venta
// (resena, mantenimiento).
function tablaAvisos(nombre: string): string {
  return `CREATE TABLE IF NOT EXISTS ${nombre} (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    vehiculo_id  INTEGER NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
    tipo         TEXT NOT NULL
                 CHECK (tipo IN ('ingreso','en_proceso','listo','resena','mantenimiento')),
    estado       TEXT NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','enviado','cancelado','sin_telefono','fallido')),
    enviar_en    TEXT NOT NULL,
    intentos     INTEGER NOT NULL DEFAULT 0,
    ultimo_error TEXT,
    creado_en    TEXT NOT NULL DEFAULT (datetime('now')),
    enviado_en   TEXT,
    UNIQUE (vehiculo_id, tipo)
  );`;
}

// SQLite no deja cambiar un CHECK: si la tabla avisos es de antes de la
// post-venta (su CREATE no menciona 'resena'), se arma una nueva con el CHECK
// ampliado, se copian todas las filas (con sus ids) y se cambia por la vieja.
// Todo en una transacción: si algo falla, queda la tabla vieja intacta.
// Las claves foráneas se apagan mientras tanto (no se pueden tocar dentro de
// una transacción) y al final se revisa que no haya quedado ninguna rota.
// Ninguna otra tabla ni trigger apunta a avisos, así que el cambio no los toca.
function ampliarTiposDeAvisos(): void {
  const fila = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'avisos'")
    .get() as { sql: string } | undefined;
  if (!fila || fila.sql.includes("'resena'")) return;

  const columnas =
    "id, vehiculo_id, tipo, estado, enviar_en, intentos, ultimo_error, creado_en, enviado_en";
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      // El contador de ids (AUTOINCREMENT) sigue donde estaba: un aviso nuevo
      // nunca repite el id de uno viejo, aunque se haya borrado.
      const contador = db
        .prepare("SELECT seq FROM sqlite_sequence WHERE name = 'avisos'")
        .get() as { seq: number } | undefined;
      db.exec(`
        DROP TABLE IF EXISTS avisos_nueva;
        ${tablaAvisos("avisos_nueva")}
        INSERT INTO avisos_nueva (${columnas}) SELECT ${columnas} FROM avisos;
        DROP TABLE avisos;
        ALTER TABLE avisos_nueva RENAME TO avisos;
        CREATE INDEX IF NOT EXISTS avisos_por_vencer ON avisos (estado, enviar_en);
      `);
      if (contador) {
        // Sin filas copiadas, la tabla nueva todavía no tiene contador.
        db.prepare(
          `INSERT INTO sqlite_sequence (name, seq) SELECT 'avisos', 0
           WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'avisos')`,
        ).run();
        db.prepare("UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'avisos'").run(
          contador.seq,
        );
      }
      const rotas = db.pragma("foreign_key_check(avisos)") as unknown[];
      if (rotas.length > 0) {
        throw new Error(`La migración de avisos dejó ${rotas.length} filas sin su auto.`);
      }
    })();
  } finally {
    db.pragma("foreign_keys = ON");
  }
  console.log("Base: la tabla de avisos ahora acepta los de post-venta (reseña y mantenimiento).");
}

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
