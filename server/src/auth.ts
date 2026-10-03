// Validación del PIN de /admin y del PIN del dueño (/reportes). IMPORTANTE: el PIN se chequea acá, en el server.
// Los endpoints que escriben usan el middleware `exigirPin`; no alcanza con
// esconder la pantalla en el front (cualquiera con la URL podría escribir igual).
// Todo intento con PIN pasa por el límite de intentos (ver intentosPin.ts).
import type { NextFunction, Request, Response } from "express";
import { db } from "./db.js";
import { ErrorValidacion } from "./errores.js";
import { crearLimitador, type LimitadorPin } from "./intentosPin.js";

// Un solo limitador para todo el server: /admin y /taller comparten el PIN.
export const limitePin = crearLimitador();

// El PIN del dueño (/reportes) tiene su propio limitador, con las mismas reglas.
// Separado a propósito: si fuera el mismo, un vendedor que se equivoca con el
// PIN de /admin le bloquearía /reportes al dueño en esa tablet (y al revés), y
// cada PIN tiene su propia cuenta de 5 intentos.
export const limitePinReportes = crearLimitador();

// Lo que hay que responder cuando un PIN no pasa.
export interface RechazoPin {
  status: 401 | 429;
  // motivo "pin_actual": el 401 es por el PIN actual del cambio de PIN (el del
  // header sirve), así el front no desloguea. motivo "sin_pin_reportes": el
  // dueño todavía no creó su PIN (el front muestra la pantalla para crearlo).
  cuerpo: {
    error: string;
    minutosRestantes?: number;
    motivo?: "pin_actual" | "sin_pin_reportes";
  };
}

// Claves de los PIN en la tabla config: el de /admin (y /taller) y el del dueño.
const CLAVE_PIN = "pin";
const CLAVE_PIN_REPORTES = "pin_reportes";

// Lee un PIN de config ("" si no hay).
function leerPin(clave: string): string {
  const fila = db
    .prepare("SELECT valor FROM config WHERE clave = ?")
    .get(clave) as { valor: string } | undefined;
  return fila?.valor ?? "";
}

// PIN actual, leído de la tabla config (ver db.ts).
export function obtenerPin(): string {
  return leerPin(CLAVE_PIN);
}

// PIN del dueño para /reportes ("" si todavía no lo creó).
export function obtenerPinReportes(): string {
  return leerPin(CLAVE_PIN_REPORTES);
}

export function hayPinReportes(): boolean {
  return obtenerPinReportes() !== "";
}

export function pinEsValido(pin: unknown): boolean {
  return typeof pin === "string" && pin.length > 0 && pin === obtenerPin();
}

// Mismas reglas para los dos PIN: de 4 a 8 números.
function formatoDePin(nuevo: unknown): nuevo is string {
  return typeof nuevo === "string" && /^\d{4,8}$/.test(nuevo);
}

// IP del dispositivo que hace el pedido (sin proxy delante: la del socket).
export function ipDe(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "desconocida";
}

/**
 * Chequea el PIN que manda el dispositivo `ip`, contando los fallos. Devuelve
 * null si está bien, o el rechazo a responder: 429 si la IP está bloqueada (o
 * este fallo la bloqueó), 401 con `mensaje` si el PIN está mal. Un PIN vacío
 * es 401 pero no cuenta como intento (no es adivinar).
 *
 * Solo el login (`reiniciarFallos`) pone los fallos en cero. Si lo hiciera
 * cualquier pedido con el PIN guardado bien, en el cambio de PIN el header
 * borraría los fallos del PIN actual y se podría adivinar sin límite.
 */
export function verificarPin(
  ip: string,
  pin: unknown,
  opciones: OpcionesVerificar = {},
): RechazoPin | null {
  return verificarContra(limitePin, obtenerPin(), ip, pin, opciones);
}

/**
 * Lo mismo que verificarPin, pero con el PIN del dueño y su limitador. Si el
 * dueño todavía no creó su PIN, es 401 con motivo "sin_pin_reportes" y no
 * cuenta como intento (no hay nada que adivinar). El PIN de /admin NO sirve acá.
 */
export function verificarPinReportes(
  ip: string,
  pin: unknown,
  opciones: OpcionesVerificar = {},
): RechazoPin | null {
  const guardado = obtenerPinReportes();
  if (!guardado) {
    return {
      status: 401,
      cuerpo: { error: "Todavía no hay PIN de reportes.", motivo: "sin_pin_reportes" },
    };
  }
  return verificarContra(limitePinReportes, guardado, ip, pin, opciones);
}

interface OpcionesVerificar {
  mensaje?: string;
  reiniciarFallos?: boolean;
}

// El chequeo con límite de intentos, para cualquiera de los dos PIN.
function verificarContra(
  limite: LimitadorPin,
  guardado: string,
  ip: string,
  pin: unknown,
  { mensaje = "PIN inválido", reiniciarFallos = false }: OpcionesVerificar,
): RechazoPin | null {
  const estado = limite.consultar(ip);
  if (estado.bloqueado) return bloqueado(estado.minutosRestantes);

  if (typeof pin === "string" && pin.length > 0 && pin === guardado) {
    if (reiniciarFallos) limite.registrarExito(ip);
    return null;
  }
  if (typeof pin === "string" && pin.length > 0) {
    const despues = limite.registrarFallo(ip);
    if (despues.bloqueado) return bloqueado(despues.minutosRestantes);
  }
  return { status: 401, cuerpo: { error: mensaje } };
}

// Middleware para las rutas que modifican datos: exige el header `x-pin`.
export function exigirPin(req: Request, res: Response, next: NextFunction): void {
  const rechazo = verificarPin(ipDe(req), req.header("x-pin"));
  if (rechazo) {
    res.status(rechazo.status).json(rechazo.cuerpo);
    return;
  }
  next();
}

// Middleware de /reportes: exige el PIN del dueño en el header `x-pin-reportes`.
// El de /admin no abre los reportes (ni en este header ni en `x-pin`).
export function exigirPinReportes(req: Request, res: Response, next: NextFunction): void {
  const rechazo = verificarPinReportes(ipDe(req), req.header("x-pin-reportes"));
  if (rechazo) {
    res.status(rechazo.status).json(rechazo.cuerpo);
    return;
  }
  next();
}

/**
 * Cambia el PIN (compartido por /admin y /taller). `actual` tiene que ser el
 * PIN de ahora: si está mal cuenta como intento fallido y se devuelve el
 * rechazo. El nuevo: de 4 a 8 números y distinto del actual (si no,
 * ErrorValidacion). Los otros dispositivos quedan con el PIN viejo: en su
 * próximo pedido reciben 401 y vuelven a la pantalla del PIN.
 */
export function cambiarPin(
  ip: string,
  actual: unknown,
  nuevo: unknown,
): RechazoPin | null {
  const rechazo = verificarPin(ip, actual, { mensaje: "El PIN actual no es correcto" });
  if (rechazo?.status === 401) rechazo.cuerpo.motivo = "pin_actual";
  if (rechazo) return rechazo;

  if (!formatoDePin(nuevo)) {
    throw new ErrorValidacion("El PIN nuevo tiene que tener de 4 a 8 números.");
  }
  if (nuevo === obtenerPin()) {
    throw new ErrorValidacion("El PIN nuevo es igual al actual.");
  }
  // OJO: a propósito NO se rechaza un PIN nuevo igual al del dueño. Avisarlo
  // le diría a quien sabe el PIN de /admin cuál es el de /reportes (podría
  // probar PINs acá sin límite hasta que salte el aviso).
  db.prepare("UPDATE config SET valor = ? WHERE clave = ?").run(nuevo, CLAVE_PIN);
  return null;
}

/**
 * Crea el PIN del dueño la primera vez. Quien llama ya validó el PIN de /admin
 * (la ruta usa exigirPin): así no lo inventa el primero que llega a /reportes.
 * El nuevo: de 4 a 8 números y distinto del de /admin (si no, ErrorValidacion;
 * quien lo crea ya sabe el de /admin, así que el aviso no revela nada).
 * Devuelve false si ya había uno (no se pisa: para cambiarlo hay que saberlo).
 */
export function crearPinReportes(nuevo: unknown): boolean {
  if (!formatoDePin(nuevo)) {
    throw new ErrorValidacion("El PIN tiene que tener de 4 a 8 números.");
  }
  if (nuevo === obtenerPin()) {
    throw new ErrorValidacion("El PIN de reportes no puede ser igual al de /admin.");
  }
  // INSERT OR IGNORE: si dos lo crean a la vez, gana el primero y el otro ve false.
  const { changes } = db
    .prepare("INSERT OR IGNORE INTO config (clave, valor) VALUES (?, ?)")
    .run(CLAVE_PIN_REPORTES, nuevo);
  return changes > 0;
}

/**
 * Cambia el PIN del dueño, igual que cambiarPin pero con su limitador: el
 * actual mal cuenta como intento fallido. El nuevo: de 4 a 8 números, distinto
 * del actual y del de /admin. (Ese último aviso le deja saber al dueño el PIN
 * de /admin, pero el dueño es quien manda: no es un secreto para él.)
 */
export function cambiarPinReportes(
  ip: string,
  actual: unknown,
  nuevo: unknown,
): RechazoPin | null {
  const rechazo = verificarPinReportes(ip, actual, {
    mensaje: "El PIN actual no es correcto",
  });
  if (rechazo?.status === 401 && !rechazo.cuerpo.motivo) rechazo.cuerpo.motivo = "pin_actual";
  if (rechazo) return rechazo;

  if (!formatoDePin(nuevo)) {
    throw new ErrorValidacion("El PIN nuevo tiene que tener de 4 a 8 números.");
  }
  if (nuevo === obtenerPinReportes()) {
    throw new ErrorValidacion("El PIN nuevo es igual al actual.");
  }
  if (nuevo === obtenerPin()) {
    throw new ErrorValidacion("El PIN de reportes no puede ser igual al de /admin.");
  }
  db.prepare("UPDATE config SET valor = ? WHERE clave = ?").run(nuevo, CLAVE_PIN_REPORTES);
  return null;
}

function bloqueado(minutosRestantes: number): RechazoPin {
  return {
    status: 429,
    cuerpo: {
      error: `Demasiados intentos. Probá de nuevo en ${minutosRestantes} min.`,
      minutosRestantes,
    },
  };
}
