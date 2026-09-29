// Límite de intentos de PIN (intentosPin.ts) y cambio de PIN (auth.ts), contra
// una base descartable (ver ayudas.ts). El limitador se prueba con un reloj de
// mentira; lo de auth.ts usa el limitador real, con una IP distinta por test
// para que los fallos de uno no bloqueen al siguiente.
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, test } from "node:test";
import {
  cambiarPin,
  crearLimitador,
  db,
  exigirPin,
  MAX_FALLIDOS,
  MINUTOS_BLOQUEO,
  MINUTOS_OLVIDO,
  obtenerPin,
  verificarPin,
} from "./ayudas.js";

const MINUTO = 60 * 1000;
const PIN = "1234";

// Reloj que avanza solo cuando el test lo pide.
function relojFalso(): { ahora: () => number; avanzar: (ms: number) => void } {
  let ms = 1_000_000;
  return { ahora: () => ms, avanzar: (delta) => (ms += delta) };
}

describe("límite de intentos (por IP)", () => {
  test("5 fallos seguidos bloquean 5 minutos, con los minutos que faltan", () => {
    const reloj = relojFalso();
    const limite = crearLimitador(reloj.ahora);
    for (let i = 1; i < MAX_FALLIDOS; i++) {
      assert.deepEqual(limite.registrarFallo("A"), { bloqueado: false });
    }
    assert.deepEqual(limite.registrarFallo("A"), {
      bloqueado: true,
      minutosRestantes: MINUTOS_BLOQUEO,
    });
    // Los minutos se redondean para arriba: a los 30 s todavía faltan 5.
    reloj.avanzar(30 * 1000);
    assert.deepEqual(limite.consultar("A"), { bloqueado: true, minutosRestantes: 5 });
    reloj.avanzar(3 * MINUTO);
    assert.deepEqual(limite.consultar("A"), { bloqueado: true, minutosRestantes: 2 });
  });

  test("al vencer el bloqueo la cuenta arranca de cero", () => {
    const reloj = relojFalso();
    const limite = crearLimitador(reloj.ahora);
    for (let i = 0; i < MAX_FALLIDOS; i++) limite.registrarFallo("A");
    // Más fallos durante el bloqueo no lo estiran.
    reloj.avanzar(4 * MINUTO);
    limite.registrarFallo("A");
    reloj.avanzar(1 * MINUTO);
    assert.deepEqual(limite.consultar("A"), { bloqueado: false });
    // De cero: hacen falta otros 5 para volver a bloquear.
    for (let i = 1; i < MAX_FALLIDOS; i++) {
      assert.equal(limite.registrarFallo("A").bloqueado, false);
    }
    assert.equal(limite.registrarFallo("A").bloqueado, true);
  });

  test("un acierto vuelve la cuenta a cero", () => {
    const limite = crearLimitador(relojFalso().ahora);
    for (let i = 1; i < MAX_FALLIDOS; i++) limite.registrarFallo("A");
    limite.registrarExito("A");
    for (let i = 1; i < MAX_FALLIDOS; i++) {
      assert.equal(limite.registrarFallo("A").bloqueado, false);
    }
    assert.equal(limite.registrarFallo("A").bloqueado, true);
  });

  test("cada IP tiene su cuenta: bloquear una no bloquea a las otras", () => {
    const limite = crearLimitador(relojFalso().ahora);
    for (let i = 0; i < MAX_FALLIDOS; i++) limite.registrarFallo("A");
    for (let i = 1; i < MAX_FALLIDOS; i++) limite.registrarFallo("B");
    assert.equal(limite.consultar("A").bloqueado, true);
    assert.equal(limite.consultar("B").bloqueado, false);
    assert.equal(limite.consultar("C").bloqueado, false);
  });

  test("se olvidan los bloqueos vencidos y las IPs que hace rato no prueban", () => {
    const reloj = relojFalso();
    const limite = crearLimitador(reloj.ahora);
    for (let i = 0; i < MAX_FALLIDOS; i++) limite.registrarFallo("bloqueada");
    limite.registrarFallo("un-fallo");
    assert.equal(limite.cantidad(), 2);

    // Pasado el bloqueo, el próximo intento de otra IP limpia la bloqueada.
    reloj.avanzar(MINUTOS_BLOQUEO * MINUTO);
    limite.registrarFallo("otra");
    assert.equal(limite.cantidad(), 2);

    // Pasado el tiempo de olvido, también la que tenía un solo fallo.
    reloj.avanzar(MINUTOS_OLVIDO * MINUTO);
    limite.registrarFallo("otra-mas");
    assert.equal(limite.cantidad(), 1);
  });
});

describe("PIN con límite (auth.ts)", () => {
  let n = 0;
  let ip = "";
  beforeEach(() => {
    ip = `10.0.0.${++n}`;
    db.prepare("UPDATE config SET valor = ? WHERE clave = 'pin'").run(PIN);
  });

  test("con el PIN bien pasa; mal da 401 y el quinto 429, aun con el PIN bien", () => {
    assert.equal(verificarPin(ip, PIN), null);
    for (let i = 1; i < MAX_FALLIDOS; i++) {
      assert.deepEqual(verificarPin(ip, "0000"), {
        status: 401,
        cuerpo: { error: "PIN inválido" },
      });
    }
    const quinto = verificarPin(ip, "0000");
    assert.equal(quinto?.status, 429);
    assert.equal(quinto?.cuerpo.minutosRestantes, MINUTOS_BLOQUEO);
    assert.match(quinto?.cuerpo.error ?? "", /Demasiados intentos\. Probá de nuevo en 5 min\./);
    assert.equal(verificarPin(ip, PIN)?.status, 429);
    // Otro dispositivo sigue entrando.
    assert.equal(verificarPin(`${ip}-otro`, PIN), null);
  });

  test("un PIN vacío no cuenta como intento", () => {
    for (let i = 0; i < MAX_FALLIDOS + 2; i++) {
      assert.equal(verificarPin(ip, "")?.status, 401);
      assert.equal(verificarPin(ip, undefined)?.status, 401);
    }
    assert.equal(verificarPin(ip, PIN), null);
  });

  test("exigirPin responde 401 / 429 o deja pasar", () => {
    const llamar = (pin: string) => {
      let status = 200;
      let cuerpo: unknown = null;
      let siguio = false;
      const req = { ip, header: () => pin } as unknown as Request;
      const res = {
        status(codigo: number) {
          status = codigo;
          return this;
        },
        json(datos: unknown) {
          cuerpo = datos;
          return this;
        },
      } as unknown as Response;
      exigirPin(req, res, (() => (siguio = true)) as NextFunction);
      return { status, cuerpo, siguio };
    };

    assert.deepEqual(llamar(PIN), { status: 200, cuerpo: null, siguio: true });
    assert.deepEqual(llamar("9"), {
      status: 401,
      cuerpo: { error: "PIN inválido" },
      siguio: false,
    });
    for (let i = 1; i < MAX_FALLIDOS; i++) llamar("9");
    const bloqueado = llamar(PIN);
    assert.equal(bloqueado.status, 429);
    assert.equal(bloqueado.siguio, false);
  });

  test("cambiar el PIN: con el actual bien y un nuevo válido, queda el nuevo", () => {
    assert.equal(cambiarPin(ip, PIN, "56789"), null);
    assert.equal(obtenerPin(), "56789");
    assert.equal(verificarPin(ip, PIN)?.status, 401);
    assert.equal(verificarPin(ip, "56789"), null);
  });

  test("cambiar el PIN: el nuevo tiene que tener de 4 a 8 números y ser distinto", () => {
    for (const nuevo of ["123", "123456789", "12a4", " 1234", "", 1234, undefined]) {
      assert.throws(() => cambiarPin(ip, PIN, nuevo), /de 4 a 8 números/);
    }
    assert.throws(() => cambiarPin(ip, PIN, PIN), /igual al actual/);
    assert.equal(obtenerPin(), PIN);
  });

  test("cambiar el PIN: el actual mal cuenta para el bloqueo", () => {
    for (let i = 1; i < MAX_FALLIDOS; i++) {
      assert.deepEqual(cambiarPin(ip, "0000", "5678"), {
        status: 401,
        cuerpo: { error: "El PIN actual no es correcto" },
      });
    }
    assert.equal(cambiarPin(ip, "0000", "5678")?.status, 429);
    // Bloqueado: ni con el actual bien se cambia, ni se entra.
    assert.equal(cambiarPin(ip, PIN, "5678")?.status, 429);
    assert.equal(verificarPin(ip, PIN)?.status, 429);
    assert.equal(obtenerPin(), PIN);
  });
});
