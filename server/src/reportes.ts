// Reportes para el dueño (/reportes), armados sobre la tabla `historial`.
// Por semana (lunes a domingo) o por mes calendario, en la hora LOCAL del
// server: el historial guarda las fechas en UTC (formato de datetime('now')),
// así que los bordes del período se arman en hora local y se pasan a UTC para
// comparar como texto, y cada evento se vuelve a hora local para ubicarlo en
// el día o la semana que le toca.
//
// Reglas (ver odd/tasks/reportes-dueno.md):
// - Los servicios quitados no cuentan para nada.
// - Un servicio "se terminó en el período" si tuvo un cambio a terminado
//   dentro del período; si tuvo varios (volvió atrás y re-terminó), cuenta una
//   sola vez, con el último.
// - Tiempo de un servicio: desde su último cambio a en_proceso hasta ese
//   terminado (la última vuelta completa). Si llegó a terminado sin pasar por
//   en_proceso en esa vuelta, no suma al promedio.
// - Un auto "terminó en el período" si al final del período todos sus servicios
//   (los no quitados) estaban terminados y el último terminado cae en el
//   período. Su tiempo de taller va desde el ingreso hasta ese terminado.
import { db } from "./db.js";
import { ErrorValidacion } from "./errores.js";
import { TIPOS_SERVICIO } from "./servicios.js";
import type { EstadoServicio, TipoServicio } from "./tipos.js";

export type Periodo = "semana" | "mes";

export const PERIODOS: Periodo[] = ["semana", "mes"];

// Cuántos autos muestra la lista de "los que más tardaron".
export const MAX_AUTOS_LENTOS = 5;

// Una barra del gráfico de autos atendidos: un día (semana) o una semana (mes).
export interface BarraAutos {
  etiqueta: string; // "Lun 28" o "1–4"
  desde: string; // "YYYY-MM-DD" (hora local, inclusive)
  hasta: string; // "YYYY-MM-DD" (hora local, inclusive)
  cantidad: number;
}

export interface AutoLento {
  id: number;
  marca: string;
  modelo: string;
  color: string;
  // Solo los últimos dígitos: NUNCA la matrícula entera (privacidad).
  ultimosDigitos: string;
  minutos: number;
  tipos: TipoServicio[];
}

export interface Reporte {
  periodo: Periodo;
  desde: string; // primer día del período ("YYYY-MM-DD", hora local)
  hasta: string; // último día del período (inclusive)
  etiqueta: string; // "Semana del 28 sep al 4 oct" / "Octubre 2026"
  // Un día cualquiera del período anterior y del siguiente, para navegar.
  fechaAnterior: string;
  fechaSiguiente: string;
  autosAtendidos: { total: number; serie: BarraAutos[] };
  serviciosPorTipo: { tipo: TipoServicio; cantidad: number }[];
  // minutosPromedio es null si no hubo ninguna vuelta completa para promediar.
  tiempoPromedioPorTipo: {
    tipo: TipoServicio;
    minutosPromedio: number | null;
    muestras: number;
  }[];
  autosQueMasTardaron: AutoLento[];
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MS_MINUTO = 60 * 1000;

// Una fila del historial, tal como se lee para el reporte.
interface Evento {
  vehiculo_id: number;
  servicio_id: number | null;
  tipo_servicio: TipoServicio | null;
  evento: string;
  estado_nuevo: EstadoServicio | null;
  fecha: string;
}

// --- Fechas ---

// Fecha local (00:00 del día) a partir de "YYYY-MM-DD". Rechaza lo que no sea
// un día real (ej. 2026-02-30).
function leerFecha(texto: unknown): Date {
  const partes = typeof texto === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto) : null;
  if (partes) {
    const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia) {
      return fecha;
    }
  }
  throw new ErrorValidacion("La fecha tiene que ser un día con la forma AAAA-MM-DD.");
}

// "YYYY-MM-DD" del día local de `fecha`.
export function diaLocal(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

// Fecha local `dias` días después (o antes) de `fecha`, a las 00:00. Se arma con
// año/mes/día y no sumando milisegundos, así un cambio de horario no la corre.
function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

// Un instante como texto UTC con el formato de datetime('now'), para comparar
// contra historial.fecha.
function aTextoUtc(fecha: Date): string {
  return fecha.toISOString().slice(0, 19).replace("T", " ");
}

// Al revés: un texto de historial.fecha (UTC) como instante.
function deTextoUtc(texto: string): Date {
  return new Date(`${texto.replace(" ", "T")}Z`);
}

// Minutos entre dos fechas de historial (redondeados).
function minutosEntre(desde: string, hasta: string): number {
  return Math.round((deTextoUtc(hasta).getTime() - deTextoUtc(desde).getTime()) / MS_MINUTO);
}

// Lunes de la semana de `fecha` (la semana va de lunes a domingo).
function lunesDe(fecha: Date): Date {
  return sumarDias(fecha, -((fecha.getDay() + 6) % 7));
}

// Inicio (inclusive) y fin (exclusivo) del período que contiene `fecha`, en
// hora local, más un día del período anterior y del siguiente.
function rangoDe(periodo: Periodo, fecha: Date) {
  if (periodo === "semana") {
    const inicio = lunesDe(fecha);
    return { inicio, fin: sumarDias(inicio, 7), anterior: sumarDias(inicio, -7) };
  }
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  return {
    inicio,
    fin: new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1),
    anterior: new Date(fecha.getFullYear(), fecha.getMonth() - 1, 1),
  };
}

// "Semana del 28 sep al 4 oct" / "Octubre 2026".
function etiquetaDe(periodo: Periodo, inicio: Date, ultimo: Date): string {
  if (periodo === "mes") return `${MESES[inicio.getMonth()]} ${inicio.getFullYear()}`;
  const corto = (d: Date) => `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
  return `Semana del ${corto(inicio)} al ${corto(ultimo)}`;
}

// Las barras vacías del gráfico: un día por barra (semana) o una semana de
// lunes a domingo por barra, recortada a los días del mes (mes).
function barrasDe(periodo: Periodo, inicio: Date, fin: Date): BarraAutos[] {
  const barras: BarraAutos[] = [];
  if (periodo === "semana") {
    for (let i = 0; i < 7; i++) {
      const dia = sumarDias(inicio, i);
      const texto = diaLocal(dia);
      barras.push({ etiqueta: `${DIAS[i]} ${dia.getDate()}`, desde: texto, hasta: texto, cantidad: 0 });
    }
    return barras;
  }
  for (let desde = inicio; desde < fin; ) {
    const siguienteLunes = sumarDias(lunesDe(desde), 7);
    const hastaExclusivo = siguienteLunes < fin ? siguienteLunes : fin;
    const hasta = sumarDias(hastaExclusivo, -1);
    barras.push({
      etiqueta:
        desde.getDate() === hasta.getDate()
          ? `${desde.getDate()}`
          : `${desde.getDate()}–${hasta.getDate()}`,
      desde: diaLocal(desde),
      hasta: diaLocal(hasta),
      cantidad: 0,
    });
    desde = hastaExclusivo;
  }
  return barras;
}

// Últimos dígitos de la matrícula, sin espacios ni guiones (igual que
// ultimosDigitos en client/src/dominio.ts). Lo único de la matrícula que sale.
export function ultimosDigitos(matricula: string, cantidad = 4): string {
  return matricula.replace(/\s|-/g, "").slice(-cantidad);
}

// --- Reporte ---

/**
 * Arma el reporte del período (`semana` o `mes`) que contiene el día `fecha`
 * ("YYYY-MM-DD", hora local). Tira ErrorValidacion si el período o la fecha no
 * sirven.
 */
export function generarReporte(periodo: unknown, fecha: unknown): Reporte {
  if (!PERIODOS.includes(periodo as Periodo)) {
    throw new ErrorValidacion("El período tiene que ser semana o mes.");
  }
  const tipoPeriodo = periodo as Periodo;
  const { inicio, fin, anterior } = rangoDe(tipoPeriodo, leerFecha(fecha));
  const ultimoDia = sumarDias(fin, -1);
  const inicioUtc = aTextoUtc(inicio);
  const finUtc = aTextoUtc(fin);
  const enPeriodo = (texto: string) => texto >= inicioUtc && texto < finUtc;

  // Los servicios quitados no cuentan nunca (aunque los hayan quitado después).
  const quitados = new Set(
    (
      db
        .prepare(
          "SELECT servicio_id FROM historial WHERE evento = 'servicio_quitado' AND servicio_id IS NOT NULL",
        )
        .all() as { servicio_id: number }[]
    ).map((f) => f.servicio_id),
  );

  // Autos con algún servicio terminado en el período: los únicos que pueden
  // aparecer en el reporte. De ellos se lee todo su historial, en orden.
  const autos = (
    db
      .prepare(
        `SELECT DISTINCT vehiculo_id FROM historial
         WHERE evento = 'cambio_estado' AND estado_nuevo = 'terminado'
           AND fecha >= ? AND fecha < ?`,
      )
      .all(inicioUtc, finUtc) as { vehiculo_id: number }[]
  ).map((f) => f.vehiculo_id);

  const leerEventos = db.prepare(
    `SELECT vehiculo_id, servicio_id, tipo_servicio, evento, estado_nuevo, fecha
     FROM historial WHERE vehiculo_id = ? ORDER BY fecha, id`,
  );
  const leerAuto = db.prepare(
    "SELECT id, marca, modelo, color, matricula, fecha_ingreso FROM vehiculos WHERE id = ?",
  );

  const porTipo = new Map(TIPOS_SERVICIO.map((t) => [t, 0]));
  const tiempos = new Map<TipoServicio, number[]>(TIPOS_SERVICIO.map((t) => [t, []]));
  const barras = barrasDe(tipoPeriodo, inicio, fin);
  const lentos: AutoLento[] = [];
  let atendidos = 0;

  for (const vehiculoId of autos) {
    const eventos = leerEventos.all(vehiculoId) as Evento[];
    // Eventos de cada servicio no quitado, hasta el fin del período.
    const porServicio = new Map<number, Evento[]>();
    for (const e of eventos) {
      if (e.servicio_id === null || quitados.has(e.servicio_id) || e.fecha >= finUtc) continue;
      const lista = porServicio.get(e.servicio_id) ?? [];
      lista.push(e);
      porServicio.set(e.servicio_id, lista);
    }

    // Último terminado del auto dentro del período (para ubicarlo en el gráfico).
    let ultimoEnPeriodo: string | null = null;
    // ¿Todos sus servicios terminados al final del período? Y el último terminado.
    let todosTerminados = porServicio.size > 0;
    let ultimoTerminado = "";
    const tipos = new Set<TipoServicio>();

    for (const lista of porServicio.values()) {
      const tipo = lista[0].tipo_servicio as TipoServicio;
      tipos.add(tipo);
      const estadoFinal = [...lista].reverse().find((e) => e.estado_nuevo)?.estado_nuevo;
      const terminados = lista.filter(
        (e) => e.evento === "cambio_estado" && e.estado_nuevo === "terminado",
      );
      const ultimo = terminados.at(-1);
      if (estadoFinal !== "terminado" || !ultimo) todosTerminados = false;
      else if (ultimo.fecha > ultimoTerminado) ultimoTerminado = ultimo.fecha;

      // El servicio cuenta en el período con su último terminado de adentro.
      const final = terminados.filter((e) => enPeriodo(e.fecha)).at(-1);
      if (!final) continue;
      porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + 1);
      if (!ultimoEnPeriodo || final.fecha > ultimoEnPeriodo) ultimoEnPeriodo = final.fecha;

      // La última vuelta: hacia atrás desde este terminado, el primer en_proceso
      // que aparezca antes de llegar al terminado anterior.
      for (let i = lista.indexOf(final) - 1; i >= 0; i--) {
        if (lista[i].estado_nuevo === "terminado") break;
        if (lista[i].evento === "cambio_estado" && lista[i].estado_nuevo === "en_proceso") {
          tiempos.get(tipo)?.push(minutosExactos(lista[i].fecha, final.fecha));
          break;
        }
      }
    }

    // Solo servicios quitados terminados en el período: el auto no cuenta.
    if (!ultimoEnPeriodo) continue;
    atendidos += 1;
    const dia = diaLocal(deTextoUtc(ultimoEnPeriodo));
    const barra = barras.find((b) => b.desde <= dia && dia <= b.hasta);
    if (barra) barra.cantidad += 1;

    if (todosTerminados && enPeriodo(ultimoTerminado)) {
      const auto = leerAuto.get(vehiculoId) as
        | { id: number; marca: string; modelo: string; color: string; matricula: string; fecha_ingreso: string }
        | undefined;
      if (!auto) continue;
      const ingreso = eventos.find((e) => e.evento === "ingreso")?.fecha ?? auto.fecha_ingreso;
      lentos.push({
        id: auto.id,
        marca: auto.marca,
        modelo: auto.modelo,
        color: auto.color,
        ultimosDigitos: ultimosDigitos(auto.matricula),
        minutos: minutosEntre(ingreso, ultimoTerminado),
        tipos: TIPOS_SERVICIO.filter((t) => tipos.has(t)),
      });
    }
  }

  lentos.sort((a, b) => b.minutos - a.minutos || a.id - b.id);

  return {
    periodo: tipoPeriodo,
    desde: diaLocal(inicio),
    hasta: diaLocal(ultimoDia),
    etiqueta: etiquetaDe(tipoPeriodo, inicio, ultimoDia),
    fechaAnterior: diaLocal(anterior),
    fechaSiguiente: diaLocal(fin),
    autosAtendidos: { total: atendidos, serie: barras },
    serviciosPorTipo: TIPOS_SERVICIO.map((tipo) => ({ tipo, cantidad: porTipo.get(tipo) ?? 0 })),
    tiempoPromedioPorTipo: TIPOS_SERVICIO.map((tipo) => {
      const lista = tiempos.get(tipo) ?? [];
      const promedio = lista.length
        ? Math.round(lista.reduce((a, b) => a + b, 0) / lista.length)
        : null;
      return { tipo, minutosPromedio: promedio, muestras: lista.length };
    }),
    autosQueMasTardaron: lentos.slice(0, MAX_AUTOS_LENTOS),
  };
}

// Minutos entre dos fechas de historial, sin redondear (para promediar).
function minutosExactos(desde: string, hasta: string): number {
  return (deTextoUtc(hasta).getTime() - deTextoUtc(desde).getTime()) / MS_MINUTO;
}
