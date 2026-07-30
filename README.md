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
(la pantalla del showroom). La vista de los trabajadores está en
**http://localhost:5173/admin**. En dev, el front hace proxy de `/api` y
`/socket.io` hacia el backend, así que no hace falta configurar nada más.

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

## La vista /admin (trabajadores)

En `/admin` los trabajadores dan de alta autos, cambian el estado de cada servicio,
agregan o quitan servicios sobre la marcha y retiran autos cuando el cliente se los
lleva. Se entra con un **PIN** (uno solo, compartido).

- **El PIN se valida en el servidor.** No alcanza con esconder la pantalla: los
  endpoints que modifican datos exigen el PIN en el header `x-pin` (si no, un 401).
- El PIN vive en la base (tabla `config`). El **default es `1234`**. Para fijar
  otro la primera vez, arrancá el server con `ADMIN_PIN=xxxx`; queda guardado en la
  base y después ya no depende de esa variable.
- La tablet **queda logueada** (el PIN se guarda en el navegador). Hay botón
  "Salir" para cerrar sesión a mano.
- **Retirar** un auto y **quitar** un servicio son *soft delete*: no se borran, se
  marcan con fecha (`retirado_en` / `eliminado_en`) y desaparecen de las vistas,
  pero quedan como historial. Un auto no puede quedar sin servicios: si es el
  último, hay que retirar el auto.
- Editar los datos de un auto o agregar/quitar servicios **no** cambia su fecha de
  ingreso ni el estado de los otros servicios.

## Configuración

| Variable | Default | Para qué sirve |
| --- | --- | --- |
| `PORT` | `3000` | Puerto del servidor. |
| `HORAS_VISIBLE_TERMINADO` | `4` | Cuántas horas sigue en pantalla un auto con **todos** sus servicios terminados antes de ocultarse solo. |
| `ADMIN_PIN` | `1234` | PIN inicial de `/admin`. Solo se usa la primera vez, para sembrarlo en la base; después el PIN vive en `config`. |

## API

Los endpoints que **escriben** exigen el header `x-pin` con el PIN (si no, `401`).

| Endpoint | Qué hace |
| --- | --- |
| `GET /api/health` | `{ ok: true }`, para saber si el server está vivo. |
| `GET /api/vehiculos` | Autos de `/display`: con servicios anidados, del que hace más tiempo que entró al más nuevo, sin los terminados hace más de `HORAS_VISIBLE_TERMINADO` ni los retirados. |
| `GET /api/vehiculos?todos=1` | Igual, pero para `/admin`: incluye también los terminados hace rato (sigue sin los retirados). |
| `POST /api/login` | Valida el PIN (body `{ pin }`). `{ ok: true }` o `401`. |
| `POST /api/vehiculos` | Alta de un auto con sus servicios iniciales (todos en `esperando`). |
| `PATCH /api/vehiculos/:id` | Edita marca/modelo/color/matrícula (no toca fecha ni servicios). |
| `POST /api/vehiculos/:id/retirar` | Retira el auto (soft delete). |
| `POST /api/vehiculos/:id/servicios` | Agrega un servicio (body `{ tipo }`). |
| `PATCH /api/servicios/:id` | Cambia el estado de un servicio (body `{ estado }`). |
| `DELETE /api/servicios/:id` | Quita un servicio (soft delete; `400` si es el último activo del auto). |

## Estado actual (Fase 3)

- ✅ Vista `/display` leyendo los autos **reales** de SQLite. Se refresca sola cada
  30 s; si se cae el server, mantiene los últimos datos y avisa "Sin conexión".
- ✅ Vista `/admin` con login por PIN (validado en el server), alta de autos, cambio
  de estado por servicio, agregar/quitar servicios y retirar autos. Refetch tras
  cada acción.
- ✅ Tablas + datos de ejemplo que se crean solos la primera vez; migración
  automática de las columnas nuevas sobre bases ya existentes.
- ✅ Los autos con todos los servicios terminados se ocultan solos a las 4 horas.
- ✅ Socket.IO enganchado al server (todavía sin emitir eventos).
- ⏳ Pendiente (Fase 4): tiempo real con Socket.IO (que las pantallas se actualicen
  solas al instante, sin esperar el refresco ni recargar).
