// Ayudas compartidas por los tests. Los módulos del server se importan SIEMPRE
// desde acá, nunca directo de ../src: db.ts abre la base al importarse (lee
// DB_PATH en ese momento), así que primero hay que apuntarla a una base
// descartable y recién después cargar el código. Nunca se toca data/taller.db
// ni se carga whatsapp.ts: los envíos son de mentira (enviadorFalso).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, mock } from "node:test";
import type { TipoAviso } from "../src/avisos.js";
import type { Enviador } from "../src/enviadores.js";
import type { TipoServicio } from "../src/tipos.js";

// Una base nueva por archivo de test (node --test corre cada archivo en su
// propio proceso). Sin demora: los avisos vencen apenas se programan.
const carpeta = mkdtempSync(join(tmpdir(), "taller-tests-"));
process.env.DB_PATH = join(carpeta, "taller.db");
process.env.AVISOS_DEMORA_MIN = "0";

export const { db } = await import("../src/db.js");
export const { despacharPendientes } = await import("../src/avisos.js");
export const { ErrorDefinitivo } = await import("../src/enviadores.js");
export const { cambiarEstado } = await import("../src/servicios.js");
export const { crearVehiculo } = await import("../src/vehiculos.js");

// Los avisos cuentan todo por consola; en los tests es ruido.
for (const metodo of ["log", "warn", "error"] as const) {
  mock.method(console, metodo, () => {});
}

after(() => {
  db.close();
  rmSync(carpeta, { recursive: true, force: true });
});

// Deja la base vacía (sin autos, servicios ni avisos) para que cada test arranque
// de cero: el despachador manda TODO lo vencido, no solo lo del test.
export function limpiarBase(): void {
  db.exec("DELETE FROM avisos; DELETE FROM servicios; DELETE FROM vehiculos;");
}

/**
 * Da de alta un auto por el camino real (crearVehiculo: también programa el
 * aviso "entró"), con celular salvo que se pase null. Devuelve su id y cómo
 * encontrar el id de cada uno de sus servicios.
 */
export function crearAuto(
  servicios: TipoServicio[],
  telefono: string | null = "099 123 456",
): { id: number; servicio: (tipo: TipoServicio) => number } {
  const id = crearVehiculo(
    { marca: "Toyota", modelo: "Corolla", color: "Gris", matricula: "SBA1234", telefono },
    servicios,
  );
  const servicio = (tipo: TipoServicio): number => {
    const fila = db
      .prepare(
        "SELECT id FROM servicios WHERE vehiculo_id = ? AND tipo = ? AND eliminado_en IS NULL",
      )
      .get(id, tipo) as { id: number } | undefined;
    if (!fila) throw new Error(`El auto ${id} no tiene el servicio ${tipo}.`);
    return fila.id;
  };
  return { id, servicio };
}

export interface FilaAviso {
  id: number;
  vehiculo_id: number;
  tipo: TipoAviso;
  estado: "pendiente" | "enviado" | "cancelado" | "sin_telefono" | "fallido";
  enviar_en: string;
  intentos: number;
  ultimo_error: string | null;
  enviado_en: string | null;
}

// La fila del aviso `tipo` del auto, o undefined si nunca se programó.
export function leerAviso(vehiculoId: number, tipo: TipoAviso): FilaAviso | undefined {
  return db
    .prepare("SELECT * FROM avisos WHERE vehiculo_id = ? AND tipo = ?")
    .get(vehiculoId, tipo) as FilaAviso | undefined;
}

// Adelanta el reloj de los pendientes: los que esperan un reintento quedan
// vencidos, para que la próxima pasada del despachador los tome ya.
export function vencerPendientes(): void {
  db.prepare(
    "UPDATE avisos SET enviar_en = datetime('now', '-1 minute') WHERE estado = 'pendiente'",
  ).run();
}

/**
 * Envío de mentira: anota lo que "manda" en `enviados`. Si se pasa `falla`, en
 * cada envío tira el error que devuelva (si devuelve undefined, el envío sale).
 */
export function enviadorFalso(
  falla?: () => Error | undefined,
): Enviador & { enviados: { telefono: string; texto: string }[] } {
  const enviados: { telefono: string; texto: string }[] = [];
  return {
    nombre: "falso",
    enviados,
    async enviar(telefono, texto) {
      const error = falla?.();
      if (error) throw error;
      enviados.push({ telefono, texto });
    },
  };
}
