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
      /hasta 600 caracteres/,
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

describe("ajustes de texto (cuidados del aviso de listo)", () => {
  beforeEach(borrarAjustes);

  // La definición del ajuste, para comparar con su valor por defecto.
  const definicion = (clave: string) => {
    const encontrada = AJUSTES.find((ajuste) => ajuste.clave === clave);
    if (!encontrada) throw new Error(`No existe el ajuste ${clave}.`);
    return encontrada;
  };

  test("sin nada guardado, cada cuidado vale su texto inicial", () => {
    for (const clave of [
      "cuidados_instalacion",
      "cuidados_polarizado",
      "cuidados_vitrificado",
    ] as const) {
      const texto = leerAjuste(clave);
      assert.equal(typeof texto, "string");
      assert.ok(texto.length > 0);
      assert.equal(texto, definicion(clave).porDefecto);
    }
    assert.match(leerAjuste("cuidados_polarizado"), /^No bajes las ventanillas/);
  });

  test("aparecen en listarAjustes como 'texto', con su largo máximo y su valor", () => {
    guardarAjustes({ cuidados_vitrificado: "No lo laves por 7 días." });
    const vitrificado = listarAjustes().find((a) => a.clave === "cuidados_vitrificado");
    assert.ok(vitrificado);
    assert.equal(vitrificado.tipo, "texto");
    assert.equal(vitrificado.grupo, "cuidados");
    assert.equal(vitrificado.valor, "No lo laves por 7 días.");
    assert.ok(vitrificado.etiqueta.length > 0);
    assert.ok(vitrificado.ayuda.length > 0);
    assert.deepEqual(
      listarAjustes().map((a) => a.clave),
      [
        "horas_visible_terminado",
        "cuidados_instalacion",
        "cuidados_polarizado",
        "cuidados_vitrificado",
        "postventa_resena_activa",
        "postventa_resena_dias",
        "postventa_resena_link",
        "postventa_resena_texto",
        "postventa_mantenimiento_activo",
        "postventa_mantenimiento_meses",
        "postventa_mantenimiento_texto",
        "postventa_hora_desde",
        "postventa_hora_hasta",
        "postventa_domingos",
        "postventa_espaciado_min",
      ],
    );
    const { maxLargo } = definicion("cuidados_vitrificado") as { maxLargo: number };
    assert.equal(maxLargo, 800);
  });

  test("guarda y lee, sin los espacios de las puntas", () => {
    guardarAjustes({ cuidados_polarizado: "  No bajes las ventanillas.\nUsá paño suave.  \n" });
    assert.equal(leerAjuste("cuidados_polarizado"), "No bajes las ventanillas.\nUsá paño suave.");
  });

  test("vacío (o solo espacios) se guarda como vacío, no vuelve al inicial", () => {
    guardarAjustes({ cuidados_instalacion: "" });
    assert.equal(leerAjuste("cuidados_instalacion"), "");
    guardarAjustes({ cuidados_instalacion: "Algo" });
    guardarAjustes({ cuidados_instalacion: "   \n  " });
    assert.equal(leerAjuste("cuidados_instalacion"), "");
  });

  test("acepta hasta 800 caracteres (contados sin las puntas) y rechaza más", () => {
    const justo = "a".repeat(800);
    guardarAjustes({ cuidados_polarizado: `  ${justo}  ` });
    assert.equal(leerAjuste("cuidados_polarizado"), justo);

    assert.throws(
      () => guardarAjustes({ cuidados_polarizado: "a".repeat(801) }),
      /hasta 800 caracteres/,
    );
    assert.equal(leerAjuste("cuidados_polarizado"), justo);
  });

  test("rechaza lo que no es texto", () => {
    for (const valor of [3, null, true, ["a"], { texto: "a" }]) {
      assert.throws(
        () => guardarAjustes({ cuidados_vitrificado: valor }),
        /tiene que ser un texto/,
      );
    }
    assert.equal(leerAjuste("cuidados_vitrificado"), definicion("cuidados_vitrificado").porDefecto);
  });

  test("un texto guardado que no sirve (más largo, editado a mano) cae en el inicial", () => {
    db.prepare("INSERT INTO config (clave, valor) VALUES ('cuidados_instalacion', ?)").run(
      "a".repeat(801),
    );
    assert.equal(leerAjuste("cuidados_instalacion"), definicion("cuidados_instalacion").porDefecto);
  });

  test("entero y texto juntos: se guardan los dos o ninguno", () => {
    guardarAjustes({ horas_visible_terminado: 8, cuidados_polarizado: "Primero" });
    assert.equal(leerAjuste("horas_visible_terminado"), 8);
    assert.equal(leerAjuste("cuidados_polarizado"), "Primero");

    // El texto no sirve: tampoco se guardan las horas.
    assert.throws(
      () =>
        guardarAjustes({ horas_visible_terminado: 10, cuidados_polarizado: "a".repeat(801) }),
      /hasta 800 caracteres/,
    );
    // Las horas no sirven: tampoco se guarda el texto.
    assert.throws(
      () => guardarAjustes({ cuidados_polarizado: "Segundo", horas_visible_terminado: 0 }),
      /entre 1 y 72/,
    );
    assert.equal(leerAjuste("horas_visible_terminado"), 8);
    assert.equal(leerAjuste("cuidados_polarizado"), "Primero");
  });
});
