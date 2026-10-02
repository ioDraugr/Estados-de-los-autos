// Frases de la bienvenida del showroom: el ajuste (lista, una frase por línea en
// config) y GET /api/frases, pública y con solo las frases.
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";
import express from "express";
import {
  AJUSTES,
  db,
  frasesBienvenida,
  guardarAjustes,
  leerAjuste,
  listarAjustes,
  rutaFrases,
} from "./ayudas.js";

const CLAVE = "frases_bienvenida";

function borrarFrases(): void {
  db.prepare("DELETE FROM config WHERE clave = ?").run(CLAVE);
}

// Lo que quedó guardado en config, tal cual.
function crudo(): string | undefined {
  const fila = db.prepare("SELECT valor FROM config WHERE clave = ?").get(CLAVE) as
    | { valor: string }
    | undefined;
  return fila?.valor;
}

describe("ajuste de frases de la bienvenida", () => {
  beforeEach(borrarFrases);

  test("sin nada guardado, valen las de fábrica, en el grupo del showroom", () => {
    const definicion = AJUSTES.find((a) => a.clave === CLAVE);
    assert.ok(definicion && definicion.tipo === "lista");
    const frases = leerAjuste(CLAVE);
    assert.ok(frases.length >= 2);
    assert.deepEqual(frases, definicion.porDefecto);
    assert.ok(frases.every((frase) => frase.length > 0 && frase.length <= definicion.maxLargo));

    const ajuste = listarAjustes().find((a) => a.clave === CLAVE);
    assert.equal(ajuste?.grupo, "showroom");
    assert.equal(ajuste?.tipo, "lista");
    assert.deepEqual(ajuste?.valor, definicion.porDefecto);
  });

  test("se guarda una por línea, sin espacios de más ni frases vacías", () => {
    guardarAjustes({ [CLAVE]: ["  Hola   de nuevo ", "", "   ", "Dos\nlíneas", "Última"] });
    assert.deepEqual(leerAjuste(CLAVE), ["Hola de nuevo", "Dos líneas", "Última"]);
    assert.equal(crudo(), "Hola de nuevo\nDos líneas\nÚltima");
  });

  test("vacía se guarda vacía (no vuelve a las de fábrica)", () => {
    guardarAjustes({ [CLAVE]: [] });
    assert.deepEqual(leerAjuste(CLAVE), []);
    guardarAjustes({ [CLAVE]: ["  ", ""] });
    assert.deepEqual(leerAjuste(CLAVE), []);
    assert.deepEqual(frasesBienvenida(), { frases: [] });
  });

  test("rechaza lo que no es lista de textos, demasiadas y demasiado largas", () => {
    guardarAjustes({ [CLAVE]: ["Primera"] });
    for (const valor of ["Una frase", 3, null, [1, 2], ["a", null], { frases: ["a"] }]) {
      assert.throws(() => guardarAjustes({ [CLAVE]: valor }), /lista de textos/);
    }
    assert.throws(
      () => guardarAjustes({ [CLAVE]: Array.from({ length: 11 }, (_, i) => `Frase ${i}`) }),
      /hasta 10 frases/,
    );
    guardarAjustes({ [CLAVE]: Array.from({ length: 10 }, (_, i) => `Frase ${i}`) });
    assert.equal(leerAjuste(CLAVE).length, 10);

    assert.throws(() => guardarAjustes({ [CLAVE]: ["a".repeat(81)] }), /hasta 80 caracteres/);
    guardarAjustes({ [CLAVE]: ["a".repeat(80)] });
    assert.deepEqual(leerAjuste(CLAVE), ["a".repeat(80)]);
  });

  test("lo guardado a mano que no sirve cae en las de fábrica", () => {
    db.prepare("INSERT INTO config (clave, valor) VALUES (?, ?)").run(CLAVE, "b".repeat(81));
    const definicion = AJUSTES.find((a) => a.clave === CLAVE);
    assert.deepEqual(leerAjuste(CLAVE), definicion?.porDefecto);
  });
});

describe("GET /api/frases", () => {
  let base = "";
  let cerrar: () => void = () => {};

  // Solo la ruta, en un server descartable en un puerto libre: sin exigirPin ni
  // nada más delante, como en index.ts.
  before(async () => {
    const app = express();
    app.use(rutaFrases);
    const server = app.listen(0);
    await new Promise<void>((listo) => server.once("listening", () => listo()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    cerrar = () => server.close();
  });
  after(() => cerrar());
  beforeEach(borrarFrases);

  test("es pública: responde sin PIN, con solo las frases", async () => {
    guardarAjustes({ [CLAVE]: ["Gracias por venir", "Preguntá por el polarizado"] });
    const res = await fetch(`${base}/api/frases`);
    assert.equal(res.status, 200);
    const cuerpo = await res.json();
    assert.deepEqual(cuerpo, { frases: ["Gracias por venir", "Preguntá por el polarizado"] });
    assert.deepEqual(Object.keys(cuerpo), ["frases"]);
  });

  test("sin nada guardado devuelve las de fábrica; vacía, una lista vacía", async () => {
    const definicion = AJUSTES.find((a) => a.clave === CLAVE);
    assert.deepEqual(await (await fetch(`${base}/api/frases`)).json(), {
      frases: definicion?.porDefecto,
    });
    guardarAjustes({ [CLAVE]: [] });
    assert.deepEqual(await (await fetch(`${base}/api/frases`)).json(), { frases: [] });
  });
});
