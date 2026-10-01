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
- Los intentos que cuentan para el bloqueo: `POST /api/login`, rutas con `exigirPin`, el cambio
  de PIN y `GET /api/vehiculos` cuando trae `x-pin` (revisado en F2: si no contara, se podrían
  probar PINs por ahí). Para que una tablet con el PIN viejo no se bloquee sola, ante el 401 el
  cliente borra el PIN y vuelve a la pantalla de PIN.
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
- [x] F2 — Límite de PIN + API de configuración. Ruta: delegated direct.
  - Bloqueo por IP: 5 fallidos → 429 `{error, minutosRestantes}` por 5 min.
  - `GET/PATCH /api/config` con registro de ajustes (clave, tipo, min/max, default desde env),
    `POST /api/config/pin` (PIN actual + nuevo), `POST /api/backups`.
  - `HORAS_VISIBLE_TERMINADO` leído de `config` en cada consulta; al cambiar, emitir
    `vehiculos:cambio`.
  - Tests.
- [x] F3 — Pantalla "Configuración" en /admin + README. Ruta: delegated direct.
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
  Commit F1: `208f83f` (slice PR 1 = `7e87af3..208f83f`). RDD assess (base `7e87af3`,
  committed-only): high (`iniciar.sh`), 613 líneas, `review_due=true/high_risk` → STATUS → start →
  `consent_required`; el usuario eligió **saltear esta vez** → `declined_this_candidate`.
  Próxima base: `208f83f`.
- F2 (writer delegado; verificación del padre): `npm test` 42/42 (24 + 7 `ajustes` + 11 `pin`),
  `tsc --noEmit` ok, client `npm run build` ok + `npm run lint` (oxlint) sin hallazgos. Writer, smoke
  en dev (puerto 3096, base temporal): 5 PIN mal → 429 en el 5.º, PIN bueno bloqueado → 429 (login,
  lista y config); otra IP → 200; GET/PATCH `/api/config` (100 → 400); `vehiculos:cambio` recibido
  por socket; `POST /api/backups` ok; cambio de PIN (actual mal → 401, `"12"` → 400, ok → 200) y
  PIN viejo en la lista → 401; lista pública sin PIN → 200 sin `telefono`.
  Diseño: `intentosPin.ts` (`crearLimitador(reloj)`, olvida IPs sin bloqueo tras 60 min), PIN vacío
  = 401 sin contar, `ajustes.ts` (registro `AJUSTES`, `leerAjuste/listarAjustes/guardarAjustes` en
  transacción), `HORAS_VISIBLE_TERMINADO` ahora entero 1–72 (antes aceptaba decimales). Cliente:
  `ErrorApi`, `login()` → `{ok}|{ok:false,bloqueado,mensaje}`, 401 en la lista → vuelve al PIN.
  Sin probar: pantallas del cliente en navegador (F3), vencimiento del bloqueo por HTTP (test con
  reloj falso), Docker/IP en Windows, 500 de `POST /api/backups`. ~828+/58− líneas.
  Commit F2: `6ff7240` (slice PR 2 = `208f83f..6ff7240`). RDD assess (base `208f83f`,
  committed-only): high (`hot_path: server/src/auth.ts`), 902 líneas, `review_due=true/high_risk`
  → STATUS → start → `consent_required`; el usuario eligió **saltear esta vez** →
  `declined_this_candidate`. Próxima base: `6ff7240`.
- F3 (writer delegado; correcciones y verificación del padre): vista Configuración dentro de
  /admin (`Configuracion.tsx`, `CambiarPin.tsx`, `TarjetaConfig.tsx`), PinLogin con cuenta regresiva
  de bloqueo, Taller sin "reintentando" en el 429, README "Pantalla de Configuración".
  Correcciones del padre sobre hallazgos del writer: (1) en el cambio de PIN el `x-pin` válido
  ponía los fallos en cero, así que el PIN actual se podía adivinar sin límite → ahora solo el
  login (`reiniciarFallos`) pone la cuenta en cero (F2 se corrige en este commit); (2) el cliente
  distinguía el 401 del PIN actual por el texto del mensaje → ahora por `motivo: "pin_actual"`;
  (3) "N de 30" estaba fijo en el cliente → `estadoBackups().maximo`.
  Chequeos: `npm test` 43/43, `tsc --noEmit` ok, client build ok + oxlint sin hallazgos.
  Navegador (headless 1180×820, server dev en 3095 con base temporal): vista se ve bien en
  tablet; "Hacer backup ahora" → "Backup hecho." y 2 de 30; horas +2 → Guardar → "Guardado", API
  devuelve 6; PIN actual mal → error en el campo sin desloguear; cambio 1234→5678 ok y el PIN queda
  guardado; con el PIN viejo guardado → vuelve a la pantalla de PIN; 5 PIN mal → "Demasiados
  intentos. Probá de nuevo en 5 min." y teclado deshabilitado. Server y datos temporales borrados.
  Sin probar: celular (cabecera solo con íconos), fallback sin vidrio, estado de error de backup
  en la UI, la cuenta regresiva hasta que vence, `iniciar.bat`.
  Commit F3: `63965c4` (slice PR 3 = `6ff7240..63965c4`). RDD assess (base `6ff7240`,
  committed-only): high (`hot_path: server/src/auth.ts`), 1013 líneas, `review_due=true/high_risk`
  → STATUS → start → `consent_required`; el usuario eligió **saltear esta vez** →
  `declined_this_candidate`. Entrega bajo la política normal del repo (sin revisión registrada).
  Detalle F2: Ajuste de alcance: el `GET /api/vehiculos` con `x-pin` también
  cuenta para el bloqueo (hoy filtra si el PIN es válido: aparecen o no los celulares, y eso
  saltearía el límite). PIN mal → 401 y el cliente vuelve a pedir PIN (deja de sondear con el PIN
  viejo, así no se bloquea solo). Limitación: detrás de Docker Desktop (Windows) la IP de origen
  puede no preservarse → el bloqueo actuaría para todos.

## Próximo paso
Push de la rama y los 3 PRs en cadena (lo decide el usuario).
