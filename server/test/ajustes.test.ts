// Registro de ajustes editables (ajustes.ts), contra una base descartable (ver
// ayudas.ts, que arranca con HORAS_VISIBLE_TERMINADO=6).
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
  AJUSTES,
  crearAuto,
  db,
  guardarAjustes,
  leerAjuste,
  limpiarBase,
  listarAjustes,
  listarVehiculosVisibles,
  obtenerPin,
} from "./ayudas.js";

// Deja los ajustes sin valor guardado (vuelven al valor por defecto).
function borrarAjustes(): void {
  const borrar = db.prepare("DELETE FROM config WHERE clave = ?");
  for (const { clave } of AJUSTES) borrar.run(clave);
}

// Marca todos los servicios del auto como terminados hace `horas` horas.
function terminarHace(vehiculoId: number, horas: number): void {
  db.prepare(
    `UPDATE servicios SET estado = 'terminado', actualizado_en = datetime('now', ?)
     WHERE vehiculo_id = ?`,
  ).run(`-${horas} hours`, vehiculoId);
}

describe("ajustes", () => {
  beforeEach(() => {
    limpiarBase();
    borrarAjustes();
  });

  test("sin nada guardado, el valor sale de la variable de entorno", () => {
    assert.equal(leerAjuste("horas_visible_terminado"), 6);
    const [horas] = listarAjustes();
    assert.equal(horas.clave, "horas_visible_terminado");
    assert.equal(horas.tipo, "entero");
    assert.equal(horas.porDefecto, 6);
    assert.equal(horas.valor, 6);
    assert.equal(horas.min, 1);
    assert.equal(horas.max, 72);
    assert.ok(horas.etiqueta.length > 0);
  });

  test("lo guardado manda sobre la variable de entorno", () => {
    guardarAjustes({ horas_visible_terminado: 12 });
    assert.equal(leerAjuste("horas_visible_terminado"), 12);
    assert.equal(listarAjustes()[0].valor, 12);
    guardarAjustes({ horas_visible_terminado: 1 });
    assert.equal(leerAjuste("horas_visible_terminado"), 1);
  });

  test("un valor guardado que no sirve (editado a mano) cae en el de por defecto", () => {
    db.prepare(
      "INSERT INTO config (clave, valor) VALUES ('horas_visible_terminado', 'muchas')",
    ).run();
    assert.equal(leerAjuste("horas_visible_terminado"), 6);
  });

  test("rechaza fuera de rango, no enteros y claves desconocidas", () => {
    for (const valor of [0, 73, -1]) {
      assert.throws(
        () => guardarAjustes({ horas_visible_terminado: valor }),
        /tiene que estar entre 1 y 72/,
      );
    }
    for (const valor of [2.5, "5", null, true]) {
      assert.throws(
        () => guardarAjustes({ horas_visible_terminado: valor }),
        /número entero/,
      );
    }
    assert.throws(() => guardarAjustes({ otra_cosa: 3 }), /Ajuste desconocido: otra_cosa/);
    assert.throws(() => guardarAjustes({}), /ningún ajuste/);
    assert.throws(() => guardarAjustes([4]), /clave: valor/);
    assert.throws(() => guardarAjustes(null), /clave: valor/);
    assert.equal(leerAjuste("horas_visible_terminado"), 6);
  });

  test("el PIN no se puede cambiar como ajuste", () => {
    const antes = obtenerPin();
    assert.throws(() => guardarAjustes({ pin: "9999" }), /Ajuste desconocido: pin/);
    assert.equal(obtenerPin(), antes);
    assert.ok(listarAjustes().every((ajuste) => ajuste.clave !== "pin"));
  });

  test("si un cambio no sirve, no se guarda ninguno (todo o nada)", () => {
    guardarAjustes({ horas_visible_terminado: 10 });
    assert.throws(
      () => guardarAjustes({ horas_visible_terminado: 20, desconocido: 1 }),
      /Ajuste desconocido/,
    );
    assert.equal(leerAjuste("horas_visible_terminado"), 10);
  });

  test("el showroom usa las horas guardadas, al instante", () => {
    const { id } = crearAuto(["polarizado"], null);
    terminarHace(id, 3);
    const visible = () => listarVehiculosVisibles().some((v) => v.id === id);

    // 6 h (entorno): terminado hace 3 h => se ve.
    assert.equal(visible(), true);
    // 2 h: ya pasó el tiempo => desaparece, sin reiniciar nada.
    guardarAjustes({ horas_visible_terminado: 2 });
    assert.equal(visible(), false);
    // 4 h: vuelve a aparecer.
    guardarAjustes({ horas_visible_terminado: 4 });
    assert.equal(visible(), true);
  });
});
