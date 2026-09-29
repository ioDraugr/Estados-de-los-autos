# Feature: despliegue con un solo comando (Docker)

Locator: `odd/tasks/despliegue-docker.md` · Engram: `odd/despliegue-docker/tasks`
Rama: `feat/despliegue-docker` (sale de `origin/main` @ `1f7bd9e`). Worktree:
`../Estados-de-los-autos-worktrees/despliegue-docker` (para no tocar el árbol compartido donde
sigue abierta `feat/rediseno-vidrio`). Es independiente del rediseño: los archivos de Docker no
dependen de la UI; al mergear ambos PRs el despliegue lleva la UI que esté en `main`.

## Objetivo
Que en una PC nueva (Windows o Linux) baste con instalar Docker, clonar el proyecto y correr un
solo comando para tener la app andando, sin instalar Node, npm ni compiladores.

## Por qué
El usuario quiere poder desplegar la app completa "en cualquier PC sin preocuparse por las
dependencias" (2026-09-28). Hoy hay que tener Node 20+, `npm install` en dos carpetas (con
`better-sqlite3` compilando un binario nativo), buildear front y back y arrancar a mano.

## Alcance (autorizado por el usuario, 2026-09-28)
- Decisiones del usuario: Docker + docker compose; tiene que andar en Windows y Linux; el server
  arranca solo al prender la PC.
- `Dockerfile` multi-etapa (front, back con better-sqlite3 compilado, runtime liviano, Node LTS
  fijo) + `.dockerignore`.
- `docker-compose.yml`: puerto 3000, `restart: unless-stopped`, volumen con nombre para
  `server/data` (base + sesión de WhatsApp), `.env` opcional + `.env.example`.
- `iniciar.bat` (Windows, doble clic) e `iniciar.sh` (Linux): chequean Docker, levantan todo y
  muestran la dirección.
- README: sección "Desplegar en una PC nueva" (instalar Docker, autoarranque, actualizar, QR de
  WhatsApp, backup de la base).
- Fuera de alcance: instalación en una PC sin internet (exportar la imagen a pendrive).

## Restricciones
- No cambia código de la app (server/client). La app sigue corriendo sin internet; solo el
  primer build de la imagen necesita internet.
- Nunca meter en la imagen la base, la sesión de WhatsApp ni `.env` (credenciales).
- Todo en español (textos de scripts y README).

## Modo de trabajo
- TDD: off (sin configuración de proyecto/sesión; es infraestructura, sin runner aplicable).
- Chequeos: `docker compose build`, `docker compose up -d`, `GET /api/health`, `/display` y
  `/admin` devuelven el front, los datos sobreviven a `docker compose down && up`, `iniciar.sh`
  corre de punta a punta, `bash -n` sobre el script; tests del server siguen verdes
  (`cd server && npm test`).
- RDD: on (global). Entrega: `ask-on-risk`; pronóstico ~300 líneas, real ~630 → el usuario eligió
  `single-pr` (2026-09-28): un PR con los 3 commits. Push y PR los
  decide el usuario.

## Tareas
- [x] D1 — Imagen y compose: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.env.example`,
  `.gitignore` de `.env`. Commit `c43b4ec`.
- [x] D2 — Scripts `iniciar.bat` / `iniciar.sh` + `.gitattributes` (LF/CRLF). Commit `4e0c08a`.
- [x] D3 — README: "Desplegar en una PC nueva (Docker)", con inicio de sesión automático en
  Windows. Commit: el que incluye este documento.
- [x] D4 — Avisos por WhatsApp activos por defecto (pedido del usuario 2026-09-29, sumado a este
  PR por elección suya): default de `AVISOS_ENVIO` pasa de `log` a `baileys` en
  `server/src/enviadores.ts`; `.env.example` con `baileys`; README y comentarios actualizados.
  Para apagarlo: `AVISOS_ENVIO=log`. Ruta: inline (cambio mecánico de un default + docs).

Ruta: delegated direct para D1–D3 (writer trigger: 6+ archivos no triviales entre Dockerfile,
compose, scripts y README). Un writer acotado, verificación en el padre.

## Criterios de aceptación
- En una máquina con solo Docker: `docker compose up -d --build` deja la app en
  `http://<ip>:3000` con /display, /taller y /admin.
- Reiniciar el contenedor (o la PC con Docker en autoarranque) no pierde autos, PIN ni sesión
  de WhatsApp.
- Variables (`ADMIN_PIN`, `AVISOS_ENVIO`, `HORAS_VISIBLE_TERMINADO`, …) configurables por `.env`.

## Decisiones
- Imagen `node:24.21.0-bookworm-slim` fija (LTS, glibc: sirven los binarios precompilados de
  better-sqlite3 13; los compiladores quedan solo como respaldo en la etapa `back`).
- `init: true` (el stop tarda 0,2 s y no 10 s). `PORT`, `DB_PATH` y `WHATSAPP_SESION_DIR` quedan
  fijos en el compose para que un `.env` no saque la base del volumen. `name: taller-ml` hace que el
  volumen se llame siempre `taller-ml_datos`.
- TZ `America/Montevideo` solo afecta los logs (la base usa UTC). No hace falta `tty` para el QR.
- Los scripts crean `.env` desde `.env.example` si falta.
- Windows: Docker Desktop arranca recién al iniciar sesión → el usuario pidió documentar el inicio
  de sesión automático (netplwiz / Autologon) con la advertencia de usar un usuario estándar.

## Progreso y evidencia
- 2026-09-28: plan aprobado por el usuario. Rama y worktree creados.
- Writer (delegado): build ok (48,9 s), healthy en ~6 s, `/api/health` ok, /display /admin
  /taller 200, 8 autos del seed; persistencia (auto 9 sobrevive a `down`/`up`); TZ ok; `kill -9` →
  vuelve solo; backup/restore del README probados; `bash -n` + shellcheck ok; `iniciar.sh` ok
  y camino de error (puerto ocupado) ok; `cd server && npm test` 19/19. Imagen final 440 MB.
- Padre: `PUERTO=3099 COMPOSE_PROJECT_NAME=taller-verif ./iniciar.sh` → build + up, URLs
  impresas, `/api/health` `{"ok":true}`, 8 autos, `/admin` sirve el front. Limpieza hecha.
- Sin probar: `iniciar.bat` (no hay Windows acá; revisado por lectura, CRLF ok) y el reinicio
  real de la PC/daemon.
- RDD assess (base `1f7bd9e`, commits D1–D3): high (`iniciar.sh` ejecutable/shell), 707 líneas,
  `review_due=true` / `high_risk` → STATUS → start → `consent_required`. El usuario eligió
  **saltear esta vez** → `declined_this_candidate` (sin registro de revisión). Entrega bajo la
  política normal del repo.

- D4: `tsc --noEmit` ok; `npm test` 19/19 (los tests usan `enviadorFalso`, no pasan por
  `elegirEnviador`); server arrancado sin `AVISOS_ENVIO` → `envío "baileys"` y QR de vinculación
  en consola (base y sesión temporales, borradas). El seed no tiene celulares: nadie recibe nada
  por arrancar en dev.

- 2026-09-29: el usuario squash-mergeó PR #5 (`fc05e8c`, D1–D3) antes del push de D4, y el
  rediseño (#6). D4 quedó afuera; el usuario abrió PR #7 desde la misma rama, en conflicto por los
  commits ya squasheados. Se reconcilió con un merge de `origin/main` en la rama (sin reescribir
  historia): se tomó la versión de `main` y se reaplicó solo el diff de D4. PR #7 = solo D4.

## Próximo paso
Mergear PR #7 (D4). Pasar la carpeta de desarrollo a `main`. Probar `iniciar.bat` en una PC
Windows.
