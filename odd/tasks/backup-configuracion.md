# Feature: backup automático + pantalla Configuración + límite de PIN

Locator: `odd/tasks/backup-configuracion.md` · Engram: `odd/backup-configuracion/tasks`
Rama: `feat/backup-configuracion` (sale de `origin/main` @ `7e87af3`). Worktree:
`../Estados-de-los-autos-worktrees/backup-configuracion` (el árbol principal tiene cambios de otra
sesión en `odd/tasks/rediseno-vidrio.md`; no se tocan).

## Objetivo
1. Backup automático de la base SQLite: al arrancar el server y una vez por día, seguro aunque el
   server esté escribiendo, en una carpeta configurable (por defecto `server/data/backups`),
   conservando los últimos 30. Tiene que andar con Docker con la carpeta fuera del contenedor.
2. Pantalla "Configuración" dentro de /admin (botones grandes, en español): cambiar el PIN
   (pidiendo el actual), ver el último backup + "Hacer backup ahora", editar
   `HORAS_VISIBLE_TERMINADO`. Preparada para sumar ajustes (textos de mensajes, etc.).
3. Límite de intentos de PIN: 5 fallidos = 5 minutos de bloqueo.

## Por qué
Pedido del usuario (2026-09-29): hoy el backup es manual (README), el PIN y las horas solo se
cambian por `.env`/base, y no hay freno a probar PINs.

## Decisiones del usuario (2026-09-29)
- Destino: carpeta en la PC servidor (`server/data/backups`), visible desde la PC y montada en
  Docker como bind mount del host (no dentro del volumen con nombre). Pendrive: fuera de alcance
  (se copia a mano desde esa carpeta).
- Retención: los últimos 30 **archivos** (diarios, de arranque y manuales cuentan igual).
- Bloqueo de PIN: por dispositivo (IP), en memoria (se borra al reiniciar el server).
- Entrega: un PR por fase, en cadena (`stacked-to-main`).
- Plan de 3 fases aprobado ("¿Arranco con la Fase 1?" → sí).

## Alcance y restricciones
- Un solo PIN compartido /admin y /taller (no se agregan roles).
- Copia con `db.backup()` de better-sqlite3 (WAL-safe). Nada de copiar el archivo a mano.
- Los intentos que cuentan para el bloqueo: `POST /api/login` y rutas con `exigirPin`. El
  `GET /api/vehiculos` con PIN viejo NO cuenta (si no, una tablet con PIN viejo se bloquearía sola).
- Ajustes editables guardados en la tabla `config` (clave/valor) ya existente; la variable de
  entorno solo da el valor inicial.
- Todo en español; touch-first; sin `<form>` submit (onClick/onChange). CLAUDE.md: commit por fase.
- Fuera de alcance: restaurar backups desde la UI, textos de mensajes editables (solo se deja el
  lugar preparado), pendrive.

## Modo de trabajo
- TDD: off (sin configuración de proyecto/sesión ni pedido del usuario). Se escriben tests junto
  al comportamiento. Runner: `cd server && npm test` (`node --import tsx --test`).
- Chequeos: `npm test` (server), `npx tsc --noEmit` (server), `npm run build` + `npm run lint`
  (client), prueba manual del server en dev; en Fase 1 además `docker compose config` y, si se
  puede, un `docker compose up` con carpeta temporal.
- RDD: on (global). Entrega: `stacked-to-main`, un PR por fase. Push y PR los decide el usuario.
- Pronóstico: F1 ~250, F2 ~300, F3 ~350 líneas (≈900 en total).

## Tareas
- [x] F1 — Backup automático (server + Docker). Ruta: delegated direct (writer trigger:
  `respaldos.ts` nuevo, `index.ts`, test, compose, scripts, `.gitignore`, `.env.example`).
  - `server/src/respaldos.ts`: `hacerBackup(motivo)` con `db.backup()` a
    `CARPETA_BACKUPS` (default `server/data/backups`, relativo a la base), nombre
    `taller-AAAA-MM-DD_HH-MM-SS[_n]-motivo.db` (hora local), rotación a 30 archivos,
    `estadoBackups()` (el último sale de la carpeta, no de `config`: sobrevive a reinicios; el
    último error queda en memoria), `iniciarBackups()` (al arrancar + chequeo horario "¿hay copia
    de hoy?"), sin superposición. La copia se pasa a `journal_mode=DELETE` (un solo archivo).
  - Docker: bind mount `./server/data/backups` → `/app/server/data/backups`; `iniciar.sh` /
    `iniciar.bat` crean la carpeta antes de levantar (permisos del usuario `node`).
  - Tests: copia legible con los datos, rotación a 30, "ya hay copia de hoy".
- [ ] F2 — Límite de PIN + API de configuración. Ruta: delegated direct.
  - Bloqueo por IP: 5 fallidos → 429 `{error, minutosRestantes}` por 5 min.
  - `GET/PATCH /api/config` con registro de ajustes (clave, tipo, min/max, default desde env),
    `POST /api/config/pin` (PIN actual + nuevo), `POST /api/backups`.
  - `HORAS_VISIBLE_TERMINADO` leído de `config` en cada consulta; al cambiar, emitir
    `vehiculos:cambio`.
  - Tests.
- [ ] F3 — Pantalla "Configuración" en /admin + README. Ruta: delegated direct.
  - Botón en la cabecera → vista en vidrio con secciones PIN / Backups / Pantalla del showroom.
  - PinLogin muestra "Bloqueado, probá en X min"; PIN viejo guardado → vuelve a pedir PIN.
  - README: backups automáticos, Configuración, API, variables.

## Criterios de aceptación
- Al arrancar aparece un backup nuevo en la carpeta; nunca quedan más de 30; la copia se abre con
  sqlite y tiene los datos, aun con escrituras en curso.
- Con Docker, los backups aparecen en `server/data/backups` del host.
- 5 PIN mal desde un dispositivo → ese dispositivo bloqueado 5 min; los demás siguen.
- Desde /admin → Configuración se cambia el PIN (con el actual), se ve el último backup, se hace
  uno a mano y se cambian las horas visibles (el showroom se actualiza solo).

## Progreso y evidencia
- 2026-09-29: exploración (delegada), plan aprobado, worktree creado, `npm ci` en server/client,
  CodeGraph inicializado en el worktree. Base: `npm test` 19/19.

- F1 (writer delegado; verificación del padre): `npm test` 24/24 (19 + 5 nuevos), `tsc --noEmit`
  ok, `docker compose config -q` ok, sin restos de la verificación. Writer: Docker real aislado
  (`-p taller-verif-bk`, puerto 3098) → backup de arranque en la carpeta del host (uid 1000),
  `integrity_check ok`, 8 autos; restore del README probado; en dev, carpeta sin permisos →
  error logueado y el server sigue. Sin probar: `iniciar.bat` (no hay Windows), `iniciar.sh` de
  punta a punta, el timer horario en tiempo real (lógica con test).
  Riesgo conocido: host Linux con uid ≠ 1000 → `sudo chown 1000:1000 server/data/backups`
  (documentado en README). ~495+/32− líneas (≈200 tests, ≈80 README).

## Próximo paso
F2 — límite de PIN + API de configuración.
