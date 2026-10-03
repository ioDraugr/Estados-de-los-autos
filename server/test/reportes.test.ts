// Reportes para el dueño: su PIN propio (auth.ts), las rutas de /reportes
// (rutaReportes.ts) y las métricas (reportes.ts), contra una base descartable
// (ver ayudas.ts). El historial de cada auto se reescribe a mano con fechas
// fijas, así los números no dependen de cuándo corre el test.
//
// Hora local: Montevideo (UTC-3 todo el año, sin cambio de horario). Los
// períodos se arman en hora local y el historial guarda UTC, así que un evento
// del domingo 23:30 local cae el lunes en UTC: los bordes se prueban con eso.
process.env.TZ = "America/Montevideo";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { NextFunction, Request, Response } from "express";
import { after, before, beforeEach, describe, test } from "node:test";
import express from "express";
import type { EstadoServicio, TipoServicio } from "../src/tipos.js";
import {
  cambiarPinReportes,
  crearPinReportes,
  crearVehiculo,
  DATOS_AUTO,
  db,
  exigirPinReportes,
  generarReporte,
  hayPinReportes,
  limitePin,
  limitePinReportes,
  limpiarBase,
  MAX_FALLIDOS,
  obtenerPin,
  obtenerPinReportes,
  rutaReportes,
  ultimosDigitos,
  verificarPin,
  verificarPinReportes,
} from "./ayudas.js";

const PIN_ADMIN = "1234";
const PIN_DUENO = "5678";

function sinPinDueno(): void {
  db.prepare("DELETE FROM config WHERE clave = 'pin_reportes'").run();
  db.prepare("UPDATE config SET valor = ? WHERE clave = 'pin'").run(PIN_ADMIN);
}

// "AAAA-MM-DD HH:MM" en hora local => texto UTC, como historial.fecha.
function utc(local: string): string {
  const [dia, hora] = local.split(" ");
  const [anio, mes, d] = dia.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  return new Date(anio, mes - 1, d, h, m).toISOString().slice(0, 19).replace("T", " ");
}

// Un paso del historial de un servicio: cambio de estado o quitarlo. `en` va en
// UTC (texto de historial.fecha).
type Paso =
  | { tipo: TipoServicio; estado: EstadoServicio; en: string }
  | { tipo: TipoServicio; quitado: true; en: string };

/**
 * Da de alta un auto con los servicios que aparecen en `pasos` y le reescribe
 * el historial: ingreso y servicios agregados en `ingreso` (UTC), y después
 * cada paso, en orden. Devuelve el id del auto.
 */
function autoConHistorial(ingreso: string, pasos: Paso[], matricula = "SBA 1234"): number {
  const tipos = [...new Set(pasos.map((p) => p.tipo))];
  const id = crearVehiculo({ ...DATOS_AUTO, matricula, telefono: null }, tipos);
  db.prepare("DELETE FROM historial WHERE vehiculo_id = ?").run(id);
  db.prepare("UPDATE vehiculos SET fecha_ingreso = ? WHERE id = ?").run(ingreso, id);

  const anotar = db.prepare(
    `INSERT INTO historial
       (vehiculo_id, servicio_id, tipo_servicio, evento, estado_anterior, estado_nuevo, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const servicio = (tipo: TipoServicio) =>
    (
      db
        .prepare("SELECT id FROM servicios WHERE vehiculo_id = ? AND tipo = ?")
        .get(id, tipo) as { id: number }
    ).id;

  anotar.run(id, null, null, "ingreso", null, null, ingreso);
  const estados = new Map<TipoServicio, EstadoServicio>();
  for (const tipo of tipos) {
    anotar.run(id, servicio(tipo), tipo, "servicio_agregado", null, "esperando", ingreso);
    estados.set(tipo, "esperando");
  }
  for (const paso of pasos) {
    const anterior = estados.get(paso.tipo) ?? null;
    if ("quitado" in paso) {
      anotar.run(id, servicio(paso.tipo), paso.tipo, "servicio_quitado", anterior, null, paso.en);
      db.prepare("UPDATE servicios SET eliminado_en = ? WHERE id = ?").run(
        paso.en,
        servicio(paso.tipo),
      );
    } else {
      anotar.run(id, servicio(paso.tipo), paso.tipo, "cambio_estado", anterior, paso.estado, paso.en);
      db.prepare("UPDATE servicios SET estado = ? WHERE id = ?").run(paso.estado, servicio(paso.tipo));
      estados.set(paso.tipo, paso.estado);
    }
  }
  return id;
}

// Llama al middleware con un pedido de mentira que trae `headers`.
function pasarPor(
  ip: string,
  headers: Record<string, string>,
): { status: number; cuerpo: unknown; siguio: boolean } {
  let status = 200;
  let cuerpo: unknown = null;
  let siguio = false;
  const req = { ip, header: (nombre: string) => headers[nombre] } as unknown as Request;
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
  exigirPinReportes(req, res, (() => (siguio = true)) as NextFunction);
  return { status, cuerpo, siguio };
}

describe("PIN del dueño (auth.ts)", () => {
  let n = 0;
  let ip = "";
  beforeEach(() => {
    ip = `10.1.0.${++n}`;
    sinPinDueno();
  });

  test("mientras no existe, no hay nada que lo abra (ni el de /admin) y no cuenta intentos", () => {
    assert.equal(hayPinReportes(), false);
    for (let i = 0; i < MAX_FALLIDOS + 1; i++) {
      assert.deepEqual(verificarPinReportes(ip, PIN_ADMIN), {
        status: 401,
        cuerpo: { error: "Todavía no hay PIN de reportes.", motivo: "sin_pin_reportes" },
      });
    }
    assert.equal(limitePinReportes.consultar(ip).bloqueado, false);
  });

  test("crearlo: de 4 a 8 números, distinto del de /admin, y una sola vez", () => {
    for (const nuevo of ["123", "123456789", "12a4", "", 5678, undefined]) {
      assert.throws(() => crearPinReportes(nuevo), /de 4 a 8 números/);
    }
    assert.throws(() => crearPinReportes(PIN_ADMIN), /no puede ser igual al de \/admin/);
    assert.equal(hayPinReportes(), false);

    assert.equal(crearPinReportes(PIN_DUENO), true);
    assert.equal(hayPinReportes(), true);
    assert.equal(obtenerPinReportes(), PIN_DUENO);

    // Ya existe: no se pisa.
    assert.equal(crearPinReportes("9999"), false);
    assert.equal(obtenerPinReportes(), PIN_DUENO);
  });

  test("el PIN de /admin no abre los reportes; el del dueño sí", () => {
    crearPinReportes(PIN_DUENO);
    assert.equal(verificarPinReportes(ip, PIN_ADMIN)?.status, 401);
    assert.equal(verificarPinReportes(ip, PIN_DUENO), null);

    assert.deepEqual(pasarPor(ip, { "x-pin-reportes": PIN_DUENO }), {
      status: 200,
      cuerpo: null,
      siguio: true,
    });
    assert.deepEqual(pasarPor(ip, { "x-pin-reportes": PIN_ADMIN }), {
      status: 401,
      cuerpo: { error: "PIN inválido" },
      siguio: false,
    });
    // El de /admin en su header de siempre tampoco sirve.
    assert.equal(pasarPor(ip, { "x-pin": PIN_ADMIN }).siguio, false);
    // Y el del dueño no abre /admin.
    assert.equal(verificarPin(ip, PIN_DUENO)?.status, 401);
  });

  test("5 mal bloquean /reportes en ese dispositivo, pero no /admin (limitador aparte)", () => {
    crearPinReportes(PIN_DUENO);
    for (let i = 1; i < MAX_FALLIDOS; i++) {
      assert.equal(verificarPinReportes(ip, "0000")?.status, 401);
    }
    assert.equal(verificarPinReportes(ip, "0000")?.status, 429);
    assert.equal(verificarPinReportes(ip, PIN_DUENO)?.status, 429);
    assert.equal(verificarPin(ip, PIN_ADMIN), null);
    // El login con el PIN bien pone la cuenta en cero (otra IP, sin bloqueo).
    const otra = `${ip}-login`;
    for (let i = 1; i < MAX_FALLIDOS; i++) verificarPinReportes(otra, "0000");
    assert.equal(verificarPinReportes(otra, PIN_DUENO, { reiniciarFallos: true }), null);
    assert.equal(verificarPinReportes(otra, "0000")?.status, 401);
  });

  test("cambiarlo: con el actual bien; distinto del actual y del de /admin", () => {
    crearPinReportes(PIN_DUENO);
    assert.throws(() => cambiarPinReportes(ip, PIN_DUENO, "12"), /de 4 a 8 números/);
    assert.throws(() => cambiarPinReportes(ip, PIN_DUENO, PIN_DUENO), /igual al actual/);
    assert.throws(
      () => cambiarPinReportes(ip, PIN_DUENO, PIN_ADMIN),
      /no puede ser igual al de \/admin/,
    );
    assert.equal(cambiarPinReportes(ip, PIN_DUENO, "24680"), null);
    assert.equal(obtenerPinReportes(), "24680");
    assert.equal(obtenerPin(), PIN_ADMIN);
  });

  test("cambiarlo: el actual mal cuenta para el bloqueo", () => {
    crearPinReportes(PIN_DUENO);
    for (let i = 1; i < MAX_FALLIDOS; i++) {
      assert.deepEqual(cambiarPinReportes(ip, "0000", "2468"), {
        status: 401,
        cuerpo: { error: "El PIN actual no es correcto", motivo: "pin_actual" },
      });
    }
    assert.equal(cambiarPinReportes(ip, "0000", "2468")?.status, 429);
    assert.equal(cambiarPinReportes(ip, PIN_DUENO, "2468")?.status, 429);
    assert.equal(obtenerPinReportes(), PIN_DUENO);
  });
});

describe("rutas de /reportes (HTTP)", () => {
  let base = "";
  let cerrar: () => void = () => {};

  // Solo el router, en un server descartable en un puerto libre, con el
  // express.json() que en index.ts va delante.
  before(async () => {
    const app = express();
    app.use(express.json());
    app.use(rutaReportes);
    const server = app.listen(0);
    await new Promise<void>((listo) => server.once("listening", () => listo()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    cerrar = () => server.close();
  });
  after(() => cerrar());
  beforeEach(() => {
    sinPinDueno();
    limpiarBase();
    // Todos los pedidos salen de la misma IP: que los fallos de un test no
    // bloqueen al siguiente.
    for (const ip of ["127.0.0.1", "::ffff:127.0.0.1"]) {
      limitePin.registrarExito(ip);
      limitePinReportes.registrarExito(ip);
    }
  });

  function pedir(ruta: string, opciones: { metodo?: string; headers?: Record<string, string>; cuerpo?: unknown } = {}) {
    return fetch(`${base}${ruta}`, {
      method: opciones.metodo ?? "GET",
      headers: { "content-type": "application/json", ...opciones.headers },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
  }

  test("crear el PIN pide el de /admin, no deja que sea igual, y una sola vez", async () => {
    assert.deepEqual(await (await pedir("/api/reportes/pin")).json(), { existe: false });

    const crear = (headers: Record<string, string>, nuevo: string) =>
      pedir("/api/reportes/pin", { metodo: "POST", headers, cuerpo: { nuevo } });

    assert.equal((await crear({}, PIN_DUENO)).status, 401);
    assert.equal((await crear({ "x-pin": "0000" }, PIN_DUENO)).status, 401);
    const igual = await crear({ "x-pin": PIN_ADMIN }, PIN_ADMIN);
    assert.equal(igual.status, 400);
    assert.match((await igual.json()).error, /igual al de \/admin/);
    assert.equal(hayPinReportes(), false);

    const creado = await crear({ "x-pin": PIN_ADMIN }, PIN_DUENO);
    assert.equal(creado.status, 201);
    assert.deepEqual(await (await pedir("/api/reportes/pin")).json(), { existe: true });

    const otraVez = await crear({ "x-pin": PIN_ADMIN }, "9999");
    assert.equal(otraVez.status, 409);
    assert.equal(obtenerPinReportes(), PIN_DUENO);
  });

  test("el reporte y el login se abren con el PIN del dueño, no con el de /admin", async () => {
    crearPinReportes(PIN_DUENO);
    const reporte = (headers: Record<string, string>) =>
      pedir("/api/reportes?periodo=semana&fecha=2026-10-01", { headers });

    assert.equal((await reporte({ "x-pin": PIN_ADMIN })).status, 401);
    assert.equal((await reporte({ "x-pin-reportes": PIN_ADMIN })).status, 401);
    const bien = await reporte({ "x-pin-reportes": PIN_DUENO });
    assert.equal(bien.status, 200);
    const cuerpo = await bien.json();
    assert.equal(cuerpo.etiqueta, "Semana del 28 sep al 4 oct");
    assert.equal(cuerpo.autosAtendidos.total, 0);

    const login = (pin: string) =>
      pedir("/api/reportes/login", { metodo: "POST", cuerpo: { pin } });
    assert.equal((await login(PIN_ADMIN)).status, 401);
    assert.deepEqual(await (await login(PIN_DUENO)).json(), { ok: true });
  });

  test("sin período ni fecha: la semana de hoy; con datos que no sirven, 400", async () => {
    crearPinReportes(PIN_DUENO);
    const headers = { "x-pin-reportes": PIN_DUENO };
    const hoy = await (await pedir("/api/reportes", { headers })).json();
    assert.equal(hoy.periodo, "semana");
    assert.equal(hoy.autosAtendidos.serie.length, 7);

    assert.equal((await pedir("/api/reportes?periodo=anio", { headers })).status, 400);
    assert.equal((await pedir("/api/reportes?fecha=2026-02-30", { headers })).status, 400);
  });

  test("cambiar el PIN del dueño", async () => {
    crearPinReportes(PIN_DUENO);
    const cambiar = (headers: Record<string, string>, actual: string, nuevo: string) =>
      pedir("/api/reportes/pin/cambiar", { metodo: "POST", headers, cuerpo: { actual, nuevo } });

    // Con el PIN de /admin no se entra.
    assert.equal((await cambiar({ "x-pin": PIN_ADMIN }, PIN_DUENO, "2468")).status, 401);
    const mal = await cambiar({ "x-pin-reportes": PIN_DUENO }, "0000", "2468");
    assert.equal(mal.status, 401);
    assert.equal((await mal.json()).motivo, "pin_actual");
    assert.equal((await cambiar({ "x-pin-reportes": PIN_DUENO }, PIN_DUENO, PIN_ADMIN)).status, 400);

    const bien = await cambiar({ "x-pin-reportes": PIN_DUENO }, PIN_DUENO, "2468");
    assert.equal(bien.status, 200);
    assert.equal(obtenerPinReportes(), "2468");
  });
});

describe("reporte (reportes.ts)", () => {
  beforeEach(limpiarBase);

  // Semana del lunes 28 sep al domingo 4 oct de 2026.
  function armarSemana() {
    // A: el polarizado vuelve atrás y re-termina: cuenta una vez, con la última vuelta (90 min).
    const a = autoConHistorial(utc("2026-09-28 09:00"), [
      { tipo: "polarizado", estado: "en_proceso", en: utc("2026-09-28 10:00") },
      { tipo: "polarizado", estado: "terminado", en: utc("2026-09-28 12:00") },
      { tipo: "polarizado", estado: "en_proceso", en: utc("2026-09-29 08:00") },
      { tipo: "polarizado", estado: "terminado", en: utc("2026-09-29 09:30") },
    ]);
    // B: el vitrificado se terminó pero lo quitaron: no cuenta para nada.
    const b = autoConHistorial(
      utc("2026-09-30 08:00"),
      [
        { tipo: "vitrificado", estado: "en_proceso", en: utc("2026-09-30 10:00") },
        { tipo: "instalacion", estado: "en_proceso", en: utc("2026-09-30 10:00") },
        { tipo: "vitrificado", estado: "terminado", en: utc("2026-09-30 11:00") },
        { tipo: "vitrificado", quitado: true, en: utc("2026-09-30 12:00") },
        { tipo: "instalacion", estado: "terminado", en: utc("2026-09-30 14:00") },
      ],
      "SCD 4589",
    );
    // C: terminó el polarizado (60 min) pero la instalación sigue: atendido, no terminado.
    const c = autoConHistorial(
      utc("2026-10-01 08:00"),
      [
        { tipo: "polarizado", estado: "en_proceso", en: utc("2026-10-01 09:00") },
        { tipo: "instalacion", estado: "en_proceso", en: utc("2026-10-01 09:00") },
        { tipo: "polarizado", estado: "terminado", en: utc("2026-10-01 10:00") },
      ],
      "SAB 7712",
    );
    return { a, b, c };
  }

  test("semana: atendidos, servicios por tipo, tiempos y los que más tardaron", () => {
    const { a, b } = armarSemana();
    const reporte = generarReporte("semana", "2026-10-01");

    assert.equal(reporte.periodo, "semana");
    assert.equal(reporte.desde, "2026-09-28");
    assert.equal(reporte.hasta, "2026-10-04");
    assert.equal(reporte.etiqueta, "Semana del 28 sep al 4 oct");
    assert.equal(reporte.fechaAnterior, "2026-09-21");
    assert.equal(reporte.fechaSiguiente, "2026-10-05");

    assert.equal(reporte.autosAtendidos.total, 3);
    assert.deepEqual(
      reporte.autosAtendidos.serie.map((b) => [b.etiqueta, b.desde, b.cantidad]),
      [
        ["Lun 28", "2026-09-28", 0],
        ["Mar 29", "2026-09-29", 1],
        ["Mié 30", "2026-09-30", 1],
        ["Jue 1", "2026-10-01", 1],
        ["Vie 2", "2026-10-02", 0],
        ["Sáb 3", "2026-10-03", 0],
        ["Dom 4", "2026-10-04", 0],
      ],
    );
    assert.deepEqual(reporte.serviciosPorTipo, [
      { tipo: "instalacion", cantidad: 1 },
      { tipo: "polarizado", cantidad: 2 },
      { tipo: "vitrificado", cantidad: 0 },
    ]);
    assert.deepEqual(reporte.tiempoPromedioPorTipo, [
      { tipo: "instalacion", minutosPromedio: 240, muestras: 1 },
      { tipo: "polarizado", minutosPromedio: 75, muestras: 2 },
      { tipo: "vitrificado", minutosPromedio: null, muestras: 0 },
    ]);
    // C no terminó: no está. A: 24 h 30 min desde el ingreso; B: 6 h.
    assert.deepEqual(reporte.autosQueMasTardaron, [
      {
        id: a,
        marca: "Toyota",
        modelo: "Corolla",
        color: "Gris",
        ultimosDigitos: "1234",
        minutos: 1470,
        tipos: ["polarizado"],
      },
      {
        id: b,
        marca: "Toyota",
        modelo: "Corolla",
        color: "Gris",
        ultimosDigitos: "4589",
        minutos: 360,
        tipos: ["instalacion"],
      },
    ]);
  });

  test("mes: el mismo historial, partido en septiembre y octubre", () => {
    armarSemana();
    const septiembre = generarReporte("mes", "2026-09-15");
    assert.equal(septiembre.etiqueta, "Septiembre 2026");
    assert.equal(septiembre.desde, "2026-09-01");
    assert.equal(septiembre.hasta, "2026-09-30");
    assert.equal(septiembre.fechaAnterior, "2026-08-01");
    assert.equal(septiembre.fechaSiguiente, "2026-10-01");
    // Semanas de lunes a domingo, recortadas al mes (el 1 de septiembre es martes).
    assert.deepEqual(
      septiembre.autosAtendidos.serie.map((b) => [b.etiqueta, b.desde, b.hasta, b.cantidad]),
      [
        ["1–6", "2026-09-01", "2026-09-06", 0],
        ["7–13", "2026-09-07", "2026-09-13", 0],
        ["14–20", "2026-09-14", "2026-09-20", 0],
        ["21–27", "2026-09-21", "2026-09-27", 0],
        ["28–30", "2026-09-28", "2026-09-30", 2],
      ],
    );
    assert.equal(septiembre.autosAtendidos.total, 2);
    assert.equal(septiembre.autosQueMasTardaron.length, 2);

    const octubre = generarReporte("mes", "2026-10-31");
    assert.equal(octubre.etiqueta, "Octubre 2026");
    assert.equal(octubre.autosAtendidos.total, 1);
    assert.deepEqual(octubre.serviciosPorTipo.map((s) => s.cantidad), [0, 1, 0]);
    assert.deepEqual(octubre.autosQueMasTardaron, []);
    assert.equal(octubre.autosAtendidos.serie.at(-1)?.etiqueta, "26–31");
  });

  test("borde de semana en hora local (no en UTC)", () => {
    // Domingo 27 sep 23:59:59 local = lunes 28 02:59:59 UTC: semana anterior.
    autoConHistorial("2026-09-28 01:00:00", [
      { tipo: "polarizado", estado: "terminado", en: "2026-09-28 02:59:59" },
    ]);
    // Lunes 28 00:00 local = 03:00 UTC: esta semana, el lunes.
    autoConHistorial("2026-09-28 01:00:00", [
      { tipo: "instalacion", estado: "terminado", en: "2026-09-28 03:00:00" },
    ]);
    // Domingo 4 oct 23:30 local = lunes 5 02:30 UTC: esta semana, el domingo.
    autoConHistorial("2026-10-04 12:00:00", [
      { tipo: "vitrificado", estado: "terminado", en: "2026-10-05 02:30:00" },
    ]);

    const semana = generarReporte("semana", "2026-09-30");
    assert.equal(semana.autosAtendidos.total, 2);
    assert.deepEqual(semana.serviciosPorTipo.map((s) => s.cantidad), [1, 0, 1]);
    const serie = semana.autosAtendidos.serie;
    assert.equal(serie[0].cantidad, 1); // Lun 28
    assert.equal(serie[6].cantidad, 1); // Dom 4

    const anterior = generarReporte("semana", "2026-09-27");
    assert.equal(anterior.desde, "2026-09-21");
    assert.deepEqual(anterior.serviciosPorTipo.map((s) => s.cantidad), [0, 1, 0]);
    assert.equal(anterior.autosAtendidos.serie[6].cantidad, 1); // Dom 27

    assert.equal(generarReporte("semana", "2026-10-05").autosAtendidos.total, 0);
  });

  test("borde de mes en hora local (no en UTC)", () => {
    // 30 sep 23:00 local = 1 oct 02:00 UTC: septiembre.
    autoConHistorial("2026-09-30 12:00:00", [
      { tipo: "polarizado", estado: "terminado", en: "2026-10-01 02:00:00" },
    ]);
    // 31 oct 23:00 local = 1 nov 02:00 UTC: octubre.
    autoConHistorial("2026-10-31 12:00:00", [
      { tipo: "vitrificado", estado: "terminado", en: "2026-11-01 02:00:00" },
    ]);

    const octubre = generarReporte("mes", "2026-10-10");
    assert.deepEqual(octubre.serviciosPorTipo.map((s) => s.cantidad), [0, 0, 1]);
    assert.equal(octubre.autosAtendidos.serie.at(-1)?.cantidad, 1);
    // Ingreso 31 oct 09:00 local (12:00 UTC) => terminado 23:00 local: 14 h.
    assert.equal(octubre.autosQueMasTardaron[0]?.minutos, 840);

    const septiembre = generarReporte("mes", "2026-09-01");
    assert.deepEqual(septiembre.serviciosPorTipo.map((s) => s.cantidad), [0, 1, 0]);
    assert.equal(septiembre.autosAtendidos.serie.at(-1)?.cantidad, 1);

    assert.equal(generarReporte("mes", "2026-11-01").autosAtendidos.total, 0);
  });

  test("terminado sin pasar por en_proceso: cuenta, pero no suma al promedio", () => {
    autoConHistorial(utc("2026-09-29 08:00"), [
      { tipo: "polarizado", estado: "en_proceso", en: utc("2026-09-29 09:00") },
      { tipo: "polarizado", estado: "terminado", en: utc("2026-09-29 10:00") },
      // Vuelve a esperando y termina directo: la última vuelta no tiene arranque.
      { tipo: "polarizado", estado: "esperando", en: utc("2026-09-29 11:00") },
      { tipo: "polarizado", estado: "terminado", en: utc("2026-09-29 12:00") },
    ]);
    const reporte = generarReporte("semana", "2026-09-29");
    assert.deepEqual(reporte.serviciosPorTipo.map((s) => s.cantidad), [0, 1, 0]);
    assert.deepEqual(reporte.tiempoPromedioPorTipo[1], {
      tipo: "polarizado",
      minutosPromedio: null,
      muestras: 0,
    });
    assert.equal(reporte.autosQueMasTardaron[0]?.minutos, 240);
  });

  test("un auto que terminó y después recibió otro servicio: terminado en su semana, no en la siguiente", () => {
    const id = autoConHistorial(utc("2026-09-29 08:00"), [
      { tipo: "polarizado", estado: "en_proceso", en: utc("2026-09-29 09:00") },
      { tipo: "polarizado", estado: "terminado", en: utc("2026-09-29 10:00") },
      { tipo: "instalacion", estado: "en_proceso", en: utc("2026-10-06 09:00") },
      { tipo: "instalacion", estado: "terminado", en: utc("2026-10-06 11:00") },
    ]);
    // La instalación se agregó la semana siguiente (no en el alta).
    db.prepare(
      "UPDATE historial SET fecha = ? WHERE vehiculo_id = ? AND evento = 'servicio_agregado' AND tipo_servicio = 'instalacion'",
    ).run(utc("2026-10-06 08:00"), id);

    const primera = generarReporte("semana", "2026-09-29");
    assert.deepEqual(primera.autosQueMasTardaron.map((a) => [a.minutos, a.tipos]), [
      [120, ["polarizado"]],
    ]);
    const segunda = generarReporte("semana", "2026-10-06");
    assert.equal(segunda.autosAtendidos.total, 1);
    // Ahora terminó todo: desde el ingreso de la semana anterior.
    assert.deepEqual(segunda.autosQueMasTardaron.map((a) => [a.minutos, a.tipos]), [
      [7 * 24 * 60 + 180, ["instalacion", "polarizado"]],
    ]);
  });

  test("los que más tardaron: solo 5, de más a menos, y nunca la matrícula entera", () => {
    const matriculas = ["SAA 1001", "SAB 1002", "SAC 1003", "SAD 1004", "SAE 1005", "SAF-1006"];
    matriculas.forEach((matricula, i) => {
      autoConHistorial(
        utc("2026-09-29 08:00"),
        [{ tipo: "polarizado", estado: "terminado", en: utc(`2026-09-29 ${10 + i}:00`) }],
        matricula,
      );
    });
    const reporte = generarReporte("semana", "2026-09-29");
    assert.equal(reporte.autosAtendidos.total, 6);
    assert.deepEqual(
      reporte.autosQueMasTardaron.map((a) => [a.ultimosDigitos, a.minutos]),
      [
        ["1006", 420],
        ["1005", 360],
        ["1004", 300],
        ["1003", 240],
        ["1002", 180],
      ],
    );
    const json = JSON.stringify(reporte);
    for (const matricula of matriculas) {
      assert.equal(json.includes(matricula), false);
      assert.equal(json.includes(matricula.replace(/\s|-/g, "")), false);
    }
    assert.equal(ultimosDigitos("SBA 1234"), "1234");
  });

  test("período o fecha que no sirven: error de validación", () => {
    assert.throws(() => generarReporte("anio", "2026-10-01"), /semana o mes/);
    for (const fecha of ["2026-02-30", "2026-13-01", "01/10/2026", "", undefined]) {
      assert.throws(() => generarReporte("semana", fecha), /AAAA-MM-DD/);
    }
  });
});
