// Validación del PIN de /admin. IMPORTANTE: el PIN se chequea acá, en el server.
// Los endpoints que escriben usan el middleware `exigirPin`; no alcanza con
// esconder la pantalla en el front (cualquiera con la URL podría escribir igual).
import type { NextFunction, Request, Response } from "express";
import { db } from "./db.js";

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

// Middleware para las rutas que modifican datos: exige el header `x-pin`.
export function exigirPin(req: Request, res: Response, next: NextFunction): void {
  if (pinEsValido(req.header("x-pin"))) {
    next();
    return;
  }
  res.status(401).json({ error: "PIN inválido" });
}
