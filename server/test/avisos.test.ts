// Máquina de estados de los avisos por WhatsApp (avisos.ts), contra una base
// descartable y con envíos de mentira (ver ayudas.ts).
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
  cambiarEstado,
  crearAuto,
  despacharPendientes,
  enviadorFalso,
  ErrorDefinitivo,
  leerAviso,
  limpiarBase,
  vencerPendientes,
} from "./ayudas.js";

// Los campos que dicen si un aviso quedó listo para otra ronda de intentos.
function resumen(vehiculoId: number, tipo: "ingreso" | "en_proceso" | "listo") {
  const aviso = leerAviso(vehiculoId, tipo);
  return aviso && {
    estado: aviso.estado,
    intentos: aviso.intentos,
    ultimo_error: aviso.ultimo_error,
  };
}

describe("aviso fallido", () => {
  beforeEach(limpiarBase);

  test("'en_proceso' que agotó los 5 intentos se reprograma cuando vuelve a corresponder", async () => {
    const auto = crearAuto(["polarizado"]);
    const polarizado = auto.servicio("polarizado");
    cambiarEstado(polarizado, "en_proceso");

    // Cinco pasadas con el envío caído: el aviso (y el de "entró") quedan fallidos.
    const caido = enviadorFalso(() => new Error("sin señal"));
    for (let pasada = 0; pasada < 5; pasada++) {
      vencerPendientes();
      await despacharPendientes(caido);
    }
    assert.deepEqual(resumen(auto.id, "en_proceso"), {
      estado: "fallido",
      intentos: 5,
      ultimo_error: "sin señal",
    });
    assert.equal(resumen(auto.id, "ingreso")?.estado, "fallido");

    // Lo vuelven a "esperando": deja de corresponder, pero fallido no se cancela.
    cambiarEstado(polarizado, "esperando");
    assert.equal(resumen(auto.id, "en_proceso")?.estado, "fallido");

    // Arrancan de nuevo: vuelve a corresponder y se programa de cero.
    cambiarEstado(polarizado, "en_proceso");
    assert.deepEqual(resumen(auto.id, "en_proceso"), {
      estado: "pendiente",
      intentos: 0,
      ultimo_error: null,
    });

    // "Entró" no se reprograma nunca: sigue fallido con sus intentos.
    assert.deepEqual(resumen(auto.id, "ingreso"), {
      estado: "fallido",
      intentos: 5,
      ultimo_error: "sin señal",
    });

    // Con el envío andando, sale solo el "ya arrancamos".
    const andando = enviadorFalso();
    await despacharPendientes(andando);
    assert.equal(resumen(auto.id, "en_proceso")?.estado, "enviado");
    assert.equal(andando.enviados.length, 1);
    assert.match(andando.enviados[0].texto, /Ya arrancamos/);
    assert.equal(andando.enviados[0].telefono, "+59899123456");
  });

  test("'listo' fallido por ErrorDefinitivo se reprograma si reabren y vuelven a terminar", async () => {
    const auto = crearAuto(["vitrificado"]);
    const vitrificado = auto.servicio("vitrificado");
    cambiarEstado(vitrificado, "terminado");

    await despacharPendientes(
      enviadorFalso(() => new ErrorDefinitivo("el número no tiene WhatsApp")),
    );
    assert.deepEqual(resumen(auto.id, "listo"), {
      estado: "fallido",
      intentos: 1,
      ultimo_error: "el número no tiene WhatsApp",
    });

    cambiarEstado(vitrificado, "en_proceso");
    assert.equal(resumen(auto.id, "listo")?.estado, "fallido");

    cambiarEstado(vitrificado, "terminado");
    assert.deepEqual(resumen(auto.id, "listo"), {
      estado: "pendiente",
      intentos: 0,
      ultimo_error: null,
    });
    assert.deepEqual(resumen(auto.id, "ingreso"), {
      estado: "fallido",
      intentos: 1,
      ultimo_error: "el número no tiene WhatsApp",
    });
  });

  test("con la condición todavía cierta, otro cambio de servicios también lo reprograma", async () => {
    // Decisión documentada en evaluarAvisos: no se distingue "volvió a cumplirse"
    // de "sigue cumpliéndose"; cualquier cambio que la deja cierta da otra ronda.
    const auto = crearAuto(["instalacion", "polarizado"]);
    cambiarEstado(auto.servicio("instalacion"), "en_proceso");
    await despacharPendientes(enviadorFalso(() => new ErrorDefinitivo("sin WhatsApp")));
    assert.equal(resumen(auto.id, "en_proceso")?.estado, "fallido");

    cambiarEstado(auto.servicio("polarizado"), "en_proceso");
    assert.deepEqual(resumen(auto.id, "en_proceso"), {
      estado: "pendiente",
      intentos: 0,
      ultimo_error: null,
    });
  });
});
