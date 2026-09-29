#!/usr/bin/env bash
# Levanta (o actualiza) el tablero del taller con Docker y muestra las
# direcciones para abrir desde la pantalla, la tablet y la PC.
# Uso: ./iniciar.sh   (desde cualquier carpeta; ver README).
set -euo pipefail

# Todo se corre desde la carpeta del script (donde está docker-compose.yml).
cd "$(dirname "$0")"

# --- ¿Está Docker? ---
if ! command -v docker >/dev/null 2>&1; then
  echo "No se encontró Docker en esta PC."
  echo "Instalá Docker Engine: https://docs.docker.com/engine/install/"
  echo "(y después: sudo systemctl enable --now docker)"
  exit 1
fi

if ! salida=$(docker info 2>&1); then
  if grep -qi "permission denied" <<<"$salida"; then
    echo "Tu usuario no tiene permiso para usar Docker."
    echo "Agregalo al grupo docker y volvé a entrar a la sesión:"
    echo "  sudo usermod -aG docker \"\$USER\""
  else
    echo "Docker está instalado pero no está corriendo."
    echo "Arrancalo (y dejalo arrancando solo al prender la PC) con:"
    echo "  sudo systemctl enable --now docker"
  fi
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Falta el plugin \"docker compose\"."
  echo "Instalalo con Docker Engine: https://docs.docker.com/engine/install/"
  exit 1
fi

# --- Configuración ---
# Si no hay .env, se crea uno a partir del modelo, así queda a mano para
# cambiar el PIN inicial, los avisos, etc.
if [[ ! -f .env && -f .env.example ]]; then
  cp .env.example .env
  echo "Se creó .env a partir de .env.example (ahí se cambia la configuración)."
fi

# Si algo falla de acá en adelante, mostramos los últimos logs del server.
mostrar_logs() {
  echo
  echo "Últimos logs del server:"
  docker compose logs --tail 50 || true
}

# --- Levantar ---
echo "Levantando el tablero (la primera vez tarda unos minutos y necesita internet)…"
if ! docker compose up -d --build; then
  echo "No se pudo levantar el tablero."
  echo "Si arriba dice \"address already in use\", el puerto está ocupado: cambiá PUERTO en el .env."
  mostrar_logs
  exit 1
fi

# --- Esperar a que responda ---
# Docker marca el contenedor como "healthy" cuando /api/health contesta.
echo "Esperando a que el server responda…"
contenedor=$(docker compose ps -q taller)
estado=""
for _ in $(seq 1 30); do
  estado=$(docker inspect -f '{{.State.Health.Status}}' "$contenedor" 2>/dev/null || true)
  [[ "$estado" == "healthy" ]] && break
  sleep 2
done
if [[ "$estado" != "healthy" ]]; then
  echo "El server no respondió en 60 segundos (estado: ${estado:-desconocido})."
  mostrar_logs
  exit 1
fi

# --- Direcciones ---
# Puerto real de la PC (sale del .env o de PUERTO), por ej. "0.0.0.0:3000".
mapeo=$(docker compose port taller 3000)
mapeo=${mapeo%%$'\n'*}
puerto=${mapeo##*:}
# IP de esta PC en la red del taller: la de la salida por defecto; si no hay,
# la primera que no sea de Docker.
ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit }}' || true)
if [[ -z "$ip" ]]; then
  ip=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^172\.1[7-9]\.' | grep -m 1 . || true)
fi
ip=${ip:-localhost}

echo
echo "¡Listo! El tablero está andando. Abrí desde cualquier dispositivo del taller:"
echo "  Pantalla del showroom: http://$ip:$puerto/display"
echo "  Vendedores (admin):    http://$ip:$puerto/admin"
echo "  Taller:                http://$ip:$puerto/taller"
echo
echo "Logs (y el QR de WhatsApp): docker compose logs -f"
