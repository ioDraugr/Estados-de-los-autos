// Rutas de /reportes (el dueño): su PIN propio y el reporte. El PIN del dueño
// vive en config (pin_reportes) y tiene su propio límite de intentos (ver
// auth.ts). El PIN de /admin NO abre los reportes: solo sirve para crear el del
// dueño la primera vez. Va en un Router aparte para poder probarlo sin levantar
// todo el server (ver test/reportes.test.ts). Necesita express.json() antes.
import { Router, type Response } from "express";
import {
  cambiarPinReportes,
  crearPinReportes,
  exigirPin,
  exigirPinReportes,
  hayPinReportes,
  ipDe,
  verificarPinReportes,
} from "./auth.js";
import { ErrorValidacion } from "./errores.js";
import { diaLocal, generarReporte } from "./reportes.js";

export const rutaReportes = Router();

// Como `manejar` de index.ts: ErrorValidacion => 400; cualquier otro => 500.
function manejar(res: Response, contexto: string, fn: () => unknown): void {
  try {
    fn();
  } catch (error) {
    if (error instanceof ErrorValidacion) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error(`Error en ${contexto}:`, error);
    res.status(500).json({ error: "Error del servidor" });
  }
}

// ¿Ya hay PIN del dueño? Pública: solo dice sí o no, para saber qué pantalla
// mostrar (crearlo o ingresarlo).
rutaReportes.get("/api/reportes/pin", (_req, res) => {
  manejar(res, "consultar PIN de reportes", () => {
    res.json({ existe: hayPinReportes() });
  });
});

// Crear el PIN del dueño: header `x-pin` con el PIN de /admin y body { nuevo }.
// 409 si ya existe (para cambiarlo hay que saber el actual).
rutaReportes.post("/api/reportes/pin", exigirPin, (req, res) => {
  manejar(res, "crear PIN de reportes", () => {
    if (!crearPinReportes(req.body?.nuevo)) {
      res.status(409).json({ error: "El PIN de reportes ya existe." });
      return;
    }
    res.status(201).json({ ok: true });
  });
});

// Login de /reportes: body { pin }. Igual que /api/login, pero con el PIN del
// dueño y su limitador: 5 mal => 429 por 5 minutos.
rutaReportes.post("/api/reportes/login", (req, res) => {
  const rechazo = verificarPinReportes(ipDe(req), req.body?.pin, { reiniciarFallos: true });
  if (rechazo) {
    res.status(rechazo.status).json(rechazo.cuerpo);
    return;
  }
  res.json({ ok: true });
});

// Cambiar el PIN del dueño: header `x-pin-reportes` y body { actual, nuevo }.
// El actual mal cuenta para el bloqueo (401 con motivo "pin_actual").
rutaReportes.post("/api/reportes/pin/cambiar", exigirPinReportes, (req, res) => {
  manejar(res, "cambiar PIN de reportes", () => {
    const rechazo = cambiarPinReportes(ipDe(req), req.body?.actual, req.body?.nuevo);
    if (rechazo) {
      res.status(rechazo.status).json(rechazo.cuerpo);
      return;
    }
    res.json({ ok: true });
  });
});

// El reporte: ?periodo=semana|mes&fecha=AAAA-MM-DD (un día cualquiera del
// período). Sin período, la semana; sin fecha, hoy. Ver reportes.ts.
rutaReportes.get("/api/reportes", exigirPinReportes, (req, res) => {
  manejar(res, "generar reporte", () => {
    const periodo = req.query.periodo ?? "semana";
    const fecha = req.query.fecha ?? diaLocal(new Date());
    res.json(generarReporte(periodo, fecha));
  });
});
