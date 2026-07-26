// Servidor del taller: Express (API REST + sirve el build del front) + Socket.IO.
// Corre local en la red del taller, sin internet.
import express from "express";
import { createServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "./db.js"; // inicializa la base y crea las tablas
import { sembrarSiVacia } from "./seed.js";
import { listarVehiculosVisibles } from "./vehiculos.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// La primera vez que arranca, deja unos autos de ejemplo para poder ver el
// tablero funcionando. Después de eso no vuelve a tocar los datos.
sembrarSiVacia();

const app = express();
app.use(express.json());

// --- API REST ---
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Autos que se muestran en el showroom. En la Fase 3, /admin va a necesitar
// también los ya entregados (con un ?todos=1).
app.get("/api/vehiculos", (_req, res) => {
  try {
    res.json(listarVehiculosVisibles());
  } catch (error) {
    console.error("Error al listar vehículos:", error);
    res.status(500).json({ error: "No se pudieron obtener los vehículos" });
  }
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

// --- Servidor HTTP + Socket.IO ---
// Socket.IO queda enganchado y listo, pero todavía no emitimos eventos (Fase 1).
const httpServer = createServer(app);
const io = new SocketServer(httpServer);

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor del taller escuchando en http://localhost:${PORT}`);
});
