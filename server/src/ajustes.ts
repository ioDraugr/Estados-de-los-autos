// Ajustes del taller que se cambian desde /admin → Configuración. Cada ajuste se
// define una vez en AJUSTES (qué es, cómo se muestra y qué valores acepta) y su
// valor vive en la tabla config (clave/valor). La variable de entorno, si hay,
// solo da el valor inicial: lo que se guarda desde /admin manda.
//
// Para sumar uno (ej. un texto de los mensajes) alcanza con agregarlo a AJUSTES
// (y, si es de un tipo nuevo, su validación en `validar`). El PIN NO es un
// ajuste: se cambia aparte, pidiendo el actual (ver auth.ts).
import { db } from "./db.js";
import { ErrorValidacion } from "./errores.js";

// Por ahora solo hay números enteros; más adelante, "texto".
export type TipoAjuste = "entero";

interface AjusteEntero {
  clave: string;
  etiqueta: string;
  ayuda: string;
  tipo: "entero";
  min: number;
  max: number;
  porDefecto: number;
}

export type DefinicionAjuste = AjusteEntero;
export type ValorAjuste = number;
export type AjusteConValor = DefinicionAjuste & { valor: ValorAjuste };

export const AJUSTES = [
  {
    clave: "horas_visible_terminado",
    etiqueta: "Horas que un auto terminado sigue en el showroom",
    ayuda:
      "Cuando todos sus trabajos están terminados, el auto se sigue mostrando esta cantidad de horas y después desaparece solo.",
    tipo: "entero",
    min: 1,
    max: 72,
    porDefecto: enteroDeEntorno("HORAS_VISIBLE_TERMINADO", 4, 1, 72),
  },
] as const satisfies readonly DefinicionAjuste[];

export type ClaveAjuste = (typeof AJUSTES)[number]["clave"];

// Valor actual del ajuste: el guardado en config o, si no hay (o no sirve), el
// valor por defecto. Se lee en cada llamada: un cambio vale al instante.
export function leerAjuste(clave: ClaveAjuste): ValorAjuste {
  const definicion = buscar(clave);
  if (!definicion) throw new Error(`Ajuste desconocido: ${clave}`);
  const fila = db
    .prepare("SELECT valor FROM config WHERE clave = ?")
    .get(clave) as { valor: string } | undefined;
  if (fila === undefined) return definicion.porDefecto;
  const valor = Number(fila.valor);
  return esValido(definicion, valor) ? valor : definicion.porDefecto;
}

// Todos los ajustes, con su definición y su valor actual (para la pantalla).
export function listarAjustes(): AjusteConValor[] {
  return AJUSTES.map((definicion) => ({
    ...definicion,
    valor: leerAjuste(definicion.clave),
  }));
}

/**
 * Guarda varios ajustes juntos: `{ clave: valor, ... }`. Primero valida todos
 * (clave conocida, tipo y rango) y recién después guarda, en una transacción:
 * o se guardan todos o ninguno. Si algo no sirve, ErrorValidacion.
 */
export function guardarAjustes(cambios: unknown): void {
  if (typeof cambios !== "object" || cambios === null || Array.isArray(cambios)) {
    throw new ErrorValidacion("Los ajustes tienen que venir como { clave: valor }.");
  }
  const entradas = Object.entries(cambios);
  if (entradas.length === 0) {
    throw new ErrorValidacion("No se mandó ningún ajuste para guardar.");
  }

  const validados = entradas.map(([clave, valor]) => {
    const definicion = buscar(clave);
    if (!definicion) throw new ErrorValidacion(`Ajuste desconocido: ${clave}.`);
    validar(definicion, valor);
    return { clave, valor: String(valor) };
  });

  const guardar = db.prepare(
    "INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor",
  );
  db.transaction(() => {
    for (const { clave, valor } of validados) guardar.run(clave, valor);
  })();
}

// --- Interno ---

function buscar(clave: string): DefinicionAjuste | undefined {
  return AJUSTES.find((definicion) => definicion.clave === clave);
}

function esValido(definicion: DefinicionAjuste, valor: unknown): valor is number {
  return (
    typeof valor === "number" &&
    Number.isInteger(valor) &&
    valor >= definicion.min &&
    valor <= definicion.max
  );
}

function validar(definicion: DefinicionAjuste, valor: unknown): void {
  if (typeof valor !== "number" || !Number.isInteger(valor)) {
    throw new ErrorValidacion(`"${definicion.etiqueta}" tiene que ser un número entero.`);
  }
  if (!esValido(definicion, valor)) {
    throw new ErrorValidacion(
      `"${definicion.etiqueta}" tiene que estar entre ${definicion.min} y ${definicion.max}.`,
    );
  }
}

// Entero de una env var dentro de [min, max]; si falta, usa el default y si no
// sirve, avisa por consola y también usa el default.
function enteroDeEntorno(nombre: string, porDefecto: number, min: number, max: number): number {
  const crudo = process.env[nombre];
  if (crudo === undefined || crudo.trim() === "") return porDefecto;
  const valor = Number(crudo);
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    console.warn(
      `${nombre}="${crudo}" no es válido (entero de ${min} a ${max}); se usa ${porDefecto}.`,
    );
    return porDefecto;
  }
  return valor;
}
