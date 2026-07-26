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

## La base de datos

Es un solo archivo: `server/data/taller.db`. **No hay ningún paso manual de
instalación de base**: al arrancar el backend se crean las tablas si no existen
y, si la base está vacía, se cargan 8 autos de ejemplo (*seed*) para poder ver
el tablero funcionando mientras no exista `/admin`.

El seed corre una sola vez. Si la base ya tiene autos, el server lo dice en el
log y no toca nada:

```
La base ya tiene datos (8 vehículos), no se siembra.
```

Para **empezar de cero** (borra todos los datos y vuelve a sembrar):

```bash
rm server/data/taller.db*
```

## Configuración

| Variable | Default | Para qué sirve |
| --- | --- | --- |
| `PORT` | `3000` | Puerto del servidor. |
| `HORAS_VISIBLE_TERMINADO` | `4` | Cuántas horas sigue en pantalla un auto con **todos** sus servicios terminados antes de ocultarse solo. |

## API

| Endpoint | Qué devuelve |
| --- | --- |
| `GET /api/health` | `{ ok: true }`, para saber si el server está vivo. |
| `GET /api/vehiculos` | Los autos que tiene que mostrar `/display`, con sus servicios anidados, ordenados del que hace más tiempo que entró al más nuevo. Ya vienen filtrados los terminados hace más de `HORAS_VISIBLE_TERMINADO`. |

## Estado actual (Fase 2)

- ✅ Vista `/display` leyendo los autos **reales** de SQLite vía `GET /api/vehiculos`.
  Se refresca sola cada 30 s; si se cae el server, mantiene los últimos datos en
  pantalla y avisa "Sin conexión", en vez de quedar en blanco.
- ✅ Tablas + datos de ejemplo que se crean solos la primera vez.
- ✅ Los autos con todos los servicios terminados se ocultan solos a las 4 horas.
- ✅ Socket.IO enganchado al server (todavía sin emitir eventos).
- ⏳ Pendiente (Fase 3): vista `/admin` con login por PIN (único y compartido),
  alta de autos, cambio de estados, y tiempo real con Socket.IO.
