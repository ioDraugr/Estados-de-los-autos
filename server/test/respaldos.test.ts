// Backups automáticos (respaldos.ts), contra una base descartable y una carpeta
// de backups temporal (ver ayudas.ts).
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, test } from "node:test";
import {
  CARPETA_BACKUPS,
  consola,
  crearAuto,
  db,
  estadoBackups,
  hacerBackup,
  hayBackupDeHoy,
  limpiarBase,
  MAX_BACKUPS,
  revisarDiario,
} from "./ayudas.js";

// Cada test arranca sin carpeta de backups.
function vaciarBackups(): void {
  rmSync(CARPETA_BACKUPS, { recursive: true, force: true });
}

// Los backups que hay en la carpeta, ordenados por nombre.
function backups(): string[] {
  return readdirSync(CARPETA_BACKUPS)
    .filter((archivo) => /^taller-.*\.db$/.test(archivo))
    .sort();
}

// Un "backup" de mentira (el contenido no importa para rotar ni para las fechas).
function backupFalso(archivo: string): void {
  mkdirSync(CARPETA_BACKUPS, { recursive: true });
  writeFileSync(join(CARPETA_BACKUPS, archivo), "no es una base");
}

// AAAA-MM-DD en hora local, como en los nombres de los backups.
function fechaLocal(fecha: Date): string {
  return [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()]
    .map((numero) => String(numero).padStart(2, "0"))
    .join("-");
}

function contarAutos(base: Database.Database): number {
  return (base.prepare("SELECT COUNT(*) AS n FROM vehiculos").get() as { n: number }).n;
}

describe("backups", () => {
  beforeEach(() => {
    limpiarBase();
    vaciarBackups();
  });

  test("la copia se abre con SQLite y tiene los datos, aunque se escriba mientras se copia", async () => {
    // Relleno para que la base ocupe bastantes páginas: el backup se hace de a
    // 100 páginas por vuelta, así que dura varias vueltas y da para escribir en medio.
    const alta = db.prepare(
      "INSERT INTO vehiculos (marca, modelo, color, matricula, fecha_ingreso) VALUES (?, ?, ?, ?, datetime('now'))",
    );
    db.transaction(() => {
      for (let i = 0; i < 3000; i++) alta.run("Relleno", "x".repeat(200), "Gris", `REL${i}`);
    })();
    const antes = crearAuto(["polarizado"]);

    let listo = false;
    const promesa = hacerBackup("manual").finally(() => {
      listo = true;
    });
    let escriturasEnMedio = 0;
    while (!listo) {
      crearAuto(["vitrificado"], null);
      escriturasEnMedio++;
      await new Promise((seguir) => setImmediate(seguir));
    }
    const info = await promesa;
    assert.ok(escriturasEnMedio > 1, "tendría que haber escrito mientras se copiaba");

    const ruta = join(CARPETA_BACKUPS, info.archivo);
    assert.match(info.archivo, /^taller-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(_\d+)?-manual\.db$/);
    const copia = new Database(ruta, { readonly: true });
    try {
      assert.equal(copia.pragma("integrity_check", { simple: true }), "ok");
      // Un solo archivo, sin -wal al lado.
      assert.equal(copia.pragma("journal_mode", { simple: true }), "delete");
      const auto = copia.prepare("SELECT marca, matricula FROM vehiculos WHERE id = ?").get(antes.id);
      assert.deepEqual(auto, { marca: "Toyota", matricula: "SBA1234" });
      // Las escrituras del server durante la copia entran en la copia.
      assert.equal(contarAutos(copia), contarAutos(db));
    } finally {
      copia.close();
    }
    // No quedan temporales.
    assert.deepEqual(
      readdirSync(CARPETA_BACKUPS).filter((archivo) => archivo.startsWith(".")),
      [],
    );
  });

  test(`la rotación deja los últimos ${MAX_BACKUPS} y no toca lo que no es backup`, async () => {
    const viejos = Array.from(
      { length: 35 },
      (_, i) => `taller-2020-01-01_00-00-${String(i).padStart(2, "0")}-diario.db`,
    );
    viejos.forEach(backupFalso);
    const ajenos = ["notas.txt", "taller.db", "copia-taller-2020.db", ".gitkeep"];
    ajenos.forEach(backupFalso);
    // Temporal de una copia que se cortó a la mitad.
    backupFalso(".taller-2020-01-01_00-00-00-manual.db.tmp");

    const info = await hacerBackup("arranque");

    const quedan = backups();
    assert.equal(quedan.length, MAX_BACKUPS);
    // Se fueron los 6 más viejos (35 + el nuevo = 36) y quedó el nuevo.
    assert.deepEqual(quedan, [...viejos.slice(6), info.archivo]);
    for (const ajeno of ajenos) assert.ok(existsSync(join(CARPETA_BACKUPS, ajeno)), ajeno);
    assert.equal(existsSync(join(CARPETA_BACKUPS, ".taller-2020-01-01_00-00-00-manual.db.tmp")), false);
    assert.equal(estadoBackups().cantidad, MAX_BACKUPS);
  });

  test("el diario se hace solo si no hay ningún backup de hoy", async () => {
    const hoy = new Date();
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 12);
    const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1, 12);

    // Sin carpeta, o con solo uno de ayer: no hay de hoy.
    assert.equal(hayBackupDeHoy(hoy), false);
    backupFalso(`taller-${fechaLocal(ayer)}_23-59-59-arranque.db`);
    assert.equal(hayBackupDeHoy(hoy), false);
    assert.equal(hayBackupDeHoy(ayer), true);

    const diario = await revisarDiario(hoy);
    assert.ok(diario);
    assert.match(diario.archivo, new RegExp(`^taller-${fechaLocal(hoy)}_.*-diario\\.db$`));
    assert.equal(hayBackupDeHoy(hoy), true);

    // Ya hay de hoy: no hace otro.
    assert.equal(await revisarDiario(hoy), null);
    assert.equal(backups().length, 2);

    // Cualquier motivo cuenta: uno de arranque de hoy también alcanza.
    vaciarBackups();
    await hacerBackup("arranque");
    assert.equal(await revisarDiario(hoy), null);
    assert.equal(hayBackupDeHoy(manana), false);
  });

  test("dos pedidos a la vez comparten el mismo backup (no se superponen)", async () => {
    const primero = hacerBackup("manual");
    const segundo = hacerBackup("diario");
    assert.equal(primero, segundo);
    const info = await primero;
    assert.deepEqual(backups(), [info.archivo]);

    // Terminado ese, el próximo es otro archivo, aunque caiga en el mismo
    // segundo, y queda después al ordenar.
    const otro = await hacerBackup("manual");
    assert.notEqual(otro.archivo, info.archivo);
    assert.deepEqual(backups(), [info.archivo, otro.archivo]);
  });

  test("estadoBackups informa el último backup y el último error", async () => {
    assert.deepEqual(estadoBackups(), {
      carpeta: CARPETA_BACKUPS,
      ultimo: null,
      ultimoError: null,
      cantidad: 0,
      maximo: MAX_BACKUPS,
    });

    backupFalso("taller-2020-01-01_00-00-00-diario.db");
    const antes = Date.now();
    const info = await hacerBackup("manual");
    const estado = estadoBackups();
    assert.deepEqual(estado.ultimo, info);
    assert.equal(estado.cantidad, 2);
    assert.equal(estado.ultimoError, null);
    assert.ok(info.bytes > 0);
    // La fecha sale del nombre (al segundo): cerca de ahora.
    const fecha = Date.parse(info.fecha);
    assert.ok(fecha >= antes - 1000 && fecha <= Date.now(), info.fecha);

    // Si la carpeta no se puede usar, el backup falla sin romper nada y queda anotado.
    vaciarBackups();
    writeFileSync(CARPETA_BACKUPS, "esto no es una carpeta");
    const erroresAntes = consola.error.mock.callCount();
    await assert.rejects(hacerBackup("manual"));
    const conError = estadoBackups();
    assert.equal(conError.ultimo, null);
    assert.ok(conError.ultimoError?.mensaje);
    assert.ok(consola.error.mock.callCount() > erroresAntes);

    // Vuelve a andar: el error se borra.
    vaciarBackups();
    await hacerBackup("manual");
    assert.equal(estadoBackups().ultimoError, null);
  });
});
