# Tablero de estados — Taller ML Center

Web app **local** (sin internet) para mostrar en la pantalla táctil del showroom
el estado de los autos que están en el taller. Corre en la red del taller: una
máquina hace de servidor y el resto de los dispositivos se conectan por su IP.

Ver [CLAUDE.md](./CLAUDE.md) para el detalle del proyecto y las reglas.

## Estructura

```
proyectoML2/
├── client/   → Front: Vite + React + TypeScript + Tailwind
├── server/   → Back: Node + Express + better-sqlite3 + Socket.IO
└── CLAUDE.md
```

## Requisitos

- Node.js 20 o superior (probado con Node 24).

## Instalar

```bash
# Front
cd client && npm install

# Back
cd ../server && npm install
```

> El backend usa `better-sqlite3`, que compila un binario nativo al instalar.
> Con npm 11+ puede pedir aprobar los scripts de instalación:
> `npm approve-scripts better-sqlite3 esbuild`.

## Correr en desarrollo

Necesitás **dos terminales** (front y back por separado):

```bash
# Terminal 1 — backend en http://localhost:3000
cd server && npm run dev

# Terminal 2 — front en http://localhost:5173
cd client && npm run dev
```

Abrí **http://localhost:5173** en el navegador. La raíz redirige a `/display`
(la pantalla del showroom). En dev, el front hace proxy de `/api` y `/socket.io`
hacia el backend, así que no hace falta configurar nada más.

## Correr en producción (una sola máquina en el taller)

```bash
# 1. Buildear el front
cd client && npm run build

# 2. Buildear y arrancar el backend (sirve el front y la API en un solo puerto)
cd ../server && npm run build && npm start
```

El servidor queda en **http://localhost:3000** sirviendo todo. Desde los otros
dispositivos del taller (pantalla, tablet, PC) se accede por la IP local del
servidor, por ejemplo `http://192.168.1.50:3000`.

## Estado actual (Fase 1)

- ✅ Vista `/display` con datos de ejemplo (mock): grilla de tarjetas, conos de
  color por servicio y detalle al tocar cada auto.
- ✅ Backend Express que sirve el front y expone la API (`/api/health`).
- ✅ SQLite listo: crea las tablas `vehiculos` y `servicios` al arrancar.
- ✅ Socket.IO enganchado al server (todavía sin usar).
- ⏳ Pendiente: leer de la base, vista `/admin` con login por PIN, y tiempo real.
