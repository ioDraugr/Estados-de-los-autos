// Ajustes del taller que se cambian desde /admin → Configuración. Cada ajuste se
// define una vez en AJUSTES (qué es, cómo se muestra y qué valores acepta) y su
// valor vive en la tabla config (clave/valor). La variable de entorno, si hay,
// solo da el valor inicial: lo que se guarda desde /admin manda.
//
// Hay dos tipos: "entero" (con mínimo y máximo) y "texto" (con largo máximo;
// vacío vale). Para sumar uno alcanza con agregarlo a AJUSTES (y, si es de un
// tipo nuevo, su validación en `validar` y `esValido`). El PIN NO es un ajuste:
// se cambia aparte, pidiendo el actual (ver auth.ts).
import { db } from "./db.js";
import { ErrorValidacion } from "./errores.js";

export type TipoAjuste = "entero" | "texto";

interface AjusteEntero {
  clave: string;
  etiqueta: string;
  ayuda: string;
  tipo: "entero";
  min: number;
  max: number;
  porDefecto: number;
}

// Texto libre (ej. los cuidados del aviso de "listo"). Se guarda sin los
// espacios de las puntas; vacío vale (el que lo usa decide qué significa).
interface AjusteTexto {
  clave: string;
  etiqueta: string;
  ayuda: string;
  tipo: "texto";
  maxLargo: number;
  porDefecto: string;
}

export type DefinicionAjuste = AjusteEntero | AjusteTexto;
export type ValorAjuste = number | string;
export type AjusteConValor =
  | (AjusteEntero & { valor: number })
  | (AjusteTexto & { valor: string });

// Largo máximo de los textos (los cuidados van dentro de un WhatsApp).
const MAX_LARGO_TEXTO = 800;

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
  // Cuidados que se suman al WhatsApp de "listo", uno por servicio que se le
  // hizo al auto (ver avisos.ts). Los textos iniciales los aprobó el taller.
  {
    clave: "cuidados_instalacion",
    etiqueta: "Cuidados de la instalación (aviso de listo)",
    ayuda:
      'Va al final del WhatsApp de "listo" si el auto tuvo instalación. Vacío = no se manda nada.',
    tipo: "texto",
    maxLargo: MAX_LARGO_TEXTO,
    porDefecto:
      "Antes de irte probá que todo funcione como esperabas. No desconectes la batería ni toques el cableado de lo que instalamos sin consultarnos. Si notás cualquier falla o tenés una duda, escribinos por acá.",
  },
  {
    clave: "cuidados_polarizado",
    etiqueta: "Cuidados del polarizado (aviso de listo)",
    ayuda:
      'Va al final del WhatsApp de "listo" si el auto tuvo polarizado. Vacío = no se manda nada.',
    tipo: "texto",
    maxLargo: MAX_LARGO_TEXTO,
    porDefecto:
      "No bajes las ventanillas durante 2 días para que la lámina se asiente bien. Es normal ver alguna burbuja o zona empañada los primeros días: desaparece sola a medida que se seca. Para limpiar los vidrios usá un paño suave con agua o un limpiador sin amoníaco.",
  },
  {
    clave: "cuidados_vitrificado",
    etiqueta: "Cuidados del vitrificado (aviso de listo)",
    ayuda:
      'Va al final del WhatsApp de "listo" si el auto tuvo vitrificado. Vacío = no se manda nada.',
    tipo: "texto",
    maxLargo: MAX_LARGO_TEXTO,
    porDefecto:
      "Durante los primeros 7 días no lo laves y, si podés, evitá dejarlo bajo la lluvia. Después lavalo a mano con shampoo neutro y paño de microfibra; evitá los lavaderos con cepillos y los productos con cera o abrasivos. Si le cae caca de pájaro o resina, sacala cuanto antes con agua.",
  },
] as const satisfies readonly DefinicionAjuste[];

export type ClaveAjuste = (typeof AJUSTES)[number]["clave"];

// Qué devuelve leerAjuste según la clave: string para los de texto, number para
// los enteros (así vehiculos.ts hace cuentas y avisos.ts arma mensajes sin
// convertir nada).
export type ValorDe<C extends ClaveAjuste> =
  Extract<(typeof AJUSTES)[number], { clave: C }>["tipo"] extends "texto" ? string : number;

// Valor actual del ajuste: el guardado en config o, si no hay (o no sirve), el
// valor por defecto. Se lee en cada llamada: un cambio vale al instante.
export function leerAjuste<C extends ClaveAjuste>(clave: C): ValorDe<C> {
  const definicion = buscar(clave);
  if (!definicion) throw new Error(`Ajuste desconocido: ${clave}`);
  return leerValor(definicion) as ValorDe<C>;
}

// Todos los ajustes, con su definición y su valor actual (para la pantalla).
export function listarAjustes(): AjusteConValor[] {
  return AJUSTES.map(
    (definicion: DefinicionAjuste) =>
      ({ ...definicion, valor: leerValor(definicion) }) as AjusteConValor,
  );
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
    return { clave, valor: validar(definicion, valor) };
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

// Lo guardado en config (siempre texto) pasado al tipo del ajuste; si no hay
// nada o no sirve (ej. editado a mano), el valor por defecto.
function leerValor(definicion: DefinicionAjuste): ValorAjuste {
  const fila = db
    .prepare("SELECT valor FROM config WHERE clave = ?")
    .get(definicion.clave) as { valor: string } | undefined;
  if (fila === undefined) return definicion.porDefecto;
  const valor = definicion.tipo === "entero" ? Number(fila.valor) : fila.valor;
  return esValido(definicion, valor) ? valor : definicion.porDefecto;
}

function esValido(definicion: DefinicionAjuste, valor: unknown): boolean {
  switch (definicion.tipo) {
    case "entero":
      return (
        typeof valor === "number" &&
        Number.isInteger(valor) &&
        valor >= definicion.min &&
        valor <= definicion.max
      );
    case "texto":
      return typeof valor === "string" && valor.length <= definicion.maxLargo;
  }
}

// Revisa el valor que llegó y devuelve cómo se guarda en config (como texto).
// Si no sirve, ErrorValidacion con un mensaje para mostrar en la pantalla.
function validar(definicion: DefinicionAjuste, valor: unknown): string {
  switch (definicion.tipo) {
    case "entero":
      if (typeof valor !== "number" || !Number.isInteger(valor)) {
        throw new ErrorValidacion(`"${definicion.etiqueta}" tiene que ser un número entero.`);
      }
      if (!esValido(definicion, valor)) {
        throw new ErrorValidacion(
          `"${definicion.etiqueta}" tiene que estar entre ${definicion.min} y ${definicion.max}.`,
        );
      }
      return String(valor);
    case "texto": {
      if (typeof valor !== "string") {
        throw new ErrorValidacion(`"${definicion.etiqueta}" tiene que ser un texto.`);
      }
      const texto = valor.trim();
      if (!esValido(definicion, texto)) {
        throw new ErrorValidacion(
          `"${definicion.etiqueta}" puede tener hasta ${definicion.maxLargo} caracteres (tiene ${texto.length}).`,
        );
      }
      return texto;
    }
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
