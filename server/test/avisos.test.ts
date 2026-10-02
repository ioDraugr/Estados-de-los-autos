// Máquina de estados de los avisos por WhatsApp (avisos.ts), contra una base
// descartable y con envíos de mentira (ver ayudas.ts).
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
  agregarServicio,
  cambiarEstado,
  consola,
  crearAuto,
  DATOS_AUTO,
  db,
  despacharPendientes,
  editarVehiculo,
  enviadorFalso,
  ErrorDefinitivo,
  guardarAjustes,
  leerAviso,
  leerAvisos,
  limpiarBase,
  quitarServicio,
  retirarVehiculo,
  vencerPendientes,
} from "./ayudas.js";
import type { TipoServicio } from "../src/tipos.js";

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

describe("programar y cancelar", () => {
  beforeEach(limpiarBase);

  test("el alta programa 'ingreso' y el despachador lo manda una sola vez", async () => {
    const auto = crearAuto(["polarizado"]);
    assert.equal(leerAviso(auto.id, "ingreso")?.estado, "pendiente");

    const envio = enviadorFalso();
    await despacharPendientes(envio);
    vencerPendientes();
    await despacharPendientes(envio);

    const ingreso = leerAviso(auto.id, "ingreso");
    assert.equal(ingreso?.estado, "enviado");
    assert.ok(ingreso?.enviado_en);
    assert.equal(envio.enviados.length, 1);
    assert.match(envio.enviados[0].texto, /Toyota Corolla ya ingresó/);
  });

  test("retirar el auto antes del envío cancela 'ingreso' y no sale nada", async () => {
    const auto = crearAuto(["polarizado"]);
    retirarVehiculo(auto.id);
    assert.equal(leerAviso(auto.id, "ingreso")?.estado, "cancelado");

    const envio = enviadorFalso();
    await despacharPendientes(envio);
    assert.equal(leerAviso(auto.id, "ingreso")?.estado, "cancelado");
    assert.deepEqual(envio.enviados, []);
  });

  test("'en_proceso' se cancela si vuelven a 'esperando' y se reprograma al arrancar otra vez", () => {
    const auto = crearAuto(["polarizado"]);
    const polarizado = auto.servicio("polarizado");

    cambiarEstado(polarizado, "en_proceso");
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "pendiente");
    cambiarEstado(polarizado, "esperando");
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "cancelado");
    cambiarEstado(polarizado, "en_proceso");
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "pendiente");
  });

  test("si todo se termina antes del envío, sale solo 'listo' y 'en_proceso' queda cancelado", async () => {
    const auto = crearAuto(["instalacion", "polarizado"]);
    await despacharPendientes(enviadorFalso()); // sale el "entró"

    cambiarEstado(auto.servicio("instalacion"), "en_proceso");
    cambiarEstado(auto.servicio("instalacion"), "terminado");
    cambiarEstado(auto.servicio("polarizado"), "terminado");

    const envio = enviadorFalso();
    await despacharPendientes(envio);
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "cancelado");
    assert.equal(leerAviso(auto.id, "listo")?.estado, "enviado");
    assert.equal(envio.enviados.length, 1);
    assert.match(envio.enviados[0].texto, /está listo/);
  });

  test("'listo' ya enviado no se vuelve a mandar si reabren y terminan de nuevo", async () => {
    const auto = crearAuto(["vitrificado"]);
    const vitrificado = auto.servicio("vitrificado");
    cambiarEstado(vitrificado, "terminado");
    await despacharPendientes(enviadorFalso()); // salen "entró" y "listo"
    const enviado = leerAviso(auto.id, "listo");
    assert.equal(enviado?.estado, "enviado");

    cambiarEstado(vitrificado, "en_proceso");
    cambiarEstado(vitrificado, "terminado");
    assert.deepEqual(leerAviso(auto.id, "listo"), enviado);

    const envio = enviadorFalso();
    vencerPendientes();
    await despacharPendientes(envio);
    assert.ok(!envio.enviados.some((e) => /está listo/.test(e.texto)));
  });

  test("agregar un servicio cancela 'listo'; quitar el único sin terminar lo programa", () => {
    const auto = crearAuto(["instalacion"]);
    cambiarEstado(auto.servicio("instalacion"), "terminado");
    assert.equal(leerAviso(auto.id, "listo")?.estado, "pendiente");

    agregarServicio(auto.id, "polarizado");
    assert.equal(leerAviso(auto.id, "listo")?.estado, "cancelado");

    quitarServicio(auto.servicio("polarizado"));
    assert.equal(leerAviso(auto.id, "listo")?.estado, "pendiente");
  });

  test("sin celular queda 'sin_telefono'; con celular y un cambio nuevo se reprograma", async () => {
    const auto = crearAuto(["polarizado"], null);
    const polarizado = auto.servicio("polarizado");
    cambiarEstado(polarizado, "en_proceso");

    const envio = enviadorFalso();
    await despacharPendientes(envio);
    assert.equal(leerAviso(auto.id, "ingreso")?.estado, "sin_telefono");
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "sin_telefono");
    // length y no deepEqual(…, []): deepEqual estrecha el tipo a never[] y
    // `envio` se sigue usando abajo.
    assert.equal(envio.enviados.length, 0);

    // Cargar el celular solo no alcanza: hace falta un cambio de servicios.
    editarVehiculo(auto.id, { ...DATOS_AUTO, telefono: "099 123 456" });
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "sin_telefono");
    cambiarEstado(polarizado, "esperando");
    cambiarEstado(polarizado, "en_proceso");
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "pendiente");

    await despacharPendientes(envio);
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "enviado");
    // "Entró" no se reprograma nunca.
    assert.equal(leerAviso(auto.id, "ingreso")?.estado, "sin_telefono");
    assert.deepEqual(
      envio.enviados.map((e) => e.telefono),
      ["+59899123456"],
    );
  });
});

describe("despachador", () => {
  beforeEach(limpiarBase);

  test("un error común cuenta el intento y lo reprograma para dentro de 1 minuto", async () => {
    const auto = crearAuto(["polarizado"]);
    await despacharPendientes(enviadorFalso(() => new Error("sin señal")));

    assert.deepEqual(resumen(auto.id, "ingreso"), {
      estado: "pendiente",
      intentos: 1,
      ultimo_error: "sin señal",
    });
    // enviar_en se corrió 60 s (la base guarda segundos enteros).
    const { segundos } = db
      .prepare(
        `SELECT (julianday(enviar_en) - julianday('now')) * 86400 AS segundos
         FROM avisos WHERE vehiculo_id = ? AND tipo = 'ingreso'`,
      )
      .get(auto.id) as { segundos: number };
    assert.ok(segundos > 55 && segundos <= 60, `faltan ${segundos} s`);
  });

  test("un ErrorDefinitivo lo deja 'fallido' al primer intento", async () => {
    const auto = crearAuto(["polarizado"]);
    await despacharPendientes(enviadorFalso(() => new ErrorDefinitivo("no tiene WhatsApp")));
    assert.deepEqual(resumen(auto.id, "ingreso"), {
      estado: "fallido",
      intentos: 1,
      ultimo_error: "no tiene WhatsApp",
    });
  });

  test("un aviso que falla no frena al siguiente", async () => {
    const primero = crearAuto(["polarizado"], "099 123 456");
    const segundo = crearAuto(["polarizado"], "098 765 432");

    const envio = enviadorFalso((telefono) =>
      telefono === "+59899123456" ? new Error("sin señal") : undefined,
    );
    await despacharPendientes(envio);

    assert.equal(leerAviso(primero.id, "ingreso")?.intentos, 1);
    assert.equal(leerAviso(primero.id, "ingreso")?.estado, "pendiente");
    assert.equal(leerAviso(segundo.id, "ingreso")?.estado, "enviado");
    assert.deepEqual(
      envio.enviados.map((e) => e.telefono),
      ["+59898765432"],
    );
  });

  test("al vencer vuelve a mirar el auto: si ya no corresponde, se cancela", async () => {
    const auto = crearAuto(["polarizado"]);
    await despacharPendientes(enviadorFalso()); // sale el "entró"
    cambiarEstado(auto.servicio("polarizado"), "en_proceso");

    // El servicio vuelve a "esperando" por fuera de cambiarEstado, sin pasar por
    // evaluarAvisos: el aviso sigue pendiente y es el despachador el que se da
    // cuenta al ir a mandarlo.
    db.prepare("UPDATE servicios SET estado = 'esperando' WHERE id = ?").run(
      auto.servicio("polarizado"),
    );
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "pendiente");

    const envio = enviadorFalso();
    await despacharPendientes(envio);
    assert.equal(leerAviso(auto.id, "en_proceso")?.estado, "cancelado");
    assert.deepEqual(envio.enviados, []);
  });
});

describe("envío no listo", () => {
  beforeEach(limpiarBase);

  test("mientras el envío no está listo, la cola no se toca y no se manda nada", async () => {
    crearAuto(["polarizado"]);
    vencerPendientes();
    const antes = leerAvisos();

    const envio = { ...enviadorFalso(), listo: () => false };
    await despacharPendientes(envio);

    assert.deepEqual(leerAvisos(), antes);
    assert.deepEqual(envio.enviados, []);
  });

  test("en la consola avisa solo cuando cambia (listo <-> no listo), no en cada pasada", async () => {
    // Lo que recuerda "cómo estaba la vez anterior" vive en avisos.ts y lo
    // comparten todos los tests del archivo. En vez de agregarle a avisos.ts un
    // reset solo para tests, se arranca con una pasada con el envío listo: así
    // queda en "listo" sin importar qué dejó un test anterior, y recién ahí se
    // empieza a contar.
    await despacharPendientes(enviadorFalso());
    consola.log.mock.resetCalls();

    let listo = true;
    const envio = { ...enviadorFalso(), listo: () => listo };
    for (const valor of [false, false, true, true]) {
      listo = valor;
      await despacharPendientes(envio);
    }

    const cambios = consola.log.mock.calls
      .map((llamada) => String(llamada.arguments[0]))
      .filter((linea) => linea.startsWith('[aviso] El envío "falso"'));
    assert.equal(cambios.length, 2);
    assert.match(cambios[0], /no está listo/);
    assert.match(cambios[1], /está listo: se retoman/);
  });
});

describe("cuidados en el aviso de listo", () => {
  // Textos cortos y conocidos, para comparar el mensaje entero.
  beforeEach(() => {
    limpiarBase();
    guardarAjustes({
      cuidados_instalacion: "Probá que todo ande.",
      cuidados_polarizado: "No bajes las ventanillas.",
      cuidados_vitrificado: "No lo laves por 7 días.",
    });
  });

  const SALUDO = "¡Tu Toyota Corolla está listo! Ya podés pasar a buscarlo por ML Center.";

  // Termina todos los servicios del auto y manda lo vencido; devuelve los
  // textos que salieron con "está listo".
  async function mandarListo(auto: ReturnType<typeof crearAuto>, tipos: TipoServicio[]) {
    for (const tipo of tipos) cambiarEstado(auto.servicio(tipo), "terminado");
    const envio = enviadorFalso();
    await despacharPendientes(envio);
    return envio.enviados.map((e) => e.texto).filter((texto) => /está listo/.test(texto));
  }

  test("con un servicio, el listo lleva sus cuidados después de una línea en blanco", async () => {
    const auto = crearAuto(["polarizado"]);
    assert.deepEqual(await mandarListo(auto, ["polarizado"]), [
      `${SALUDO}\n\nCuidados del polarizado:\nNo bajes las ventanillas.`,
    ]);
  });

  test("con los tres, sale UN solo mensaje con los tres bloques en orden fijo", async () => {
    // Cargados en otro orden a propósito: el mensaje sigue instalación,
    // polarizado, vitrificado.
    const tipos: TipoServicio[] = ["vitrificado", "instalacion", "polarizado"];
    const auto = crearAuto(tipos);
    assert.deepEqual(await mandarListo(auto, tipos), [
      [
        SALUDO,
        "Cuidados de la instalación:\nProbá que todo ande.",
        "Cuidados del polarizado:\nNo bajes las ventanillas.",
        "Cuidados del vitrificado:\nNo lo laves por 7 días.",
      ].join("\n\n"),
    ]);
    assert.equal(leerAviso(auto.id, "listo")?.estado, "enviado");
  });

  test("un servicio repetido en la base suma sus cuidados una sola vez", async () => {
    const auto = crearAuto(["polarizado"]);
    db.prepare(
      "INSERT INTO servicios (vehiculo_id, tipo, estado) VALUES (?, 'polarizado', 'terminado')",
    ).run(auto.id);
    assert.deepEqual(await mandarListo(auto, ["polarizado"]), [
      `${SALUDO}\n\nCuidados del polarizado:\nNo bajes las ventanillas.`,
    ]);
  });

  test("con el texto vacío, ese bloque no va", async () => {
    guardarAjustes({ cuidados_instalacion: "" });
    const auto = crearAuto(["instalacion", "vitrificado"]);
    assert.deepEqual(await mandarListo(auto, ["instalacion", "vitrificado"]), [
      `${SALUDO}\n\nCuidados del vitrificado:\nNo lo laves por 7 días.`,
    ]);

    // Todos vacíos: queda el saludo solo, sin líneas en blanco al final.
    guardarAjustes({ cuidados_vitrificado: "" });
    const otro = crearAuto(["instalacion", "vitrificado"]);
    assert.deepEqual(await mandarListo(otro, ["instalacion", "vitrificado"]), [SALUDO]);
  });

  test("un servicio quitado no suma sus cuidados", async () => {
    const auto = crearAuto(["instalacion", "polarizado"]);
    cambiarEstado(auto.servicio("instalacion"), "terminado");
    quitarServicio(auto.servicio("polarizado"));
    assert.deepEqual(await mandarListo(auto, []), [
      `${SALUDO}\n\nCuidados de la instalación:\nProbá que todo ande.`,
    ]);
  });

  test("el texto se lee al enviar: un cambio vale para el aviso que ya esperaba", async () => {
    const auto = crearAuto(["vitrificado"]);
    cambiarEstado(auto.servicio("vitrificado"), "terminado");
    assert.equal(leerAviso(auto.id, "listo")?.estado, "pendiente");

    guardarAjustes({ cuidados_vitrificado: "Texto nuevo." });
    assert.deepEqual(await mandarListo(auto, []), [
      `${SALUDO}\n\nCuidados del vitrificado:\nTexto nuevo.`,
    ]);
  });

  test("'entró' y 'ya arrancamos' no llevan cuidados", async () => {
    const auto = crearAuto(["polarizado", "vitrificado"]);
    cambiarEstado(auto.servicio("polarizado"), "en_proceso");
    const envio = enviadorFalso();
    await despacharPendientes(envio);

    assert.equal(envio.enviados.length, 2);
    assert.ok(envio.enviados.every((e) => !/Cuidados/.test(e.texto)));
    assert.match(envio.enviados[0].texto, /ya ingresó/);
    assert.match(envio.enviados[1].texto, /Ya arrancamos/);
  });
});
