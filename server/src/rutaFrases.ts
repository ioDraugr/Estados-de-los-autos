// GET /api/frases: las frases de la bienvenida del showroom, PÚBLICA (sin PIN)
// para que /display las pida. Devuelve solo { frases } y nada más de la
// configuración. Va en un Router aparte para poder probarla sin levantar todo el
// server (ver test/frases.test.ts).
import { Router } from "express";
import { frasesBienvenida } from "./ajustes.js";

export const rutaFrases = Router();

rutaFrases.get("/api/frases", (_req, res) => {
  try {
    res.json(frasesBienvenida());
  } catch (error) {
    console.error("Error en leer frases:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});
