// Servidor del taller: Express (API REST + sirve el build del front) + Socket.IO.
// Corre local en la red del taller, sin internet.
import express from "express";
import { createServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "./db.js"; // inicializa la base y crea las tablas

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json());

// --- API REST ---
// Fase 1: solo un healthcheck. Los endpoints de vehículos/servicios llegan
// en la próxima fase, cuando /display lea de la base.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
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
