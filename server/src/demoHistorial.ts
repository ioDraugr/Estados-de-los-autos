// Historial FALSO para que /reportes se vea creíble en el modo presentación.
// Solo lo llama seed.ts, con MODO_DEMO y con la base vacía (nunca en modo normal).
//
// Genera ~50 autos ya retirados repartidos en las últimas ~5 semanas, siempre
// relativos a "ahora" (así la demo se ve vigente) y de forma DETERMINÍSTICA: un
// PRNG con semilla fija, así que la misma fecha da siempre la misma demo.
// Movimiento de martes a viernes, poco los sábados, nada los domingos, y jamás
// un evento en el futuro.
//
// Se inserta directo con SQL (no con crearVehiculo/cambiarEstado/retirarVehiculo):
// el flujo normal programaría avisos y estos autos no deben generar ninguno.
// Las fechas del historial van en UTC con el formato de datetime('now'), como
// espera reportes.ts; los días y las horas de trabajo se arman en hora local.
import { db } from "./db.js";
import type { TipoServicio } from "./tipos.js";

export const PIN_REPORTES_DEMO = "5678";

const DIAS_ATRAS = 35;
// Autos esperados por día según el día de la semana (0 = domingo).
const PESOS_DIA = [0, 1.4, 3.9, 3.9, 3.9, 3.4, 1.0];
const FACTOR = 0.56;
const MIN = 60 * 1000;

// Minutos que dura cada servicio (min, máx) en en_proceso → terminado.
const DURACION: Record<TipoServicio, [number, number]> = {
  polarizado: [60, 150],
  instalacion: [120, 270],
  vitrificado: [240, 480],
};
const ORDEN: TipoServicio[] = ["instalacion", "polarizado", "vitrificado"];

const MODELOS: [string, string][] = [
  ["Chevrolet", "Onix"], ["Chevrolet", "Tracker"], ["Chevrolet", "Spark"],
  ["Volkswagen", "Gol"], ["Volkswagen", "Polo"], ["Volkswagen", "Nivus"], ["Volkswagen", "T-Cross"],
  ["Fiat", "Cronos"], ["Fiat", "Argo"], ["Fiat", "Mobi"], ["Fiat", "Strada"],
  ["Renault", "Kwid"], ["Renault", "Sandero"], ["Renault", "Duster"],
  ["Peugeot", "208"], ["Peugeot", "2008"], ["Citroën", "C3"],
  ["Toyota", "Corolla"], ["Toyota", "Hilux"], ["Toyota", "Yaris"],
  ["Suzuki", "Swift"], ["Suzuki", "Fronx"], ["Suzuki", "Vitara"],
  ["Hyundai", "HB20"], ["Hyundai", "Tucson"], ["Kia", "Rio"], ["Kia", "Sportage"], ["Kia", "Picanto"],
  ["Nissan", "Versa"], ["Nissan", "Frontier"], ["Nissan", "Kicks"],
  ["Ford", "Ranger"], ["Ford", "Territory"], ["Honda", "HR-V"], ["Chery", "Tiggo 2"], ["BYD", "Dolphin"],
];
const COLORES = ["Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul", "Verde", "Bordó", "Naranja", "Beige"];
const PESO_COLOR = [5, 4, 4, 3, 2, 2, 1, 1, 1, 1];

export interface ServicioHistorico {
  tipo: TipoServicio;
  inicio: Date; // pasa a en_proceso
  fin: Date; // pasa a terminado
}

export interface AutoHistorico {
  marca: string;
  modelo: string;
  color: string;
  matricula: string;
  ingreso: Date;
  servicios: ServicioHistorico[];
  retiro: Date;
}

// PRNG con semilla fija (mulberry32): misma secuencia siempre.
function crearPrng(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function utc(fecha: Date): string {
  return fecha.toISOString().slice(0, 19).replace("T", " ");
}

// Fecha local: día `hace` días antes de `hoy` a la hora `h` (decimal).
function momento(hoy: Date, hace: number, h: number): Date {
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - hace, 0, Math.round(h * 60));
}

// Hora a la que se cierra el taller ese día (sábado, mediodía).
function cierre(dia: Date): number {
  return dia.getDay() === 6 ? 13 : 19;
}

// Mismo día a la hora `h` (decimal) y el siguiente día de trabajo (sin domingos).
function aHora(dia: Date, h: number): Date {
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, Math.round(h * 60));
}
function proximoDiaHabil(dia: Date): Date {
  const d = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
  return d.getDay() === 0 ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) : d;
}

/**
 * El plan de autos históricos para `ahora`: puro (no toca la base). Solo quedan
 * los autos cuyo último evento (el retiro) ya pasó.
 */
export function generarPlanHistorial(ahora: Date = new Date()): AutoHistorico[] {
  const azar = crearPrng(20261004);
  const entre = (a: number, b: number) => a + (b - a) * azar();
  const triangular = (a: number, b: number) => a + ((b - a) * (azar() + azar())) / 2;
  const elegir = <T>(lista: T[]): T => lista[Math.floor(azar() * lista.length)];
  const pesada = <T>(lista: T[], pesos: number[]): T => {
    let r = azar() * pesos.reduce((x, y) => x + y, 0);
    for (let i = 0; i < lista.length; i++) if ((r -= pesos[i]) < 0) return lista[i];
    return lista[lista.length - 1];
  };

  const usadas = new Set<string>();
  const matricula = () => {
    for (;;) {
      const letras = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(azar() * 26))).join("");
      const m = `${letras} ${1000 + Math.floor(azar() * 9000)}`;
      if (!usadas.has(m)) {
        usadas.add(m);
        return m;
      }
    }
  };

  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  // Arma un auto que entra el día `dia` con los servicios `tipos`. `espera` es la
  // pausa entre servicios (minutos): corta lo normal, de días en los lentos.
  const armar = (dia: Date, tipos: TipoServicio[], horaIngreso: number, esperaDias = 0): AutoHistorico => {
    const [marca, modelo] = elegir(MODELOS);
    const ingreso = aHora(dia, horaIngreso);
    let cursor = ingreso;
    const servicios: ServicioHistorico[] = [];
    for (const tipo of tipos) {
      const [min, max] = DURACION[tipo];
      const dur = Math.round(triangular(min, max));
      let inicio = new Date(cursor.getTime() + entre(8, 40) * MIN);
      for (let i = 0; i < esperaDias && servicios.length > 0; i++) {
        inicio = aHora(proximoDiaHabil(inicio), entre(8.5, 10));
      }
      let diaInicio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
      if (diaInicio.getDay() === 0) diaInicio = proximoDiaHabil(diaInicio);
      let fin = new Date(inicio.getTime() + dur * MIN);
      if (fin > aHora(diaInicio, cierre(diaInicio)) || inicio.getDay() === 0) {
        const siguiente = proximoDiaHabil(diaInicio);
        inicio = aHora(siguiente, entre(8.5, siguiente.getDay() === 6 ? 9.5 : 10.5));
        fin = new Date(inicio.getTime() + dur * MIN);
      }
      servicios.push({ tipo, inicio, fin });
      cursor = fin;
    }
    let retiro = new Date(cursor.getTime() + entre(10, 150) * MIN);
    const diaFin = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (retiro > aHora(diaFin, cierre(diaFin) + 0.5)) {
      const siguiente = proximoDiaHabil(diaFin);
      retiro = aHora(siguiente, entre(9, 11));
    }
    return {
      marca,
      modelo,
      color: pesada(COLORES, PESO_COLOR),
      matricula: matricula(),
      ingreso,
      servicios,
      retiro,
    };
  };

  const autos: AutoHistorico[] = [];

  for (let hace = DIAS_ATRAS; hace >= 0; hace--) {
    const dia = momento(hoy, hace, 0);
    const dow = dia.getDay();
    if (dow === 0) continue;
    const cuantos = Math.floor(PESOS_DIA[dow] * FACTOR + azar() * 0.9);
    for (let i = 0; i < cuantos; i++) {
      let tipos: TipoServicio[];
      const r = azar();
      if (dow === 6) tipos = [r < 0.55 ? "polarizado" : "instalacion"];
      else if (r < 0.28) tipos = ["polarizado"];
      else if (r < 0.5) tipos = ["instalacion"];
      else if (r < 0.62) tipos = ["vitrificado"];
      else if (r < 0.74) tipos = ["instalacion", "polarizado"];
      else if (r < 0.84) tipos = ["polarizado", "vitrificado"];
      else if (r < 0.92) tipos = ["instalacion", "vitrificado"];
      else tipos = [...ORDEN];
      const hora = tipos.includes("vitrificado") ? entre(8, 9.5) : entre(8, dow === 6 ? 9.5 : 12.5);
      autos.push(armar(dia, tipos, hora));
    }
  }

  // Dos autos que tardaron notablemente más (esperaron días entre servicios).
  for (const hace of [9, 17]) {
    let dia = momento(hoy, hace, 0);
    if (dia.getDay() === 0) dia = momento(hoy, hace + 1, 0);
    autos.push(armar(dia, [...ORDEN], entre(8, 9), 1));
  }

  // Nada en el futuro: un auto cuyo retiro (su último evento) no pasó, no existe.
  const limite = ahora.getTime() - MIN;
  return autos
    .filter((a) => a.retiro.getTime() <= limite)
    .sort((x, y) => x.ingreso.getTime() - y.ingreso.getTime());
}

/**
 * Inserta el historial falso y el PIN de /reportes. Se llama desde seed.ts DENTRO
 * de su transacción y solo con la base vacía. Insert directo: sin avisos.
 * Devuelve cuántos autos cargó.
 */
export function cargarHistorialDemo(ahora: Date = new Date()): number {
  const autos = generarPlanHistorial(ahora);
  const insertarVehiculo = db.prepare(
    `INSERT INTO vehiculos (marca, modelo, color, matricula, fecha_ingreso, retirado_en, telefono, acepta_whatsapp)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 0)`,
  );
  const insertarServicio = db.prepare(
    "INSERT INTO servicios (vehiculo_id, tipo, estado, actualizado_en) VALUES (?, ?, 'terminado', ?)",
  );
  const insertarEvento = db.prepare(
    `INSERT INTO historial
       (vehiculo_id, servicio_id, tipo_servicio, evento, estado_anterior, estado_nuevo, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const cargar = db.transaction(() => {
    for (const auto of autos) {
      const ingreso = utc(auto.ingreso);
      const id = Number(
        insertarVehiculo.run(auto.marca, auto.modelo, auto.color, auto.matricula, ingreso, utc(auto.retiro))
          .lastInsertRowid,
      );
      insertarEvento.run(id, null, null, "ingreso", null, null, ingreso);
      const servicios = auto.servicios.map((s) => ({
        ...s,
        id: Number(insertarServicio.run(id, s.tipo, utc(s.fin)).lastInsertRowid),
      }));
      // Eventos en orden cronológico (reportes.ts ordena por fecha e id).
      const eventos = servicios.flatMap((s) => [
        { s, estadoAntes: "esperando", estadoNuevo: "en_proceso", fecha: s.inicio },
        { s, estadoAntes: "en_proceso", estadoNuevo: "terminado", fecha: s.fin },
      ]);
      eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
      for (const e of eventos) {
        insertarEvento.run(id, e.s.id, e.s.tipo, "cambio_estado", e.estadoAntes, e.estadoNuevo, utc(e.fecha));
      }
      insertarEvento.run(id, null, null, "retiro", null, null, utc(auto.retiro));
    }
    // Mismo formato que auth.ts (texto plano en config). No pisa uno existente.
    db.prepare("INSERT OR IGNORE INTO config (clave, valor) VALUES ('pin_reportes', ?)").run(PIN_REPORTES_DEMO);
  });
  cargar();
  return autos.length;
}
