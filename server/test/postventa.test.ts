// Mensajes de post-venta (postventa.ts + el despachador de avisos.ts): se
// programan al retirar y salen solo en horario, espaciados y a quien aceptó.
// Contra una base descartable y con envíos de mentira (ver ayudas.ts). El
// horario se prueba con un reloj fijo: despacharPendientes(envio, reloj).
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
  AJUSTES,
  crearAuto,
  DATOS_AUTO,
  db,
  despacharPendientes,
  enviadorFalso,
  guardarAjustes,
  leerAviso,
  limpiarBase,
  quitarServicio,
  retirarVehiculo,
  vencerPendientes,
} from "./ayudas.js";
import type { TipoServicio } from "../src/tipos.js";

const LINK = "https://g.page/r/ml-center/review";

// Relojes fijos, en hora local (lo que usa el despachador). El 1/10/2026 es
// jueves y el 4/10/2026, domingo.
const jueves = (hora: number, minuto = 0) => () => new Date(2026, 9, 1, hora, minuto);
const domingo = (hora: number) => () => new Date(2026, 9, 4, hora);
const EN_HORARIO = jueves(12);

// Deja los ajustes de post-venta como de fábrica, pero con el link cargado.
function ajustesDeFabrica(): void {
  const borrar = db.prepare("DELETE FROM config WHERE clave = ?");
  for (const { clave } of AJUSTES) borrar.run(clave);
  guardarAjustes({ postventa_resena_link: LINK });
}

// Da de alta un auto (con celular y consentimiento, salvo que se diga otra
// cosa), lo retira y devuelve su id.
function retirado(
  servicios: TipoServicio[] = ["polarizado"],
  { telefono = "099 123 456" as string | null, acepta = true } = {},
): number {
  const { id } = crearAuto(servicios, telefono, acepta);
  retirarVehiculo(id);
  return id;
}

// Cuántos segundos faltan para que venza el aviso, contra una fecha de SQLite.
function segundosContra(vehiculoId: number, tipo: string, referencia: string): number {
  const { segundos } = db
    .prepare(
      `SELECT (julianday(enviar_en) - julianday(datetime('now', ?))) * 86400 AS segundos
       FROM avisos WHERE vehiculo_id = ? AND tipo = ?`,
    )
    .get(referencia, vehiculoId, tipo) as { segundos: number };
  return Math.abs(segundos);
}

describe("programar al retirar", () => {
  beforeEach(() => {
    limpiarBase();
    ajustesDeFabrica();
  });

  test("sin vitrificado: solo la reseña, a los 3 días del retiro", () => {
    const id = retirado(["polarizado", "instalacion"]);
    assert.equal(leerAviso(id, "resena")?.estado, "pendiente");
    assert.ok(segundosContra(id, "resena", "+3 days") < 5);
    assert.equal(leerAviso(id, "mantenimiento"), undefined);
    // Los del taller pendientes sí se cancelan, como siempre.
    assert.equal(leerAviso(id, "ingreso")?.estado, "cancelado");
  });

  test("con vitrificado: también el mantenimiento, a los 6 meses", () => {
    const id = retirado(["vitrificado", "polarizado"]);
    assert.equal(leerAviso(id, "resena")?.estado, "pendiente");
    assert.equal(leerAviso(id, "mantenimiento")?.estado, "pendiente");
    assert.ok(segundosContra(id, "mantenimiento", "+6 months") < 5);
  });

  test("un vitrificado quitado no cuenta", () => {
    const auto = crearAuto(["vitrificado", "polarizado"]);
    quitarServicio(auto.servicio("vitrificado"));
    retirarVehiculo(auto.id);
    assert.equal(leerAviso(auto.id, "mantenimiento"), undefined);
  });

  test("los días y meses se toman al retirar: cambiarlos vale para los próximos", () => {
    const antes = retirado(["vitrificado"]);
    guardarAjustes({ postventa_resena_dias: 10, postventa_mantenimiento_meses: 12 });
    const despues = retirado(["vitrificado"]);
    assert.ok(segundosContra(antes, "resena", "+3 days") < 5);
    assert.ok(segundosContra(antes, "mantenimiento", "+6 months") < 5);
    assert.ok(segundosContra(despues, "resena", "+10 days") < 5);
    assert.ok(segundosContra(despues, "mantenimiento", "+12 months") < 5);
  });

  test("se programa aunque esté desactivado o el cliente no haya aceptado (se decide al mandar)", () => {
    guardarAjustes({ postventa_resena_activa: false });
    const id = retirado(["vitrificado"], { telefono: null, acepta: false });
    assert.equal(leerAviso(id, "resena")?.estado, "pendiente");
    assert.equal(leerAviso(id, "mantenimiento")?.estado, "pendiente");
  });

  test("retirar dos veces no programa de nuevo", () => {
    const id = retirado();
    const primero = leerAviso(id, "resena");
    assert.equal(retirarVehiculo(id), false);
    assert.deepEqual(leerAviso(id, "resena"), primero);
  });
});

describe("despacho de post-venta", () => {
  beforeEach(() => {
    limpiarBase();
    ajustesDeFabrica();
  });

  test("dentro del horario sale con el texto configurado, sin la matrícula", async () => {
    const id = retirado(["vitrificado"]);
    vencerPendientes();
    guardarAjustes({ postventa_espaciado_min: 0 });

    const envio = enviadorFalso();
    await despacharPendientes(envio, EN_HORARIO);

    assert.equal(leerAviso(id, "resena")?.estado, "enviado");
    assert.equal(leerAviso(id, "mantenimiento")?.estado, "enviado");
    assert.equal(envio.enviados.length, 2);
    const [resena, mantenimiento] = envio.enviados.map((e) => e.texto);
    assert.equal(
      resena,
      `¡Hola! Gracias por confiar en ML Center con tu Toyota Corolla. Si te gustó el trabajo, nos ayudás mucho dejándonos una reseña acá: ${LINK}`,
    );
    assert.match(mantenimiento, /vitrificado de tu Toyota Corolla/);
    for (const { texto, telefono } of envio.enviados) {
      assert.equal(telefono, "+59899123456");
      assert.ok(!texto.includes(DATOS_AUTO.matricula) && !texto.includes("1234"), texto);
    }
  });

  test("un texto cambiado vale al instante, con sus marcadores", async () => {
    const id = retirado();
    vencerPendientes();
    guardarAjustes({ postventa_resena_texto: "{modelo} de {marca}: {link} ({marca})" });

    const envio = enviadorFalso();
    await despacharPendientes(envio, EN_HORARIO);
    assert.equal(leerAviso(id, "resena")?.estado, "enviado");
    assert.equal(envio.enviados[0].texto, `Corolla de Toyota: ${LINK} (Toyota)`);
  });

  test("fuera de horario no sale y espera sin gastar intentos", async () => {
    const id = retirado();
    vencerPendientes();
    const envio = enviadorFalso();

    for (const reloj of [jueves(9, 59), jueves(19), jueves(23), jueves(3)]) {
      await despacharPendientes(envio, reloj);
    }
    assert.equal(envio.enviados.length, 0);
    assert.deepEqual(
      { estado: leerAviso(id, "resena")?.estado, intentos: leerAviso(id, "resena")?.intentos },
      { estado: "pendiente", intentos: 0 },
    );

    // A las 10 en punto ya sale.
    await despacharPendientes(envio, jueves(10));
    assert.equal(leerAviso(id, "resena")?.estado, "enviado");
  });

  test("el horario configurado manda (desde incluido, hasta no)", async () => {
    guardarAjustes({ postventa_hora_desde: 8, postventa_hora_hasta: 9 });
    const id = retirado();
    vencerPendientes();
    const envio = enviadorFalso();

    await despacharPendientes(envio, jueves(9));
    assert.equal(leerAviso(id, "resena")?.estado, "pendiente");
    await despacharPendientes(envio, jueves(8, 30));
    assert.equal(leerAviso(id, "resena")?.estado, "enviado");
  });

  test("domingo no sale, salvo que se permita", async () => {
    const id = retirado();
    vencerPendientes();
    const envio = enviadorFalso();

    await despacharPendientes(envio, domingo(12));
    assert.equal(leerAviso(id, "resena")?.estado, "pendiente");
    assert.equal(envio.enviados.length, 0);

    guardarAjustes({ postventa_domingos: true });
    await despacharPendientes(envio, domingo(12));
    assert.equal(leerAviso(id, "resena")?.estado, "enviado");
  });

  test("entre dos de post-venta pasa al menos el espaciado; los del taller no esperan", async () => {
    const primero = retirado();
    const segundo = retirado();
    vencerPendientes();

    const envio = enviadorFalso();
    await despacharPendientes(envio, EN_HORARIO);
    // Sale uno solo (el más viejo); el otro queda pendiente, sin intentos.
    assert.equal(leerAviso(primero, "resena")?.estado, "enviado");
    assert.deepEqual(
      { estado: leerAviso(segundo, "resena")?.estado, intentos: leerAviso(segundo, "resena")?.intentos },
      { estado: "pendiente", intentos: 0 },
    );

    // Un aviso del taller sale aunque la post-venta esté esperando.
    const enTaller = crearAuto(["polarizado"]);
    await despacharPendientes(envio, EN_HORARIO);
    assert.equal(leerAviso(enTaller.id, "ingreso")?.estado, "enviado");
    assert.equal(leerAviso(segundo, "resena")?.estado, "pendiente");

    // Pasados los 3 minutos, sale el segundo.
    db.prepare(
      "UPDATE avisos SET enviado_en = datetime('now', '-4 minutes') WHERE vehiculo_id = ? AND tipo = 'resena'",
    ).run(primero);
    await despacharPendientes(envio, EN_HORARIO);
    assert.equal(leerAviso(segundo, "resena")?.estado, "enviado");
    assert.equal(envio.enviados.length, 3);
  });

  test("con espaciado 0 salen todos en la misma pasada", async () => {
    guardarAjustes({ postventa_espaciado_min: 0 });
    const ids = [retirado(), retirado(), retirado()];
    vencerPendientes();
    await despacharPendientes(enviadorFalso(), EN_HORARIO);
    for (const id of ids) assert.equal(leerAviso(id, "resena")?.estado, "enviado");
  });

  test("desactivado: queda cancelado con el motivo anotado", async () => {
    guardarAjustes({
      postventa_resena_activa: false,
      postventa_mantenimiento_activo: false,
      postventa_espaciado_min: 0,
    });
    const id = retirado(["vitrificado"]);
    vencerPendientes();
    const envio = enviadorFalso();
    await despacharPendientes(envio, EN_HORARIO);

    assert.equal(envio.enviados.length, 0);
    assert.equal(leerAviso(id, "resena")?.estado, "cancelado");
    assert.match(leerAviso(id, "resena")?.ultimo_error ?? "", /reseña está desactivado/);
    assert.equal(leerAviso(id, "mantenimiento")?.estado, "cancelado");
    assert.match(leerAviso(id, "mantenimiento")?.ultimo_error ?? "", /mantenimiento está desactivado/);
  });

  test("desactivado fuera de horario: espera (se decide recién en horario)", async () => {
    guardarAjustes({ postventa_resena_activa: false });
    const id = retirado();
    vencerPendientes();
    await despacharPendientes(enviadorFalso(), domingo(12));
    assert.equal(leerAviso(id, "resena")?.estado, "pendiente");

    // Lo vuelven a activar antes de que abra el horario: sale.
    guardarAjustes({ postventa_resena_activa: true });
    const envio = enviadorFalso();
    await despacharPendientes(envio, EN_HORARIO);
    assert.equal(leerAviso(id, "resena")?.estado, "enviado");
  });

  test("sin consentimiento: cancelado, 'el cliente no aceptó mensajes'", async () => {
    const id = retirado(["vitrificado"], { acepta: false });
    vencerPendientes();
    const envio = enviadorFalso();
    await despacharPendientes(envio, EN_HORARIO);

    assert.equal(envio.enviados.length, 0);
    for (const tipo of ["resena", "mantenimiento"] as const) {
      assert.equal(leerAviso(id, tipo)?.estado, "cancelado");
      assert.equal(leerAviso(id, tipo)?.ultimo_error, "el cliente no aceptó mensajes");
    }
  });

  test("sin link, la reseña se cancela; el mantenimiento sale igual", async () => {
    guardarAjustes({ postventa_resena_link: "" });
    const id = retirado(["vitrificado"]);
    vencerPendientes();
    const envio = enviadorFalso();
    await despacharPendientes(envio, EN_HORARIO);

    assert.equal(leerAviso(id, "resena")?.estado, "cancelado");
    assert.match(leerAviso(id, "resena")?.ultimo_error ?? "", /no hay link/);
    assert.equal(leerAviso(id, "mantenimiento")?.estado, "enviado");
    assert.equal(envio.enviados.length, 1);
  });

  test("sin celular: queda sin_telefono, como los avisos del taller", async () => {
    const id = retirado(["polarizado"], { telefono: null });
    vencerPendientes();
    const envio = enviadorFalso();
    await despacharPendientes(envio, EN_HORARIO);
    assert.equal(leerAviso(id, "resena")?.estado, "sin_telefono");
    assert.equal(envio.enviados.length, 0);
  });

  test("si el envío falla, se reintenta como cualquier aviso", async () => {
    const id = retirado();
    vencerPendientes();
    await despacharPendientes(enviadorFalso(() => new Error("sin señal")), EN_HORARIO);
    const aviso = leerAviso(id, "resena");
    assert.equal(aviso?.estado, "pendiente");
    assert.equal(aviso?.intentos, 1);
    assert.equal(aviso?.ultimo_error, "sin señal");
  });
});

describe("avisos del taller sin cambios", () => {
  beforeEach(() => {
    limpiarBase();
    ajustesDeFabrica();
  });

  test("salen fuera de horario, en domingo y sin consentimiento", async () => {
    const auto = crearAuto(["polarizado"], "099 123 456", false);
    const envio = enviadorFalso();
    await despacharPendientes(envio, domingo(3));
    assert.equal(leerAviso(auto.id, "ingreso")?.estado, "enviado");
    assert.equal(envio.enviados.length, 1);
  });

  test("el retiro les sigue cancelando los pendientes y su motivo no se anota", async () => {
    const auto = crearAuto(["polarizado"]);
    retirarVehiculo(auto.id);
    const ingreso = leerAviso(auto.id, "ingreso");
    assert.equal(ingreso?.estado, "cancelado");
    assert.equal(ingreso?.ultimo_error, null);
  });
});
