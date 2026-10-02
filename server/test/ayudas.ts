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
// propio proceso), con sus backups en una subcarpeta. Sin demora: los avisos
// vencen apenas se programan. Las horas visibles no son las de fábrica (4), para
// poder ver que el valor inicial sale de la variable de entorno.
const carpeta = mkdtempSync(join(tmpdir(), "taller-tests-"));
process.env.DB_PATH = join(carpeta, "taller.db");
process.env.CARPETA_BACKUPS = join(carpeta, "backups");
process.env.AVISOS_DEMORA_MIN = "0";
process.env.HORAS_VISIBLE_TERMINADO = "6";

export const { db } = await import("../src/db.js");
export const { despacharPendientes } = await import("../src/avisos.js");
export const { ErrorDefinitivo } = await import("../src/enviadores.js");
export const { agregarServicio, cambiarEstado, quitarServicio } = await import(
  "../src/servicios.js"
);
export const {
  crearVehiculo,
  editarVehiculo,
  listarTodos,
  listarVehiculosVisibles,
  retirarVehiculo,
} = await import("../src/vehiculos.js");
export const { AJUSTES, guardarAjustes, leerAjuste, listarAjustes } = await import(
  "../src/ajustes.js"
);
export const { cambiarPin, exigirPin, limitePin, obtenerPin, verificarPin } =
  await import("../src/auth.js");
export const { MAX_FALLIDOS, MINUTOS_BLOQUEO, MINUTOS_OLVIDO, crearLimitador } =
  await import("../src/intentosPin.js");
export const {
  CARPETA_BACKUPS,
  MAX_BACKUPS,
  estadoBackups,
  hacerBackup,
  hayBackupDeHoy,
  revisarDiario,
} = await import("../src/respaldos.js");

// Los avisos cuentan todo por consola; en los tests es ruido. Quedan a mano los
// mocks por si un test quiere mirar qué se imprimió (consola.log.mock.calls).
export const consola = {
  log: mock.method(console, "log", () => {}),
  warn: mock.method(console, "warn", () => {}),
  error: mock.method(console, "error", () => {}),
};

after(() => {
  db.close();
  rmSync(carpeta, { recursive: true, force: true });
});

// Deja la base vacía (sin historial, autos, servicios ni avisos) para que cada
// test arranque de cero: el despachador manda TODO lo vencido, no solo lo del
// test. El historial va primero porque apunta a autos y servicios.
export function limpiarBase(): void {
  db.exec(
    "DELETE FROM historial; DELETE FROM avisos; DELETE FROM servicios; DELETE FROM vehiculos;",
  );
}

// Datos de auto de ejemplo (sin teléfono), para el alta y para editar.
export const DATOS_AUTO = {
  marca: "Toyota",
  modelo: "Corolla",
  color: "Gris",
  matricula: "SBA1234",
};

/**
 * Da de alta un auto por el camino real (crearVehiculo: también programa el
 * aviso "entró"), con celular salvo que se pase null. Devuelve su id y cómo
 * encontrar el id de cada uno de sus servicios.
 */
export function crearAuto(
  servicios: TipoServicio[],
  telefono: string | null = "099 123 456",
): { id: number; servicio: (tipo: TipoServicio) => number } {
  const id = crearVehiculo({ ...DATOS_AUTO, telefono }, servicios);
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

// Todas las filas de la cola, en orden (para comparar "antes" y "después").
export function leerAvisos(): FilaAviso[] {
  return db.prepare("SELECT * FROM avisos ORDER BY id").all() as FilaAviso[];
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
 * Sin `falla`, cada llamada a `enviar` queda en `enviados`.
 */
export function enviadorFalso(
  falla?: (telefono: string) => Error | undefined,
): Enviador & { enviados: { telefono: string; texto: string }[] } {
  const enviados: { telefono: string; texto: string }[] = [];
  return {
    nombre: "falso",
    enviados,
    async enviar(telefono, texto) {
      const error = falla?.(telefono);
      if (error) throw error;
      enviados.push({ telefono, texto });
    },
  };
}
