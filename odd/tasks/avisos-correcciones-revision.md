# Feature: correcciones de la revisión de avisos por WhatsApp

Locator: `odd/tasks/avisos-correcciones-revision.md` · Engram: `odd/avisos-correcciones-revision/tasks`
Rama: `fix/avisos-revision` (sale de `feat/avisos-whatsapp` @ `fa25ec7`, ya mergeada por el usuario;
no se hizo fetch del remoto).

## Objetivo
Corregir los hallazgos de la revisión RDD `review-bc4c312a15f0e5b1` (aprobada, hallazgos no bloqueantes).

## Alcance (autorizado por el usuario, 2026-09-22)
- R3-aviso-fallido-lockout: un aviso `fallido` de `en_proceso`/`listo` tiene que poder
  reprogramarse cuando la condición vuelve a cumplirse (como `cancelado` / `sin_telefono`).
  `ingreso` no se reprograma nunca (sin cambios).
- R3-general-no-automated-tests / R3-telefono-regex-untested: tests automáticos con el runner de
  Node (`node:test`, sin dependencias nuevas; `tsx` ya está) para `normalizarTelefono` y la
  máquina de estados de avisos (programar, cancelar, revivir, despachar, reintentos, fallido,
  ErrorDefinitivo, sin teléfono, no listo). `npm test` en `server/`.
- R3-enviador-listo-toggle: dejar más clara la lógica de "avisar solo cuando cambia" y cubrirla.
- Fuera de alcance: R3-telefono-silent-wipe (refutado).

## Modo de trabajo
- TDD: off por configuración (no hay config de proyecto/sesión). Igual, para el bug se escribe
  primero el test que lo reproduce (RED observado) y después el arreglo.
- Runner: `cd server && npm test` (node --test con tsx), creado en T1.
- RDD: on (global). Entrega: bajo presupuesto esperado (~300 líneas).

## Tareas
- [x] T1 — Runner de tests + test que reproduce el bloqueo de `fallido` (RED) + arreglo (GREEN).
  Ruta: delegated direct (writer trigger: package.json, tsconfig, avisos.ts, tests nuevos).
- [ ] T2 — Tests de `normalizarTelefono` y del resto de la máquina de avisos + toggle más claro.
  Ruta: delegated direct (mismo writer, contexto continuado).

## Criterios de aceptación
- `npm test` corre en `server/` sin tocar la base real ni conectarse a WhatsApp.
- El test del bloqueo falla antes del arreglo y pasa después.
- `tsc --noEmit` y `npm run build` limpios; los tests no terminan en `dist/`.
- README: cómo correr los tests.

## Progreso / evidencia
### T1 (hecha)
- Runner: `npm test` = `node --import tsx --test "test/**/*.test.ts"` (sin dependencias nuevas).
  Tests en `server/test/` (fuera de `dist/`), base descartable por archivo en tmpdir.
- RED observado: 3/3 fallan solo en la aserción de reprogramación
  (`fallido`/5/'sin señal' esperado `pendiente`/0/null).
- Arreglo: `evaluarAvisos` revive también `fallido`. Decisión: con la condición todavía cierta,
  otro cambio de servicios también lo revive (el cliente nunca recibió ese aviso; `enviado` nunca
  se revive). `ingreso` sin cambios.
- GREEN: 3/3 pasan (re-ejecutado por el orquestador). `tsc --noEmit` OK; build sin tests en dist.

## Próximo paso
T2.
