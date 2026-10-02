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

describe("ajustes de post-venta (sí/no y texto)", () => {
  beforeEach(borrarAjustes);

  test("sin nada guardado, valen los de fábrica, cada uno con su tipo", () => {
    assert.equal(leerAjuste("postventa_resena_activa"), true);
    assert.equal(leerAjuste("postventa_mantenimiento_activo"), true);
    assert.equal(leerAjuste("postventa_domingos"), false);
    assert.equal(leerAjuste("postventa_resena_dias"), 3);
    assert.equal(leerAjuste("postventa_mantenimiento_meses"), 6);
    assert.equal(leerAjuste("postventa_hora_desde"), 10);
    assert.equal(leerAjuste("postventa_hora_hasta"), 19);
    assert.equal(leerAjuste("postventa_espaciado_min"), 3);
    assert.equal(leerAjuste("postventa_resena_link"), "");
    assert.match(leerAjuste("postventa_resena_texto"), /reseña acá: \{link\}/);
    assert.match(leerAjuste("postventa_mantenimiento_texto"), /\{marca\} \{modelo\}/);

    const porClave = new Map(listarAjustes().map((a) => [a.clave, a]));
    assert.equal(porClave.get("horas_visible_terminado")?.grupo, "showroom");
    assert.equal(porClave.get("postventa_domingos")?.tipo, "booleano");
    assert.equal(porClave.get("postventa_resena_texto")?.tipo, "texto");
    assert.equal(porClave.get("postventa_resena_link")?.valor, "");
    assert.ok(
      listarAjustes()
        .filter((a) => a.clave.startsWith("postventa_"))
        .every((a) => a.grupo === "postventa"),
    );
  });

  test("sí/no: se guarda y se lee como booleano; otra cosa se rechaza", () => {
    guardarAjustes({ postventa_resena_activa: false, postventa_domingos: true });
    assert.equal(leerAjuste("postventa_resena_activa"), false);
    assert.equal(leerAjuste("postventa_domingos"), true);
    for (const valor of [1, 0, "true", null]) {
      assert.throws(
        () => guardarAjustes({ postventa_domingos: valor }),
        /tiene que ser sí o no/,
      );
    }
  });

  test("texto: se guarda sin espacios en las puntas, con largo máximo y sin quedar vacío", () => {
    guardarAjustes({ postventa_resena_texto: "  Hola {marca} {modelo}: {link}  " });
    assert.equal(leerAjuste("postventa_resena_texto"), "Hola {marca} {modelo}: {link}");

    assert.throws(() => guardarAjustes({ postventa_resena_texto: "   " }), /no puede quedar vacío/);
    assert.throws(
      () => guardarAjustes({ postventa_mantenimiento_texto: "a".repeat(601) }),
      /hasta 600 letras/,
    );
    assert.throws(() => guardarAjustes({ postventa_resena_texto: 5 }), /tiene que ser un texto/);
    assert.equal(leerAjuste("postventa_resena_texto"), "Hola {marca} {modelo}: {link}");
  });

  test("link: vacío está permitido; si no, tiene que ser http(s)", () => {
    guardarAjustes({ postventa_resena_link: "https://g.page/r/ml-center/review" });
    assert.equal(leerAjuste("postventa_resena_link"), "https://g.page/r/ml-center/review");
    guardarAjustes({ postventa_resena_link: "" });
    assert.equal(leerAjuste("postventa_resena_link"), "");

    for (const valor of ["g.page/r/ml-center", "ftp://algo.com", "javascript:alert(1)", "https://"]) {
      assert.throws(
        () => guardarAjustes({ postventa_resena_link: valor }),
        /tiene que ser un link/,
        valor,
      );
    }
  });

  test("rangos de los enteros de post-venta", () => {
    assert.throws(() => guardarAjustes({ postventa_resena_dias: 0 }), /entre 1 y 60/);
    assert.throws(() => guardarAjustes({ postventa_resena_dias: 61 }), /entre 1 y 60/);
    assert.throws(() => guardarAjustes({ postventa_mantenimiento_meses: 37 }), /entre 1 y 36/);
    assert.throws(() => guardarAjustes({ postventa_hora_desde: 24 }), /entre 0 y 23/);
    assert.throws(() => guardarAjustes({ postventa_hora_hasta: 0 }), /entre 1 y 24/);
    assert.throws(() => guardarAjustes({ postventa_espaciado_min: 121 }), /entre 0 y 120/);
    guardarAjustes({ postventa_espaciado_min: 0, postventa_mantenimiento_meses: 36 });
    assert.equal(leerAjuste("postventa_espaciado_min"), 0);
  });

  test("horario: 'desde' tiene que ser antes que 'hasta', juntos o contra lo guardado", () => {
    assert.throws(
      () => guardarAjustes({ postventa_hora_desde: 15, postventa_hora_hasta: 15 }),
      /desde.*antes que.*hasta/,
    );
    // Solo "desde", contra el "hasta" de fábrica (19).
    assert.throws(() => guardarAjustes({ postventa_hora_desde: 19 }), /no cierra/);
    guardarAjustes({ postventa_hora_desde: 8 });
    // Solo "hasta", contra el "desde" ya guardado (8).
    assert.throws(() => guardarAjustes({ postventa_hora_hasta: 8 }), /no cierra/);
    guardarAjustes({ postventa_hora_hasta: 24 });
    // Los dos juntos pueden moverse a la vez aunque uno solo no cerraría.
    guardarAjustes({ postventa_hora_desde: 20, postventa_hora_hasta: 22 });
    assert.equal(leerAjuste("postventa_hora_desde"), 20);
    assert.equal(leerAjuste("postventa_hora_hasta"), 22);
  });

  test("lo guardado a mano que no sirve cae en el de por defecto", () => {
    const guardar = db.prepare("INSERT INTO config (clave, valor) VALUES (?, ?)");
    guardar.run("postventa_domingos", "quizás");
    guardar.run("postventa_resena_link", "no es un link");
    guardar.run("postventa_hora_desde", "");
    assert.equal(leerAjuste("postventa_domingos"), false);
    assert.equal(leerAjuste("postventa_resena_link"), "");
    assert.equal(leerAjuste("postventa_hora_desde"), 10);
  });
});
