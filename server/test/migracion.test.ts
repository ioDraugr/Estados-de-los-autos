// Migración de una base de antes de la post-venta (db.ts): la tabla avisos con
// el CHECK viejo y vehiculos sin acepta_whatsapp. Este archivo NO usa ayudas.ts
// (que arranca con una base vacía): arma a mano una base con el esquema viejo y
// recién después carga db.ts apuntado a ella, que es lo que pasa al actualizar
// el server en el taller.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, mock, test } from "node:test";
import Database from "better-sqlite3";

const carpeta = mkdtempSync(join(tmpdir(), "taller-migracion-"));
const ruta = join(carpeta, "taller.db");

// Esquema y datos tal como estaban antes de la post-venta (commit 6688a2e).
function armarBaseVieja(): void {
  const vieja = new Database(ruta);
  vieja.exec(`
    CREATE TABLE vehiculos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      marca         TEXT NOT NULL,
      modelo        TEXT NOT NULL,
      color         TEXT NOT NULL,
      matricula     TEXT NOT NULL,
      fecha_ingreso TEXT NOT NULL,
      retirado_en   TEXT,
      telefono      TEXT
    );
    CREATE TABLE servicios (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      vehiculo_id    INTEGER NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
      tipo           TEXT NOT NULL CHECK (tipo IN ('instalacion','polarizado','vitrificado')),
      estado         TEXT NOT NULL DEFAULT 'esperando'
                     CHECK (estado IN ('esperando','en_proceso','terminado')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
      eliminado_en   TEXT
    );
    CREATE TABLE config (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
    CREATE TABLE avisos (
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
    CREATE INDEX avisos_por_vencer ON avisos (estado, enviar_en);

    INSERT INTO vehiculos (id, marca, modelo, color, matricula, fecha_ingreso, telefono)
    VALUES (1, 'Toyota', 'Corolla', 'Gris', 'SBA1234', '2026-09-01 12:00:00', '+59899123456'),
           (2, 'Fiat', 'Uno', 'Rojo', 'SAB9876', '2026-09-02 12:00:00', NULL);
    INSERT INTO servicios (vehiculo_id, tipo, estado) VALUES (1, 'vitrificado', 'terminado');
    INSERT INTO avisos (id, vehiculo_id, tipo, estado, enviar_en, intentos, ultimo_error, creado_en, enviado_en)
    VALUES (3, 1, 'ingreso', 'enviado', '2026-09-01 12:05:00', 0, NULL, '2026-09-01 12:00:00', '2026-09-01 12:05:10'),
           (7, 1, 'listo', 'fallido', '2026-09-03 10:00:00', 5, 'sin señal', '2026-09-03 09:00:00', NULL),
           (9, 2, 'ingreso', 'sin_telefono', '2026-09-02 12:05:00', 0, NULL, '2026-09-02 12:00:00', NULL);
    -- Un aviso borrado: el contador de ids quedó más arriba que el último que hay.
    INSERT INTO avisos (id, vehiculo_id, tipo, enviar_en) VALUES (12, 2, 'listo', '2026-09-04 10:00:00');
    DELETE FROM avisos WHERE id = 12;
  `);
  vieja.close();
}

interface Fila {
  [columna: string]: unknown;
}

let db: Database.Database;
let antes: Fila[];

before(async () => {
  armarBaseVieja();
  const vieja = new Database(ruta, { readonly: true });
  antes = vieja.prepare("SELECT * FROM avisos ORDER BY id").all() as Fila[];
  vieja.close();

  mock.method(console, "log", () => {});
  process.env.DB_PATH = ruta;
  ({ db } = await import("../src/db.js"));
});

after(() => {
  db.close();
  rmSync(carpeta, { recursive: true, force: true });
});

describe("migración de una base vieja", () => {
  test("los avisos que había quedan iguales, con sus ids", () => {
    assert.deepEqual(db.prepare("SELECT * FROM avisos ORDER BY id").all(), antes);
  });

  test("la tabla acepta los tipos de post-venta y sigue rechazando otros", () => {
    const { sql } = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'avisos'")
      .get() as { sql: string };
    assert.match(sql, /'resena','mantenimiento'/);

    const insertar = db.prepare(
      "INSERT INTO avisos (vehiculo_id, tipo, enviar_en) VALUES (?, ?, datetime('now'))",
    );
    insertar.run(2, "resena");
    insertar.run(1, "mantenimiento");
    assert.throws(() => insertar.run(2, "cualquiera"), /CHECK constraint failed/);
    // Sigue valiendo un aviso de cada tipo por auto.
    assert.throws(() => insertar.run(2, "resena"), /UNIQUE constraint failed/);
  });

  test("los ids nuevos siguen después del último que se usó (aunque se haya borrado)", () => {
    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO avisos (vehiculo_id, tipo, enviar_en) VALUES (2, 'en_proceso', datetime('now'))",
      )
      .run();
    assert.ok(Number(lastInsertRowid) > 12, `id nuevo ${lastInsertRowid}`);
  });

  test("el índice y la clave foránea (con su borrado en cascada) siguen", () => {
    const indice = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'avisos_por_vencer'")
      .get();
    assert.ok(indice);
    assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
    assert.deepEqual(db.pragma("foreign_key_check"), []);
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO avisos (vehiculo_id, tipo, enviar_en) VALUES (99, 'ingreso', datetime('now'))",
          )
          .run(),
      /FOREIGN KEY constraint failed/,
    );
    db.prepare("DELETE FROM vehiculos WHERE id = 2").run();
    assert.equal(
      (db.prepare("SELECT COUNT(*) AS n FROM avisos WHERE vehiculo_id = 2").get() as { n: number })
        .n,
      0,
    );
  });

  test("los autos que ya estaban quedan como que no aceptaron mensajes", () => {
    const filas = db.prepare("SELECT acepta_whatsapp FROM vehiculos").all() as {
      acepta_whatsapp: number;
    }[];
    assert.ok(filas.length > 0);
    assert.ok(filas.every((f) => f.acepta_whatsapp === 0));
  });
});
