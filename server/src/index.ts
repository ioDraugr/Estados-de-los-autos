// Servidor del taller: Express (API REST + sirve el build del front) + Socket.IO.
// Corre local en la red del taller, sin internet.
import express, { type Response } from "express";
import { createServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "./db.js"; // inicializa la base y crea las tablas
import { exigirPin, pinEsValido } from "./auth.js";
import { ErrorValidacion } from "./errores.js";
import { sembrarSiVacia } from "./seed.js";
import {
  agregarServicio,
  cambiarEstado,
  quitarServicio,
} from "./servicios.js";
import {
  crearVehiculo,
  editarVehiculo,
  listarTodos,
  listarVehiculosVisibles,
  retirarVehiculo,
} from "./vehiculos.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// La primera vez que arranca, deja unos autos de ejemplo para poder ver el
// tablero funcionando. Después de eso no vuelve a tocar los datos.
sembrarSiVacia();

const app = express();
app.use(express.json());

// --- Servidor HTTP + Socket.IO ---
// Lo creamos ANTES de las rutas para que los endpoints puedan avisar los cambios.
const httpServer = createServer(app);
const io = new SocketServer(httpServer);

// Aviso genérico "algo cambió": /display responde volviendo a pedir la lista.
// Lo llaman los endpoints de escritura después de guardar con éxito en la DB.
function emitirCambio(): void {
  io.emit("vehiculos:cambio");
}

// --- API REST ---
// Helper: corre un handler y traduce los errores a la respuesta HTTP adecuada.
// ErrorValidacion => 400 (datos del cliente); cualquier otro => 500.
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Login: valida el PIN para que el front rechace uno mal al iniciar. Igual cada
// endpoint que escribe revalida el PIN por su cuenta (exigirPin).
app.post("/api/login", (req, res) => {
  if (pinEsValido(req.body?.pin)) {
    res.json({ ok: true });
    return;
  }
  res.status(401).json({ error: "PIN inválido" });
});

// Autos a mostrar. Sin parámetros: los del showroom (/display). Con ?todos=1:
// todos los no retirados, incluidos los terminados hace rato (para /admin).
app.get("/api/vehiculos", (req, res) => {
  manejar(res, "listar vehículos", () => {
    const lista = req.query.todos ? listarTodos() : listarVehiculosVisibles();
    res.json(lista);
  });
});

// Alta de un auto con sus servicios iniciales.
app.post("/api/vehiculos", exigirPin, (req, res) => {
  manejar(res, "crear vehículo", () => {
    const { marca, modelo, color, matricula, servicios } = req.body ?? {};
    const id = crearVehiculo({ marca, modelo, color, matricula }, servicios);
    emitirCambio();
    res.status(201).json({ id });
  });
});

// Editar los datos de un auto (no toca fecha_ingreso ni servicios).
app.patch("/api/vehiculos/:id", exigirPin, (req, res) => {
  manejar(res, "editar vehículo", () => {
    const { marca, modelo, color, matricula } = req.body ?? {};
    const ok = editarVehiculo(Number(req.params.id), {
      marca,
      modelo,
      color,
      matricula,
    });
    if (!ok) {
      res.status(404).json({ error: "Auto no encontrado" });
      return;
    }
    emitirCambio();
    res.json({ ok: true });
  });
});

// Retirar un auto (soft delete): sale de las vistas al instante.
app.post("/api/vehiculos/:id/retirar", exigirPin, (req, res) => {
  manejar(res, "retirar vehículo", () => {
    const ok = retirarVehiculo(Number(req.params.id));
    if (!ok) {
      res.status(404).json({ error: "Auto no encontrado" });
      return;
    }
    emitirCambio();
    res.json({ ok: true });
  });
});

// Agregar un servicio a un auto existente.
app.post("/api/vehiculos/:id/servicios", exigirPin, (req, res) => {
  manejar(res, "agregar servicio", () => {
    agregarServicio(Number(req.params.id), req.body?.tipo);
    emitirCambio();
    res.status(201).json({ ok: true });
  });
});

// Cambiar el estado de un servicio.
app.patch("/api/servicios/:id", exigirPin, (req, res) => {
  manejar(res, "cambiar estado", () => {
    const ok = cambiarEstado(Number(req.params.id), req.body?.estado);
    if (!ok) {
      res.status(404).json({ error: "Servicio no encontrado" });
      return;
    }
    emitirCambio();
    res.json({ ok: true });
  });
});

// Quitar un servicio (soft delete). Falla si es el último activo del auto.
app.delete("/api/servicios/:id", exigirPin, (req, res) => {
  manejar(res, "quitar servicio", () => {
    const ok = quitarServicio(Number(req.params.id));
    if (!ok) {
      res.status(404).json({ error: "Servicio no encontrado" });
      return;
    }
    emitirCambio();
    res.json({ ok: true });
  });
});

// --- Front (build de Vite) ---
// En producción servimos client/dist. En dev el front corre con `vite` (:5173)
// y hace proxy de /api y /socket.io hacia acá.
const distFront = join(__dirname, "..", "..", "client", "dist");
app.use(express.static(distFront));
// Cualquier ruta no-API cae en el index.html (React Router del lado del cliente).
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(join(distFront, "index.html"));
});

// --- Conexiones de Socket.IO ---
// Los eventos de cambio se emiten desde los endpoints (ver emitirCambio).
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor del taller escuchando en http://localhost:${PORT}`);
});
