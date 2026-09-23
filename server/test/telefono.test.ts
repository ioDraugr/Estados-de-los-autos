// normalizarTelefono (telefono.ts). Módulo puro: se importa directo de ../src y
// no pasa por ayudas.ts, porque ni telefono.ts ni errores.ts tocan la base.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ErrorValidacion } from "../src/errores.js";
import { normalizarTelefono } from "../src/telefono.js";

const MENSAJE = "Teléfono inválido: usá un celular uruguayo, por ejemplo 099 123 456.";

describe("normalizarTelefono", () => {
  test("todas las formas de escribir un celular dan el mismo +598", () => {
    const formas = [
      "099 123 456",
      "99123456",
      "+598 99 123 456",
      "59899123456",
      "00598 99 123 456",
      "(099) 123-456",
      "099.123.456",
    ];
    for (const forma of formas) {
      assert.equal(normalizarTelefono(forma), "+59899123456", forma);
    }
  });

  test("sin dato o vacío => null (el teléfono es opcional)", () => {
    for (const vacio of [undefined, null, "", "   "]) {
      assert.equal(normalizarTelefono(vacio), null, JSON.stringify(vacio));
    }
  });

  test("lo que no es un celular uruguayo se rechaza con el motivo", () => {
    const invalidos: unknown[] = [
      "24001234", // fijo de Montevideo: no tiene WhatsApp
      "12345",
      "+54 11 1234 5678", // otro país
      "abc",
      "0991234567", // un dígito de más
      "+59809123456", // código de país y además el 0
      99123456, // número, no texto
      { telefono: "099 123 456" },
    ];
    for (const invalido of invalidos) {
      assert.throws(
        () => normalizarTelefono(invalido),
        (error) => error instanceof ErrorValidacion && error.message === MENSAJE,
        JSON.stringify(invalido),
      );
    }
  });
});
