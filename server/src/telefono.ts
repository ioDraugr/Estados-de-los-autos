// Celular del cliente para los avisos por WhatsApp. Módulo puro (no toca la
// base) para poder probarlo solo.
import { ErrorValidacion } from "./errores.js";

// Celular uruguayo: 9 + 7 dígitos, con o sin 0 adelante (099 123 456 /
// 99123456) o con el código de país (+598 99 123 456, 59899123456,
// 00598 99 123 456). Los fijos (2xxx / 4xxx) no sirven: no tienen WhatsApp.
const CELULAR_UY = /^(?:(?:\+|00)?598|0)?(9\d{7})$/;

// Lo que se escribe a mano para separar los números y no aporta nada.
const SEPARADORES = /[\s\-.()]/g;

/**
 * Normaliza el celular que carga el trabajador al formato internacional
 * (E.164) que usa WhatsApp: siempre "+5989XXXXXXX".
 * Vacío (o sin dato) => null: el teléfono es opcional.
 * Cualquier otra cosa que no sea un celular uruguayo => ErrorValidacion (400).
 */
export function normalizarTelefono(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== "string") throw errorTelefono();

  const recortado = valor.trim();
  if (!recortado) return null;

  const coincidencia = recortado.replace(SEPARADORES, "").match(CELULAR_UY);
  if (!coincidencia) throw errorTelefono();
  return `+598${coincidencia[1]}`;
}

function errorTelefono(): ErrorValidacion {
  return new ErrorValidacion(
    "Teléfono inválido: usá un celular uruguayo, por ejemplo 099 123 456.",
  );
}
