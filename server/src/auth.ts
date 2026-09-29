// Validación del PIN de /admin. IMPORTANTE: el PIN se chequea acá, en el server.
// Los endpoints que escriben usan el middleware `exigirPin`; no alcanza con
// esconder la pantalla en el front (cualquiera con la URL podría escribir igual).
// Todo intento con PIN pasa por el límite de intentos (ver intentosPin.ts).
import type { NextFunction, Request, Response } from "express";
import { db } from "./db.js";
import { ErrorValidacion } from "./errores.js";
import { crearLimitador } from "./intentosPin.js";

// Un solo limitador para todo el server: /admin y /taller comparten el PIN.
export const limitePin = crearLimitador();

// Lo que hay que responder cuando un PIN no pasa.
export interface RechazoPin {
  status: 401 | 429;
  cuerpo: { error: string; minutosRestantes?: number };
}

// PIN actual, leído de la tabla config (ver db.ts).
export function obtenerPin(): string {
  const fila = db
    .prepare("SELECT valor FROM config WHERE clave = 'pin'")
    .get() as { valor: string } | undefined;
  return fila?.valor ?? "";
}

export function pinEsValido(pin: unknown): boolean {
  return typeof pin === "string" && pin.length > 0 && pin === obtenerPin();
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
 */
export function verificarPin(
  ip: string,
  pin: unknown,
  mensaje = "PIN inválido",
): RechazoPin | null {
  const estado = limitePin.consultar(ip);
  if (estado.bloqueado) return bloqueado(estado.minutosRestantes);

  if (pinEsValido(pin)) {
    limitePin.registrarExito(ip);
    return null;
  }
  if (typeof pin === "string" && pin.length > 0) {
    const despues = limitePin.registrarFallo(ip);
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
  const rechazo = verificarPin(ip, actual, "El PIN actual no es correcto");
  if (rechazo) return rechazo;

  if (typeof nuevo !== "string" || !/^\d{4,8}$/.test(nuevo)) {
    throw new ErrorValidacion("El PIN nuevo tiene que tener de 4 a 8 números.");
  }
  if (nuevo === obtenerPin()) {
    throw new ErrorValidacion("El PIN nuevo es igual al actual.");
  }
  db.prepare("UPDATE config SET valor = ? WHERE clave = 'pin'").run(nuevo);
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
