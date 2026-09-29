# Imagen del tablero del taller: front (Vite) + back (Express + SQLite) en un
# solo contenedor. Se construye con `docker compose up -d --build` (ver README).
#
# Tres etapas: se buildea el front, se buildea el back (con better-sqlite3) y al
# final queda una imagen liviana con solo lo necesario para correr. Los
# compiladores y las dependencias de desarrollo NO llegan a la imagen final.
#
# Node LTS fijo: Node 24 sobre Debian 12 "bookworm" slim (glibc, así sirven los
# binarios precompilados de better-sqlite3, Vite y Tailwind). Para actualizar
# Node se cambia esta versión y se vuelve a buildear.
ARG NODE_IMAGE=node:24.21.0-bookworm-slim

# --- 1. Front: client/dist ---
FROM ${NODE_IMAGE} AS front
WORKDIR /app/client
# Primero solo los package*.json: si no cambian, Docker reusa el `npm ci` cacheado.
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# --- 2. Back: server/dist + node_modules de producción ---
FROM ${NODE_IMAGE} AS back
# Compiladores por si better-sqlite3 tiene que compilarse (trae binarios
# precompilados para Linux, pero si no le sirven compila con esto).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
# El bloque `allowScripts` del package.json aprueba el script de instalación de
# better-sqlite3 (npm 11 no corre los scripts que no están aprobados).
RUN npm ci --no-audit --no-fund
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build \
    && npm prune --omit=dev --no-audit --no-fund

# --- 3. Imagen final ---
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=America/Montevideo
WORKDIR /app
# Mismo esquema que en el repo: el server sirve el front desde ../../client/dist.
COPY --from=back /app/server/package.json ./server/package.json
COPY --from=back /app/server/node_modules ./server/node_modules
COPY --from=back /app/server/dist ./server/dist
COPY --from=front /app/client/dist ./client/dist

# Chequeo de que el binario nativo de better-sqlite3 carga en ESTA imagen: si
# no, el build falla acá y no al arrancar en el taller.
RUN cd /app/server \
    && node -e "const D = require('better-sqlite3'); new D(':memory:').prepare('select 1').get(); console.log('better-sqlite3 OK')"

# server/data guarda la base (taller.db) y la sesión de WhatsApp. Va en un
# volumen (ver docker-compose.yml) y la tiene que poder escribir el usuario
# `node`, que no es root.
RUN mkdir -p /app/server/data && chown node:node /app/server/data
VOLUME /app/server/data
USER node

WORKDIR /app/server
EXPOSE 3000
# Docker marca el contenedor como "healthy" cuando /api/health responde. La
# imagen slim no trae curl: se usa el fetch de Node.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
