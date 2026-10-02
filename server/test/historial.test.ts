// Historial de cambios (historial.ts): qué se anota en cada alta, cambio de
// estado, retiro y agregado/quitado de servicios, contra una base descartable
// (ver ayudas.ts). Lo que falla o se rechaza no deja ninguna fila.
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  agregarServicio,
  cambiarEstado,
  crearAuto,
  db,
  limpiarBase,
  quitarServicio,
  retirarVehiculo,
} from "./ayudas.js";

interface FilaHistorial {
  id: number;
  vehiculo_id: number;
  servicio_id: number | null;
  tipo_servicio: string | null;
  evento: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  fecha: string;
}

// Todas las filas del historial, en el orden en que se anotaron.
function leerHistorial(): FilaHistorial[] {
  return db.prepare("SELECT * FROM historial ORDER BY id").all() as FilaHistorial[];
}

// Lo que importa de cada fila para comparar (sin id ni fecha, que cambian).
function resumen(fila: FilaHistorial) {
  const { id: _id, fecha: _fecha, ...resto } = fila;
  return resto;
}

describe("historial", () => {
  beforeEach(limpiarBase);
  // Por si un test dejó la trampa armada (ver "si el cambio falla...").
  afterEach(() => db.exec("DROP TRIGGER IF EXISTS temp.avisos_rotos"));

  test("el alta anota el ingreso y cada servicio agregado (de NULL a esperando)", () => {
    const auto = crearAuto(["polarizado", "vitrificado"]);
    assert.deepEqual(leerHistorial().map(resumen), [
      {
        vehiculo_id: auto.id,
        servicio_id: null,
        tipo_servicio: null,
        evento: "ingreso",
        estado_anterior: null,
        estado_nuevo: null,
      },
      {
        vehiculo_id: auto.id,
        servicio_id: auto.servicio("polarizado"),
        tipo_servicio: "polarizado",
        evento: "servicio_agregado",
        estado_anterior: null,
        estado_nuevo: "esperando",
      },
      {
        vehiculo_id: auto.id,
        servicio_id: auto.servicio("vitrificado"),
        tipo_servicio: "vitrificado",
        evento: "servicio_agregado",
        estado_anterior: null,
        estado_nuevo: "esperando",
      },
    ]);
  });

  test("cada cambio de estado real anota anterior y nuevo, en orden", () => {
    const auto = crearAuto(["instalacion", "polarizado"]);
    const instalacion = auto.servicio("instalacion");
    const yaHabia = leerHistorial().length;

    assert.equal(cambiarEstado(instalacion, "en_proceso"), true);
    assert.equal(cambiarEstado(instalacion, "terminado"), true);

    const nuevas = leerHistorial().slice(yaHabia).map(resumen);
    assert.deepEqual(nuevas, [
      {
        vehiculo_id: auto.id,
        servicio_id: instalacion,
        tipo_servicio: "instalacion",
        evento: "cambio_estado",
        estado_anterior: "esperando",
        estado_nuevo: "en_proceso",
      },
      {
        vehiculo_id: auto.id,
        servicio_id: instalacion,
        tipo_servicio: "instalacion",
        evento: "cambio_estado",
        estado_anterior: "en_proceso",
        estado_nuevo: "terminado",
      },
    ]);
  });

  test("cambiar al mismo estado no anota nada (pero sigue respondiendo que sí)", () => {
    const auto = crearAuto(["polarizado"]);
    const polarizado = auto.servicio("polarizado");
    cambiarEstado(polarizado, "en_proceso");
    const antes = leerHistorial();

    assert.equal(cambiarEstado(polarizado, "en_proceso"), true);
    assert.deepEqual(leerHistorial(), antes);
  });

  test("un cambio que no se hace no anota nada", () => {
    const auto = crearAuto(["polarizado", "vitrificado"]);
    const vitrificado = auto.servicio("vitrificado");
    quitarServicio(vitrificado);
    const antes = leerHistorial();

    // Servicio que no existe.
    assert.equal(cambiarEstado(999_999, "en_proceso"), false);
    // Servicio ya quitado.
    assert.equal(cambiarEstado(vitrificado, "en_proceso"), false);
    // Estado inválido.
    assert.throws(
      () => cambiarEstado(auto.servicio("polarizado"), "listo" as never),
      /Estado inválido/,
    );

    assert.deepEqual(leerHistorial(), antes);
  });

  test("si el cambio falla a mitad de camino, no queda la fila (misma transacción)", () => {
    const auto = crearAuto(["polarizado"]);
    const polarizado = auto.servicio("polarizado");
    const antes = leerHistorial();

    // Trampa: los avisos no se pueden programar, así que el cambio a "en_proceso"
    // (que programa el "ya arrancamos") revienta después de anotar el historial.
    db.exec(`
      CREATE TEMP TRIGGER avisos_rotos BEFORE INSERT ON main.avisos
      BEGIN SELECT RAISE(ABORT, 'avisos rotos'); END;
    `);
    assert.throws(() => cambiarEstado(polarizado, "en_proceso"), /avisos rotos/);
    // Lo mismo con un alta: ni el auto ni su ingreso quedan.
    assert.throws(() => crearAuto(["vitrificado"]), /avisos rotos/);

    assert.deepEqual(leerHistorial(), antes);
    const { estado } = db
      .prepare("SELECT estado FROM servicios WHERE id = ?")
      .get(polarizado) as { estado: string };
    assert.equal(estado, "esperando");
  });

  test("el retiro se anota una sola vez aunque se retire dos veces", () => {
    const auto = crearAuto(["polarizado"]);
    const yaHabia = leerHistorial().length;

    assert.equal(retirarVehiculo(auto.id), true);
    assert.equal(retirarVehiculo(auto.id), false);

    assert.deepEqual(leerHistorial().slice(yaHabia).map(resumen), [
      {
        vehiculo_id: auto.id,
        servicio_id: null,
        tipo_servicio: null,
        evento: "retiro",
        estado_anterior: null,
        estado_nuevo: null,
      },
    ]);
  });

  test("agregar un servicio lo anota; si se rechaza (repetido), no", () => {
    const auto = crearAuto(["polarizado"]);
    const yaHabia = leerHistorial().length;

    agregarServicio(auto.id, "instalacion");
    assert.throws(() => agregarServicio(auto.id, "instalacion"), /ya tiene ese servicio/);

    assert.deepEqual(leerHistorial().slice(yaHabia).map(resumen), [
      {
        vehiculo_id: auto.id,
        servicio_id: auto.servicio("instalacion"),
        tipo_servicio: "instalacion",
        evento: "servicio_agregado",
        estado_anterior: null,
        estado_nuevo: "esperando",
      },
    ]);
  });

  test("quitar un servicio anota en qué estado estaba; si es el último, no", () => {
    const auto = crearAuto(["polarizado", "vitrificado"]);
    const vitrificado = auto.servicio("vitrificado");
    const polarizado = auto.servicio("polarizado");
    cambiarEstado(vitrificado, "en_proceso");
    const yaHabia = leerHistorial().length;

    assert.equal(quitarServicio(vitrificado), true);
    assert.throws(() => quitarServicio(polarizado), /no puede quedar sin servicios/);

    assert.deepEqual(leerHistorial().slice(yaHabia).map(resumen), [
      {
        vehiculo_id: auto.id,
        servicio_id: vitrificado,
        tipo_servicio: "vitrificado",
        evento: "servicio_quitado",
        estado_anterior: "en_proceso",
        estado_nuevo: null,
      },
    ]);
  });

  test("cada fila lleva fecha y hora con el formato de SQLite (UTC)", () => {
    const auto = crearAuto(["polarizado"]);
    cambiarEstado(auto.servicio("polarizado"), "en_proceso");
    retirarVehiculo(auto.id);

    const filas = leerHistorial();
    assert.equal(filas.length, 4);
    for (const { fecha } of filas) {
      assert.match(fecha, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }
  });
});
