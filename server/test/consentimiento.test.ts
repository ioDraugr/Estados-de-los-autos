// Casilla "Acepta recibir mensajes por WhatsApp" (vehiculos.ts), contra una base
// descartable (ver ayudas.ts).
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
  DATOS_AUTO,
  crearVehiculo,
  db,
  editarVehiculo,
  limpiarBase,
  listarTodos,
} from "./ayudas.js";

// Lo que quedó guardado en la base (0/1).
function guardado(id: number): number {
  return (
    db.prepare("SELECT acepta_whatsapp FROM vehiculos WHERE id = ?").get(id) as {
      acepta_whatsapp: number;
    }
  ).acepta_whatsapp;
}

describe("consentimiento para mensajes de post-venta", () => {
  beforeEach(limpiarBase);

  test("el alta guarda lo que se marcó; sin el dato, queda en no", () => {
    const si = crearVehiculo({ ...DATOS_AUTO, acepta_whatsapp: true }, ["polarizado"]);
    const no = crearVehiculo({ ...DATOS_AUTO, acepta_whatsapp: false }, ["polarizado"]);
    const sinDato = crearVehiculo(DATOS_AUTO, ["polarizado"]);
    assert.equal(guardado(si), 1);
    assert.equal(guardado(no), 0);
    assert.equal(guardado(sinDato), 0);
  });

  test("la edición lo cambia solo si viene", () => {
    const id = crearVehiculo({ ...DATOS_AUTO, acepta_whatsapp: true }, ["polarizado"]);
    editarVehiculo(id, { ...DATOS_AUTO, modelo: "Etios" });
    assert.equal(guardado(id), 1);
    editarVehiculo(id, { ...DATOS_AUTO, acepta_whatsapp: false });
    assert.equal(guardado(id), 0);
    editarVehiculo(id, { ...DATOS_AUTO, acepta_whatsapp: true });
    assert.equal(guardado(id), 1);
  });

  test("algo que no es sí/no se rechaza y no se guarda nada", () => {
    for (const valor of ["si", 1, null]) {
      assert.throws(
        () => crearVehiculo({ ...DATOS_AUTO, acepta_whatsapp: valor }, ["polarizado"]),
        /tiene que ser sí o no/,
      );
    }
    const id = crearVehiculo({ ...DATOS_AUTO, acepta_whatsapp: true }, ["polarizado"]);
    assert.throws(() => editarVehiculo(id, { ...DATOS_AUTO, acepta_whatsapp: "no" }), /sí o no/);
    assert.equal(guardado(id), 1);
  });

  test("la lista con PIN lo trae como booleano; sin PIN, ni aparece", () => {
    const id = crearVehiculo({ ...DATOS_AUTO, acepta_whatsapp: true }, ["polarizado"]);
    const [conPin] = listarTodos({ incluirTelefono: true });
    assert.equal(conPin.id, id);
    assert.equal(conPin.acepta_whatsapp, true);
    const [sinPin] = listarTodos();
    assert.ok(!("acepta_whatsapp" in sinPin));
  });
});
