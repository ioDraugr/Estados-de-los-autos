// Modo presentación (demo.ts): tiempos comprimidos, horario y espaciado
// ignorados, semilla de 5 autos falsos y la guarda que impide tocar la base
// real. Este archivo arma su propio entorno (MODO_DEMO=1 y una base demo.db
// descartable) porque db.ts y demo.ts leen las env vars al importarse; por eso
// no usa ayudas.ts. Envíos de mentira, nunca se toca data/taller.db.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const carpeta = mkdtempSync(join(tmpdir(), "taller-demo-tests-"));
process.env.MODO_DEMO = "1";
process.env.DB_PATH = join(carpeta, "demo.db");
process.env.CARPETA_BACKUPS = join(carpeta, "backups");
delete process.env.AVISOS_DEMORA_MIN;
delete process.env.AVISOS_INTERVALO_SEG;
delete process.env.DEMO_RESENA_SEG;
delete process.env.DEMO_MANTENIMIENTO_SEG;

const { db } = await import("../src/db.js");
const demo = await import("../src/demo.js");
const { DEMORA_MIN, INTERVALO_SEG, despacharPendientes } = await import("../src/avisos.js");
const { sembrarSiVacia } = await import("../src/seed.js");
const { leerAjuste } = await import("../src/ajustes.js");
const { crearVehiculo, retirarVehiculo } = await import("../src/vehiculos.js");
const { cambiarEstado } = await import("../src/servicios.js");
const { horarioAbierto, espaciadoCumplido } = await import("../src/postventa.js");
const { ultimosDigitos, generarReporte, diaLocal } = await import("../src/reportes.js");
const { generarPlanHistorial } = await import("../src/demoHistorial.js");
const { listarVehiculosVisibles, listarTodos } = await import("../src/vehiculos.js");
const { verificarPinReportes } = await import("../src/auth.js");

console.log = () => {};
console.warn = () => {};

after(() => {
  db.close();
  rmSync(carpeta, { recursive: true, force: true });
});

const raiz = fileURLToPath(new URL("..", import.meta.url));

// Segundos que faltan para que venza el aviso (contra la hora de la base).
function segundosHasta(vehiculoId: number, tipo: string): number {
  const { segundos } = db
    .prepare(
      `SELECT (julianday(enviar_en) - julianday('now')) * 86400 AS segundos
       FROM avisos WHERE vehiculo_id = ? AND tipo = ?`,
    )
    .get(vehiculoId, tipo) as { segundos: number };
  return segundos;
}

describe("guarda de la base", () => {
  test("sin MODO_DEMO no valida nada", () => {
    demo.exigirBaseDemo(false, undefined, "/x/taller.db");
  });

  test("MODO_DEMO sin DB_PATH explícito se niega", () => {
    assert.throws(() => demo.exigirBaseDemo(true, undefined, "/x/taller.db"), /DB_PATH explícito/);
    assert.throws(() => demo.exigirBaseDemo(true, "  ", "/x/demo.db"), /DB_PATH explícito/);
  });

  test("MODO_DEMO solo acepta un archivo llamado demo.db", () => {
    assert.throws(() => demo.exigirBaseDemo(true, "/x/taller.db", "/x/taller.db"), /demo\.db/);
    demo.exigirBaseDemo(true, "/x/demo/demo.db", "/x/demo/demo.db");
  });

  const arrancar = (env: Record<string, string>) =>
    spawnSync(process.execPath, ["--import", "tsx", "-e", 'await import("./src/db.js")'], {
      cwd: raiz,
      env: { PATH: process.env.PATH ?? "", MODO_DEMO: "1", ...env },
      encoding: "utf8",
    });

  test("el server real no abre la base: sin DB_PATH sale con error y sin crear nada", () => {
    const r = arrancar({});
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /MODO_DEMO necesita DB_PATH/);
  });

  test("con DB_PATH que no es demo.db sale con error", () => {
    const otra = join(carpeta, "otra", "taller.db");
    const r = arrancar({ DB_PATH: otra });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /demo\.db/);
    assert.equal(basename(otra), "taller.db");
  });
});

describe("semilla demo", () => {
  test("carga 5 autos falsos, sin celular, con los tres conos y uno listo", () => {
    sembrarSiVacia();
    const autos = db.prepare("SELECT * FROM vehiculos WHERE retirado_en IS NULL ORDER BY id").all() as {
      id: number;
      matricula: string;
      telefono: string | null;
      acepta_whatsapp: number;
    }[];
    assert.equal(autos.length, 5);
    for (const a of autos) {
      assert.match(a.matricula, /^[A-Z]{3} \d{4}$/);
      assert.equal(a.telefono, null);
      assert.equal(a.acepta_whatsapp, 0);
    }
    const tipos = new Set(
      (db.prepare("SELECT tipo FROM servicios").all() as { tipo: string }[]).map((s) => s.tipo),
    );
    assert.deepEqual([...tipos].sort(), ["instalacion", "polarizado", "vitrificado"]);
    const listos = db
      .prepare(
        `SELECT COUNT(*) AS n FROM vehiculos v WHERE v.retirado_en IS NULL AND NOT EXISTS
           (SELECT 1 FROM servicios s WHERE s.vehiculo_id = v.id AND s.estado <> 'terminado')`,
      )
      .get() as { n: number };
    assert.equal(listos.n, 1);
    assert.ok(ultimosDigitos("QRS 4821").length <= 4);
  });

  test("deja la configuración de post-venta lista", () => {
    assert.equal(leerAjuste("postventa_resena_activa"), true);
    assert.equal(leerAjuste("postventa_mantenimiento_activo"), true);
    assert.equal(leerAjuste("postventa_resena_link"), "https://ejemplo.invalid/resenas-ml-center-demo");
    assert.equal(leerAjuste("postventa_espaciado_min"), 0);
  });

  test("no vuelve a sembrar si ya hay autos", () => {
    sembrarSiVacia();
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM vehiculos WHERE retirado_en IS NULL").get() as { n: number };
    assert.equal(n, 5);
    const { total } = db.prepare("SELECT COUNT(*) AS total FROM vehiculos").get() as { total: number };
    sembrarSiVacia();
    const { despues } = db.prepare("SELECT COUNT(*) AS despues FROM vehiculos").get() as { despues: number };
    assert.equal(despues, total);
  });
});

describe("cronograma de los mensajes", () => {
  test("por defecto: avisos a ~10 s, revisión cada 2 s", () => {
    assert.equal(Math.round(DEMORA_MIN * 60), 10);
    assert.equal(INTERVALO_SEG, 2);
  });

  test("ignora horario, domingos y espaciado", () => {
    assert.equal(horarioAbierto(new Date(2026, 9, 4, 3)), true); // domingo, 3 a.m.
    assert.equal(espaciadoCumplido(), true);
  });

  test("un auto en vivo recibe los 5 mensajes en sus tiempos", async () => {
    const id = crearVehiculo(
      {
        marca: "Ford",
        modelo: "Fiesta",
        color: "Verde",
        matricula: "ZZZ 9999",
        telefono: "099 123 456",
        acepta_whatsapp: true,
      },
      ["polarizado", "vitrificado"],
    );
    assert.ok(Math.abs(segundosHasta(id, "ingreso") - 10) <= 2);

    const servicios = db
      .prepare("SELECT id FROM servicios WHERE vehiculo_id = ? ORDER BY id")
      .all(id) as { id: number }[];
    cambiarEstado(servicios[0].id, "en_proceso");
    assert.ok(Math.abs(segundosHasta(id, "en_proceso") - 10) <= 2);

    cambiarEstado(servicios[0].id, "terminado");
    cambiarEstado(servicios[1].id, "terminado");
    assert.ok(Math.abs(segundosHasta(id, "listo") - 10) <= 2);

    retirarVehiculo(id);
    assert.ok(Math.abs(segundosHasta(id, "resena") - 45) <= 2);
    assert.ok(Math.abs(segundosHasta(id, "mantenimiento") - 105) <= 2);

    // Todo vencido, en un domingo de madrugada: salen los que corresponden.
    // (en_proceso se canceló al terminar todo? no: ya se mandaría al vencer; acá
    // se comprueba que ningún filtro de post-venta frena reseña ni mantenimiento.)
    db.prepare("UPDATE avisos SET enviar_en = datetime('now', '-1 minute') WHERE estado = 'pendiente'").run();
    const enviados: string[] = [];
    await despacharPendientes(
      {
        nombre: "falso",
        async enviar(_tel, texto) {
          enviados.push(texto);
        },
      },
      () => new Date(2026, 9, 4, 3),
    );
    const estados = db
      .prepare("SELECT tipo, estado FROM avisos WHERE vehiculo_id = ? AND tipo IN ('resena','mantenimiento')")
      .all(id) as { tipo: string; estado: string }[];
    assert.deepEqual(
      estados.sort((a, b) => a.tipo.localeCompare(b.tipo)),
      [
        { tipo: "mantenimiento", estado: "enviado" },
        { tipo: "resena", estado: "enviado" },
      ],
    );
    assert.ok(enviados.some((t) => t.includes("https://ejemplo.invalid/resenas-ml-center-demo")));
    assert.ok(enviados.some((t) => t.includes("mantenimiento")));
  });

  test("sin vitrificado no hay recordatorio de mantenimiento", () => {
    const id = crearVehiculo(
      { marca: "Kia", modelo: "Rio", color: "Gris", matricula: "AAA 1111", telefono: "099 123 456", acepta_whatsapp: true },
      ["polarizado"],
    );
    retirarVehiculo(id);
    const fila = db.prepare("SELECT 1 FROM avisos WHERE vehiculo_id = ? AND tipo = 'mantenimiento'").get(id);
    assert.equal(fila, undefined);
  });
});

describe("historial falso para /reportes", () => {
  const historicos = () =>
    db.prepare("SELECT * FROM vehiculos WHERE retirado_en IS NOT NULL AND matricula NOT LIKE 'ZZZ%' AND matricula NOT LIKE 'AAA%'").all() as {
      id: number;
      matricula: string;
      telefono: string | null;
      acepta_whatsapp: number;
      retirado_en: string;
    }[];
  const hoy = () => diaLocal(new Date());

  test("hay ~45-60 autos históricos, sin celular, con matrícula inventada", () => {
    const autos = historicos();
    assert.ok(autos.length >= 45 && autos.length <= 60, `autos: ${autos.length}`);
    for (const a of autos) {
      assert.match(a.matricula, /^[A-Z]{3} \d{4}$/);
      assert.equal(a.telefono, null);
      assert.equal(a.acepta_whatsapp, 0);
    }
    assert.equal(new Set(autos.map((a) => a.matricula)).size, autos.length);
  });

  test("es determinístico: el mismo plan para la misma fecha, y entre 45 y 60 en cualquier día", () => {
    const f = new Date(2026, 9, 7, 15);
    assert.deepEqual(generarPlanHistorial(f), generarPlanHistorial(f));
    for (let d = 0; d < 14; d++) {
      const n = generarPlanHistorial(new Date(2026, 9, 1 + d, 15)).length;
      assert.ok(n >= 45 && n <= 60, `día ${d}: ${n}`);
    }
  });

  test("todos los servicios terminados, historial coherente y nada en domingo ni en el futuro", () => {
    const ahora = new Date().toISOString().slice(0, 19).replace("T", " ");
    const malos = db
      .prepare(
        `SELECT COUNT(*) AS n FROM servicios s JOIN vehiculos v ON v.id = s.vehiculo_id
         WHERE v.retirado_en IS NOT NULL AND s.estado <> 'terminado'
           AND v.matricula NOT LIKE 'ZZZ%' AND v.matricula NOT LIKE 'AAA%'`,
      )
      .get() as { n: number };
    assert.equal(malos.n, 0);
    const futuros = db.prepare("SELECT COUNT(*) AS n FROM historial WHERE fecha > ?").get(ahora) as { n: number };
    assert.equal(futuros.n, 0);
    const ids = historicos().map((a) => a.id);
    for (const id of ids) {
      const ev = db
        .prepare("SELECT evento, estado_nuevo, servicio_id FROM historial WHERE vehiculo_id = ? ORDER BY fecha, id")
        .all(id) as { evento: string; estado_nuevo: string | null; servicio_id: number | null }[];
      assert.equal(ev[0].evento, "ingreso");
      assert.equal(ev.at(-1)?.evento, "retiro");
      const cambios = ev.filter((e) => e.evento === "cambio_estado");
      const servicios = new Set(cambios.map((e) => e.servicio_id));
      assert.equal(cambios.length, servicios.size * 2);
      assert.equal(cambios.filter((e) => e.estado_nuevo === "terminado").length, servicios.size);
    }
    for (const id of ids) {
      for (const { fecha } of db.prepare("SELECT fecha FROM historial WHERE vehiculo_id = ?").all(id) as { fecha: string }[]) {
        assert.notEqual(new Date(`${fecha.replace(" ", "T")}Z`).getDay(), 0, fecha);
      }
    }
  });

  test("el reporte de la semana anterior y el del mes son creíbles y coherentes", () => {
    const d = new Date();
    const semanaPasada = diaLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
    const mesPasado = diaLocal(new Date(d.getFullYear(), d.getMonth() - 1, 15));
    for (const fecha of [semanaPasada, mesPasado, hoy()]) {
      for (const periodo of ["semana", "mes"] as const) {
        const r = generarReporte(periodo, fecha);
        const suma = r.autosAtendidos.serie.reduce((a, b) => a + b.cantidad, 0);
        assert.equal(suma, r.autosAtendidos.total, `${periodo} ${fecha}`);
        assert.ok(r.autosAtendidos.total <= r.serviciosPorTipo.reduce((a, b) => a + b.cantidad, 0));
      }
    }
    for (const [periodo, fecha] of [["semana", semanaPasada], ["mes", mesPasado]] as const) {
      const r = generarReporte(periodo, fecha);
      assert.ok(r.autosAtendidos.total > 0);
      assert.deepEqual(r.serviciosPorTipo.map((s) => s.tipo).sort(), ["instalacion", "polarizado", "vitrificado"]);
      for (const s of r.serviciosPorTipo) assert.ok(s.cantidad > 0, `${periodo} ${s.tipo}`);
      for (const t of r.tiempoPromedioPorTipo) {
        assert.ok(t.minutosPromedio !== null && t.minutosPromedio > 0 && t.muestras > 0, `${periodo} ${t.tipo}`);
      }
      assert.ok(r.autosQueMasTardaron.length > 0);
    }
    // Rangos creíbles por área (min): polarizado 60-150, instalación 120-270, vitrificado 240-480.
    const rangos = { polarizado: [60, 150], instalacion: [120, 270], vitrificado: [240, 480] } as const;
    for (const t of generarReporte("mes", mesPasado).tiempoPromedioPorTipo) {
      const [min, max] = rangos[t.tipo];
      assert.ok(t.minutosPromedio! >= min && t.minutosPromedio! <= max, `${t.tipo}: ${t.minutosPromedio}`);
    }
  });

  test("la semana actual no tiene días futuros con autos", () => {
    const r = generarReporte("semana", hoy());
    for (const b of r.autosAtendidos.serie) {
      if (b.desde > hoy()) assert.equal(b.cantidad, 0, b.etiqueta);
    }
    const sabado = generarReporte("semana", diaLocal(new Date(Date.now() - 7 * 86400000)));
    const domingo = sabado.autosAtendidos.serie[6];
    assert.equal(domingo.cantidad, 0);
    assert.ok(sabado.autosAtendidos.serie[1].cantidad + sabado.autosAtendidos.serie[2].cantidad > 0);
  });

  test("no aparecen en /display, /taller ni /admin, y siguen los 5 de la semilla", () => {
    assert.equal(listarVehiculosVisibles().length, 5);
    assert.equal(listarTodos().length, 5);
  });

  test("no hay avisos para los autos históricos", () => {
    const ids = historicos().map((a) => a.id);
    const placeholders = ids.map(() => "?").join(",");
    const { n } = db.prepare(`SELECT COUNT(*) AS n FROM avisos WHERE vehiculo_id IN (${placeholders})`).get(...ids) as { n: number };
    assert.equal(n, 0);
  });

  test("el PIN de reportes 5678 ya está creado y el de /admin sigue siendo otro", () => {
    assert.equal(verificarPinReportes("1.2.3.4", "5678"), null);
    assert.equal(verificarPinReportes("1.2.3.4", "1234")?.status, 401);
  });
});

describe("modo normal", () => {
  test("sin MODO_DEMO no se carga historial ni PIN de reportes", () => {
    const carpetaNormal = mkdtempSync(join(tmpdir(), "taller-normal-tests-"));
    try {
      const r = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "-e",
          `const { db } = await import("./src/db.js");
           const { sembrarSiVacia } = await import("./src/seed.js");
           console.log = () => {};
           sembrarSiVacia();
           const v = db.prepare("SELECT COUNT(*) n, SUM(retirado_en IS NOT NULL) r FROM vehiculos").get();
           const h = db.prepare("SELECT COUNT(*) n FROM historial").get();
           const p = db.prepare("SELECT COUNT(*) n FROM config WHERE clave = 'pin_reportes'").get();
           process.stdout.write(JSON.stringify({ v: v.n, r: v.r, h: h.n, p: p.n }));`,
        ],
        {
          cwd: raiz,
          env: { PATH: process.env.PATH ?? "", DB_PATH: join(carpetaNormal, "taller.db") },
          encoding: "utf8",
        },
      );
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(JSON.parse(r.stdout), { v: 8, r: 0, h: 0, p: 0 });
    } finally {
      rmSync(carpetaNormal, { recursive: true, force: true });
    }
  });
});
