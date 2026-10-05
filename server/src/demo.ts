// Modo presentación (MODO_DEMO=1): todo lo que cambia para poder mostrar el
// sistema en vivo está acá, y el resto del server lo importa de este archivo.
// Sin MODO_DEMO nada de esto se activa y el server se comporta como siempre.
//
// Qué cambia con MODO_DEMO:
// - La base: se NIEGA a arrancar si no se indicó DB_PATH o si el archivo no se
//   llama demo.db (la base real no se toca nunca). Ver exigirBaseDemo.
// - Los tiempos de post-venta: reseña y mantenimiento salen a los segundos y no
//   a los días y meses (DEMO_RESENA_SEG y DEMO_MANTENIMIENTO_SEG).
// - Sin horario ni domingos ni espaciado en la post-venta (postventa.ts).
// - La demora de los avisos del taller baja a ~10 s y el despachador revisa
//   cada 2 s (avisos.ts), salvo que AVISOS_DEMORA_MIN / AVISOS_INTERVALO_SEG
//   digan otra cosa.
// - Una semilla de 5 autos falsos y los ajustes de post-venta listos (seed.ts).
// No importa la base ni otros módulos del server (los importan a él); de seed.ts
// solo toma un tipo.
import { basename } from "node:path";
import type { VehiculoSemilla } from "./seed.js";

export const MODO_DEMO = process.env.MODO_DEMO === "1";

// Segundos después del retiro en que salen los mensajes de post-venta.
export const DEMO_RESENA_SEG = leerNumeroPositivo("DEMO_RESENA_SEG", 45);
export const DEMO_MANTENIMIENTO_SEG = leerNumeroPositivo("DEMO_MANTENIMIENTO_SEG", 105);

// Demora de los avisos del taller (minutos; 0.17 min = 10 s) y cada cuántos
// segundos el despachador busca vencidos, cuando no se indican por env var.
export const DEMO_AVISOS_DEMORA_MIN = 0.17;
export const DEMO_AVISOS_INTERVALO_SEG = 2;

// Nombre del único archivo de base que el modo demo acepta.
export const NOMBRE_BASE_DEMO = "demo.db";

/**
 * Guarda de seguridad: con MODO_DEMO, la base tiene que venir de DB_PATH y
 * llamarse demo.db; si no, error claro y el server no arranca (así nunca se
 * siembra ni se escribe en la base real). Sin MODO_DEMO no hace nada.
 * Los parámetros se pasan a mano para poder probarla sin tocar el entorno.
 */
export function exigirBaseDemo(modoDemo: boolean, dbPathEnv: string | undefined, rutaDb: string): void {
  if (!modoDemo) return;
  if (!dbPathEnv || dbPathEnv.trim() === "") {
    throw new Error(
      `MODO_DEMO necesita DB_PATH explícito apuntando a un archivo ${NOMBRE_BASE_DEMO} ` +
        "(se niega a usar la base real). Lo más simple es arrancar con `npm run demo`.",
    );
  }
  if (basename(rutaDb) !== NOMBRE_BASE_DEMO) {
    throw new Error(
      `MODO_DEMO solo funciona con una base llamada ${NOMBRE_BASE_DEMO}, y DB_PATH apunta a ` +
        `"${rutaDb}". Se niega a arrancar para no tocar una base real.`,
    );
  }
}

/** Cuánto falta para cada mensaje de post-venta, como desplazamiento de SQLite. */
export function desplazamientoPostventaDemo(tipo: "resena" | "mantenimiento"): string {
  const segundos = tipo === "resena" ? DEMO_RESENA_SEG : DEMO_MANTENIMIENTO_SEG;
  return `+${Math.round(segundos)} seconds`;
}

// Ajustes de la tabla config que deja la demo para que NINGÚN filtro de
// post-venta frene el mensaje a un cliente que aceptó recibirlos. El horario y
// los domingos no hacen falta: horarioAbierto() es siempre true en la demo.
// El link es de mentira a propósito (.invalid nunca resuelve).
export const AJUSTES_DEMO = {
  postventa_resena_activa: true,
  postventa_mantenimiento_activo: true,
  postventa_resena_link: "https://ejemplo.invalid/resenas-ml-center-demo",
  postventa_espaciado_min: 0,
} as const;

// 5 autos FALSOS (matrículas inventadas, sin celular y sin aceptar WhatsApp: no
// mandan mensajes). Estados variados: se ven los tres conos (rojo
// instalación, azul polarizado, amarillo vitrificado) y una tarjeta "Listo".
export const SEMILLA_DEMO: VehiculoSemilla[] = [
  {
    marca: "Chevrolet",
    modelo: "Onix",
    color: "Blanco",
    matricula: "QRS 4821",
    diasAtras: 1,
    servicios: [
      { tipo: "instalacion", estado: "en_proceso" },
      { tipo: "polarizado", estado: "esperando" },
    ],
  },
  {
    marca: "Volkswagen",
    modelo: "Gol",
    color: "Gris",
    matricula: "TUV 2937",
    diasAtras: 2,
    servicios: [
      { tipo: "polarizado", estado: "terminado" },
      { tipo: "vitrificado", estado: "en_proceso" },
    ],
  },
  {
    marca: "Fiat",
    modelo: "Cronos",
    color: "Rojo",
    matricula: "MNP 6150",
    diasAtras: 1,
    servicios: [
      { tipo: "instalacion", estado: "esperando" },
      { tipo: "vitrificado", estado: "esperando" },
    ],
  },
  {
    // Todos terminados: tarjeta verde "Listo".
    marca: "Suzuki",
    modelo: "Fronx",
    color: "Azul",
    matricula: "KLM 3374",
    diasAtras: 3,
    servicios: [
      { tipo: "instalacion", estado: "terminado" },
      { tipo: "polarizado", estado: "terminado" },
      { tipo: "vitrificado", estado: "terminado" },
    ],
  },
  {
    marca: "Renault",
    modelo: "Kwid",
    color: "Naranja",
    matricula: "DEF 8062",
    diasAtras: 2,
    servicios: [{ tipo: "polarizado", estado: "en_proceso" }],
  },
];

// Número > 0 de una env var; si falta o no sirve, el default.
function leerNumeroPositivo(nombre: string, porDefecto: number): number {
  const crudo = process.env[nombre];
  if (crudo === undefined || crudo.trim() === "") return porDefecto;
  const valor = Number(crudo);
  if (!Number.isFinite(valor) || valor <= 0) {
    console.warn(`${nombre}="${crudo}" no es válido; se usa ${porDefecto}.`);
    return porDefecto;
  }
  return valor;
}
