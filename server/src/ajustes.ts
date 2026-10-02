// Ajustes del taller que se cambian desde /admin → Configuración. Cada ajuste se
// define una vez en AJUSTES (qué es, cómo se muestra y qué valores acepta) y su
// valor vive en la tabla config (clave/valor). La variable de entorno, si hay,
// solo da el valor inicial: lo que se guarda desde /admin manda.
//
// Para sumar uno alcanza con agregarlo a AJUSTES (y, si es de un tipo nuevo, su
// validación en `validar` y su lectura en `desdeTexto`). El PIN NO es un ajuste:
// se cambia aparte, pidiendo el actual (ver auth.ts).
import { db } from "./db.js";
import { ErrorValidacion } from "./errores.js";

// Tipos de ajuste: número entero (con "−" / "+"), sí/no (interruptor) y texto
// (los mensajes de post-venta, el link de reseñas).
export type TipoAjuste = "entero" | "booleano" | "texto";

// En qué tarjeta de Configuración aparece cada ajuste.
export type GrupoAjuste = "showroom" | "postventa";

interface AjusteBase {
  clave: string;
  grupo: GrupoAjuste;
  etiqueta: string;
  ayuda: string;
}

interface AjusteEntero extends AjusteBase {
  tipo: "entero";
  min: number;
  max: number;
  porDefecto: number;
}

interface AjusteBooleano extends AjusteBase {
  tipo: "booleano";
  porDefecto: boolean;
}

interface AjusteTexto extends AjusteBase {
  tipo: "texto";
  // Largo máximo (ya sin espacios de las puntas).
  maxLargo: number;
  // Si se puede dejar vacío (el link sí: sin link la reseña no sale).
  permiteVacio: boolean;
  // "url": si no está vacío, tiene que ser un link http(s).
  formato?: "url";
  // Campo de varias líneas (los mensajes) o de una sola (el link).
  multilinea: boolean;
  porDefecto: string;
}

export type DefinicionAjuste = AjusteEntero | AjusteBooleano | AjusteTexto;
export type ValorAjuste = number | boolean | string;
export type AjusteConValor = DefinicionAjuste & { valor: ValorAjuste };

// Ayuda común a los dos mensajes de post-venta.
const AYUDA_MARCADORES =
  "Donde escribas {marca} y {modelo} va la marca y el modelo del auto; {link} se cambia por el link de reseñas. Nunca se manda la matrícula.";

export const AJUSTES = [
  {
    clave: "horas_visible_terminado",
    grupo: "showroom",
    etiqueta: "Horas que un auto terminado sigue en el showroom",
    ayuda:
      "Cuando todos sus trabajos están terminados, el auto se sigue mostrando esta cantidad de horas y después desaparece solo.",
    tipo: "entero",
    min: 1,
    max: 72,
    porDefecto: enteroDeEntorno("HORAS_VISIBLE_TERMINADO", 4, 1, 72),
  },

  // --- Post-venta por WhatsApp (ver postventa.ts) ---
  // Días y meses se aplican al retirar el auto (cambiarlos vale para los
  // próximos retiros); lo demás se mira justo antes de mandar cada mensaje.
  {
    clave: "postventa_resena_activa",
    grupo: "postventa",
    etiqueta: "Pedir reseña después del retiro",
    ayuda:
      "Unos días después de que el cliente retira el auto, le llega un WhatsApp pidiéndole una reseña. Solo a los clientes que aceptaron recibir mensajes.",
    tipo: "booleano",
    porDefecto: true,
  },
  {
    clave: "postventa_resena_dias",
    grupo: "postventa",
    etiqueta: "Días después del retiro para pedir la reseña",
    ayuda: "Cuenta desde que se retira el auto. Un cambio vale para los próximos retiros.",
    tipo: "entero",
    min: 1,
    max: 60,
    porDefecto: 3,
  },
  {
    clave: "postventa_resena_link",
    grupo: "postventa",
    etiqueta: "Link para dejar la reseña",
    ayuda:
      "El link de reseñas de Google del taller (empieza con https://). Mientras esté vacío, el pedido de reseña no se manda.",
    tipo: "texto",
    maxLargo: 300,
    permiteVacio: true,
    formato: "url",
    multilinea: false,
    porDefecto: "",
  },
  {
    clave: "postventa_resena_texto",
    grupo: "postventa",
    etiqueta: "Mensaje para pedir la reseña",
    ayuda: AYUDA_MARCADORES,
    tipo: "texto",
    maxLargo: 600,
    permiteVacio: false,
    multilinea: true,
    porDefecto:
      "¡Hola! Gracias por confiar en ML Center con tu {marca} {modelo}. Si te gustó el trabajo, nos ayudás mucho dejándonos una reseña acá: {link}",
  },
  {
    clave: "postventa_mantenimiento_activo",
    grupo: "postventa",
    etiqueta: "Recordar el mantenimiento del vitrificado",
    ayuda:
      "Meses después del retiro, a los autos que tuvieron vitrificado les llega un WhatsApp para coordinar el mantenimiento. Solo a los clientes que aceptaron recibir mensajes.",
    tipo: "booleano",
    porDefecto: true,
  },
  {
    clave: "postventa_mantenimiento_meses",
    grupo: "postventa",
    etiqueta: "Meses después del retiro para recordar el mantenimiento",
    ayuda: "Cuenta desde que se retira el auto. Un cambio vale para los próximos retiros.",
    tipo: "entero",
    min: 1,
    max: 36,
    porDefecto: 6,
  },
  {
    clave: "postventa_mantenimiento_texto",
    grupo: "postventa",
    etiqueta: "Mensaje para recordar el mantenimiento",
    ayuda: AYUDA_MARCADORES,
    tipo: "texto",
    maxLargo: 600,
    permiteVacio: false,
    multilinea: true,
    porDefecto:
      "¡Hola! Ya pasaron unos meses desde el vitrificado de tu {marca} {modelo}. Es un buen momento para hacerle el mantenimiento y que siga protegido. Escribinos por acá y coordinamos un día.",
  },
  {
    clave: "postventa_hora_desde",
    grupo: "postventa",
    etiqueta: "Mandar mensajes desde las (hora)",
    ayuda:
      "Los mensajes de post-venta solo salen dentro de este horario (hora de la PC servidor). Si vencen fuera de hora, esperan.",
    tipo: "entero",
    min: 0,
    max: 23,
    porDefecto: 10,
  },
  {
    clave: "postventa_hora_hasta",
    grupo: "postventa",
    etiqueta: "Mandar mensajes hasta las (hora)",
    ayuda: "Hasta esta hora, sin incluirla: con 19, el último sale antes de las 19:00.",
    tipo: "entero",
    min: 1,
    max: 24,
    porDefecto: 19,
  },
  {
    clave: "postventa_domingos",
    grupo: "postventa",
    etiqueta: "Mandar también los domingos",
    ayuda: "Apagado, lo que vence un domingo sale el lunes, dentro del horario.",
    tipo: "booleano",
    porDefecto: false,
  },
  {
    clave: "postventa_espaciado_min",
    grupo: "postventa",
    etiqueta: "Minutos entre un mensaje de post-venta y el siguiente",
    ayuda:
      "Para no mandar muchos de golpe (WhatsApp lo puede tomar como spam). Los avisos del taller (entró, arrancamos, listo) no esperan.",
    tipo: "entero",
    min: 0,
    max: 120,
    porDefecto: 3,
  },
] as const satisfies readonly DefinicionAjuste[];

export type ClaveAjuste = (typeof AJUSTES)[number]["clave"];

// Qué devuelve leerAjuste según el tipo del ajuste pedido.
interface ValorPorTipo {
  entero: number;
  booleano: boolean;
  texto: string;
}
type ValorDe<C extends ClaveAjuste> =
  ValorPorTipo[Extract<(typeof AJUSTES)[number], { clave: C }>["tipo"]];

// Valor actual del ajuste: el guardado en config o, si no hay (o no sirve), el
// valor por defecto. Se lee en cada llamada: un cambio vale al instante.
export function leerAjuste<C extends ClaveAjuste>(clave: C): ValorDe<C> {
  const definicion = buscar(clave);
  if (!definicion) throw new Error(`Ajuste desconocido: ${clave}`);
  const fila = db
    .prepare("SELECT valor FROM config WHERE clave = ?")
    .get(clave) as { valor: string } | undefined;
  const valor = fila === undefined ? undefined : desdeTexto(definicion, fila.valor);
  return (valor ?? definicion.porDefecto) as ValorDe<C>;
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
 * (clave conocida, tipo, rango o largo, y que el horario de post-venta tenga
 * sentido) y recién después guarda, en una transacción: o se guardan todos o
 * ninguno. Si algo no sirve, ErrorValidacion.
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
  validarHorario(validados);

  const guardar = db.prepare(
    "INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor",
  );
  db.transaction(() => {
    for (const { clave, valor } of validados) guardar.run(clave, aTexto(valor));
  })();
}

// --- Interno ---

function buscar(clave: string): DefinicionAjuste | undefined {
  return AJUSTES.find((definicion) => definicion.clave === clave);
}

// Revisa el valor que llega por la API y lo devuelve listo para guardar (los
// textos, sin espacios en las puntas). Si no sirve, ErrorValidacion con el motivo.
function validar(definicion: DefinicionAjuste, valor: unknown): ValorAjuste {
  const { etiqueta } = definicion;
  switch (definicion.tipo) {
    case "entero":
      if (typeof valor !== "number" || !Number.isInteger(valor)) {
        throw new ErrorValidacion(`"${etiqueta}" tiene que ser un número entero.`);
      }
      if (valor < definicion.min || valor > definicion.max) {
        throw new ErrorValidacion(
          `"${etiqueta}" tiene que estar entre ${definicion.min} y ${definicion.max}.`,
        );
      }
      return valor;
    case "booleano":
      if (typeof valor !== "boolean") {
        throw new ErrorValidacion(`"${etiqueta}" tiene que ser sí o no.`);
      }
      return valor;
    case "texto": {
      if (typeof valor !== "string") {
        throw new ErrorValidacion(`"${etiqueta}" tiene que ser un texto.`);
      }
      const texto = valor.trim();
      if (!texto && !definicion.permiteVacio) {
        throw new ErrorValidacion(`"${etiqueta}" no puede quedar vacío.`);
      }
      if (texto.length > definicion.maxLargo) {
        throw new ErrorValidacion(
          `"${etiqueta}" puede tener hasta ${definicion.maxLargo} letras.`,
        );
      }
      if (texto && definicion.formato === "url" && !esLink(texto)) {
        throw new ErrorValidacion(
          `"${etiqueta}" tiene que ser un link que empiece con https:// (o http://).`,
        );
      }
      return texto;
    }
  }
}

// El horario de post-venta: "desde" tiene que ser antes que "hasta". Se mira con
// lo que se está guardando y, para el que no viene, con lo que ya estaba.
function validarHorario(validados: { clave: string; valor: ValorAjuste }[]): void {
  const nuevo = (clave: ClaveAjuste) => validados.find((v) => v.clave === clave)?.valor;
  const desdeNuevo = nuevo("postventa_hora_desde");
  const hastaNuevo = nuevo("postventa_hora_hasta");
  if (desdeNuevo === undefined && hastaNuevo === undefined) return;
  const desde = Number(desdeNuevo ?? leerAjuste("postventa_hora_desde"));
  const hasta = Number(hastaNuevo ?? leerAjuste("postventa_hora_hasta"));
  if (desde >= hasta) {
    throw new ErrorValidacion(
      `El horario de los mensajes no cierra: "desde" (${desde} h) tiene que ser antes que "hasta" (${hasta} h).`,
    );
  }
}

// Cómo se guarda cada valor en config (todo es texto): sí/no como "1"/"0".
function aTexto(valor: ValorAjuste): string {
  if (typeof valor === "boolean") return valor ? "1" : "0";
  return String(valor);
}

// Lo guardado en config, ya con su tipo; undefined si no sirve (por ejemplo,
// editado a mano), y entonces leerAjuste usa el valor por defecto.
function desdeTexto(definicion: DefinicionAjuste, crudo: string): ValorAjuste | undefined {
  try {
    switch (definicion.tipo) {
      case "entero":
        return crudo.trim() === "" ? undefined : validar(definicion, Number(crudo));
      case "booleano":
        return crudo === "1" ? true : crudo === "0" ? false : undefined;
      case "texto":
        return validar(definicion, crudo);
    }
  } catch {
    return undefined;
  }
}

// ¿Es un link http(s) bien armado?
function esLink(texto: string): boolean {
  try {
    const url = new URL(texto);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname !== "";
  } catch {
    return false;
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
