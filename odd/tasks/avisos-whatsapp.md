# Feature: avisos automáticos por WhatsApp

Locator: `odd/tasks/avisos-whatsapp.md` · Engram: `odd/avisos-whatsapp/tasks` · Rama: `feat/avisos-whatsapp`

## Objetivo
Mandarle al cliente mensajes de WhatsApp automáticos según el estado de su auto:
"tu auto entró", "ya arrancamos", "está listo".

## Problema / por qué
Hoy el cliente solo ve el estado si mira la pantalla del showroom. Con los avisos
se entera sin tener que preguntar.

## Alcance (decidido con el usuario, 2026-09-22)
- Teléfono **opcional** al dar de alta / editar un auto (celular uruguayo, se guarda `+598…`).
- "Tu auto entró": 5 min después del alta. No se manda si el auto se retiró antes.
- "Ya arrancamos": 5 min después de que el **primer** servicio pasa a `en_proceso`.
  No se manda si al momento de enviar ya no hay ninguno en proceso (volvió a esperando).
- "Está listo": 5 min después de que **todos** los servicios quedan `terminado`.
  No se manda si al momento de enviar alguno dejó de estar terminado.
- Cada mensaje, una sola vez por auto. Sin horario: se mandan siempre.
- Fuera de alcance por ahora: "vamos con 1 hora de atraso".
- Proveedor: Baileys (no oficial) con el número personal del usuario, solo para pruebas.
  Envío intercambiable (`log` / `baileys` / más adelante oficial) y lista blanca
  `AVISOS_SOLO_A` para no escribirle a clientes reales mientras se prueba.

## Restricciones
- El teléfono NUNCA sale en `/display` ni en respuestas públicas de la API
  (solo con `x-pin` válido).
- Todo en español; touch-first; sin `<form>` submit (onClick/onChange).
- Por fases, con OK del usuario antes de cada una y un commit por fase (CLAUDE.md).
- Avisos pendientes persistidos en SQLite (aguantan reinicios), condición revisada al enviar.

## Modo de trabajo
- TDD: **off** (fuente: sin configuración de proyecto/sesión; no hay test runner).
  Se corren chequeos funcionales: `tsc`/build de server y client, `oxlint`, y pruebas
  con `curl` contra una instancia aparte (DB en scratchpad vía `DB_PATH`).
- RDD: on (global). Assess por commit de trabajo.
- Entrega: `ask-on-risk`. Pronóstico ~700 líneas en total (> 400) → preguntar
  estrategia de cadena antes de superar el presupuesto.

## Tareas
- [x] T1 — Fase A: teléfono opcional en el alta/edición (server + client + README).
  Ruta: delegated direct (writer trigger: 2+ archivos no triviales server y client).
- [x] T2 — Fase B: cola de avisos en SQLite + worker, envío en modo `log`. OK del usuario.
  Ruta: delegated direct (writer trigger: db, servicios, vehiculos, index + módulo nuevo).
- [x] T3 — Fase C: envío real con Baileys (QR, reintentos, `AVISOS_SOLO_A`). OK del usuario.
  Ruta: delegated direct (writer trigger: enviadores, avisos, módulo nuevo, package.json, README).
- [ ] T4 — Fase D (opcional): estado del aviso en `/admin`. (espera OK)

## Criterios de aceptación T1
- Alta y edición aceptan `telefono` vacío (queda NULL) o celular uruguayo válido
  (`099 123 456`, `99123456`, `+598 99 123 456`, `59899123456`) → se guarda `+59899123456`.
- Teléfono inválido → 400 con mensaje claro en español.
- `GET /api/vehiculos` sin PIN no incluye `telefono`; con `x-pin` válido sí.
- `/admin` muestra el campo en el formulario (precargado al editar).
- Bases existentes migran solas (columna nueva).

## Criterios de aceptación T2 (OK del usuario 2026-09-22)
- Tabla `avisos` (vehiculo_id, tipo ingreso|en_proceso|listo, estado
  pendiente|enviado|cancelado|sin_telefono|fallido, enviar_en, intentos, ultimo_error,
  enviado_en), UNIQUE(vehiculo_id, tipo) → cada aviso una sola vez por auto.
- Alta → `ingreso` pendiente a +demora. Retirar → cancela pendientes.
- Tras cada cambio de servicios (estado / agregar / quitar): condición verdadera y aviso
  inexistente o cancelado/sin_telefono → pendiente con demora nueva; condición falsa y
  pendiente → cancelado. `en_proceso` = algún servicio en proceso; `listo` = todos terminados.
- Despachador cada `AVISOS_INTERVALO_SEG` (30): revisa la condición de nuevo, sin teléfono →
  sin_telefono, falla → reintento con espera creciente y `fallido` tras 5 intentos.
- Envío intercambiable; en esta fase solo `log` (consola). Demora `AVISOS_DEMORA_MIN` (5).
- Pendientes sobreviven a un reinicio del server.

## Criterios de aceptación T3 (OK del usuario 2026-09-22)
- `AVISOS_ENVIO=baileys` conecta con la sesión guardada en una carpeta local ignorada por git;
  si no hay sesión muestra el QR en la consola con instrucciones en español; reconecta solo;
  si WhatsApp cierra la sesión, explica cómo volver a vincular.
- Mientras WhatsApp no está conectado, el despachador no gasta intentos.
- Número sin WhatsApp → `fallido` sin reintentos.
- `AVISOS_SOLO_A` (lista de celulares): si está puesta, solo se manda a esos; el resto queda
  `cancelado` con el motivo. Aplica a cualquier envío.
- Pausa de unos segundos entre mensajes (menos riesgo de bloqueo).
- README: cómo vincular, requisito de internet, riesgo de la librería no oficial.
- Sin conexión real a WhatsApp desde el agente: la prueba en vivo (QR) la hace el usuario.

## Progreso / evidencia
### T1 — Fase A (hecha)
- Ruta: delegated direct (1 writer). Trigger: 11 archivos server+client.
- Chequeos observados: server `tsc --noEmit` OK; client `tsc -b` + `vite build` + `oxlint` OK;
  script de `normalizarTelefono` (12 válidos, 4 vacíos, 11 inválidos) OK; API en instancia
  aparte (`DB_PATH` + `PORT=3099`): alta con/sin teléfono 201, inválido 400, GET sin PIN sin
  clave `telefono`, con PIN la trae, PATCH con "" lo borra, PIN errado no la trae.
- Decisiones: PATCH sin campo `telefono` conserva el guardado (vacío lo borra); el error de
  guardado ahora se ve dentro del modal (antes quedaba detrás del overlay).
- No verificado: UI en navegador.
- Commit: `75a2ded` feat(avisos): Fase A (14 archivos, +304/−44).
- RDD assess (base `95b98ac`, committed-only): riesgo medium, 348 líneas,
  `review_due=false` / `under_budget` → queda pendiente en el slice.
- Entrega: acumulado 348 líneas. Se preguntó la estrategia de cadena; el usuario aún no eligió
  (recomendada `stacked-to-main`). Solo afecta la creación de PRs, que es decisión del usuario.

### T2 — Fase B (hecha)
- Ruta: delegated direct (1 writer). Trigger: db, servicios, vehiculos, index + 2 módulos nuevos.
- Archivos: `server/src/avisos.ts` (cola + despachador), `server/src/enviadores.ts` (interfaz
  `Enviador`, `log`, `elegirEnviador`), hooks en servicios/vehiculos dentro de transacciones,
  tabla `avisos` + índice, README (sección "Avisos por WhatsApp" + env vars).
- Chequeos observados: server `tsc --noEmit` OK. E2E en instancia aparte (demora 6 s,
  revisión 2 s): ingreso enviado; retiro antes de la demora → cancelado; en_proceso→esperando
  → cancelado y re-en_proceso con demora nueva → enviado; en_proceso y luego todo terminado →
  solo "listo"; sin teléfono → sin_telefono; reinicio con pendiente → se manda al volver;
  "listo" no se repite; falla → reintentos 1/2/4/8 min y `fallido` al 5º; una falla no frena
  el resto; agregar/quitar servicios reevalúan "listo".
- Decisiones: `evaluarAvisos` cancela si el auto está retirado; si el envío sale después de una
  cancelación concurrente queda `enviado` (el mensaje salió).
- Commit: `88f13ff` feat(avisos): Fase B (8 archivos, +462/−25).
- RDD assess (base `95b98ac`, committed-only): riesgo medium, 825 líneas, `review_due=true`
  / `slice_budget_reached`. Preflight STATUS → `review.start` fresh_target_ready con
  `--consent=relay`, lineage `review-aa8742bcd7183b68`. Usuario: **declinado por ahora** ("aún no revises", 2026-09-22) → sigue política normal;
  el tramo queda sin revisar desde `95b98ac`.
- Nota: el server de dev del usuario (:3000) recargó y ya creó la tabla `avisos` en la base real;
  autos anteriores a la Fase B no reciben "ingreso".

### T3 — Fase C (hecha, falta prueba en vivo del usuario)
- Ruta: delegated direct (1 writer) + 1 corrección inline (enviadores.ts, mecánica).
- Dependencias: `baileys@6.7.24` fijo (último estable; `latest` es 7.0.0-rc14; evita 6.17.16
  deprecado), `pino@^9.14.0`, `qrcode-terminal@^0.12.0`, `@types/qrcode-terminal`.
- Archivos: `server/src/whatsapp.ts` (sesión, QR, reconexión con espera creciente, loggedOut →
  borra sesión y muestra QR nuevo, connectionReplaced → se detiene, onWhatsApp, 3 s entre
  mensajes), `enviadores.ts` (`listo()`, `ErrorDefinitivo`, `elegirEnviador` async),
  `avisos.ts` (no gasta intentos si no está listo, `ErrorDefinitivo` → fallido,
  `AVISOS_SOLO_A`), `index.ts`, `.gitignore` (sesión), README.
- Chequeos observados: `tsc --noEmit` y `npm run build` OK; `git check-ignore` confirma la
  sesión ignorada; instancia aparte con `AVISOS_SOLO_A` → permitido enviado, otro cancelado
  con motivo; script con enviadores falsos: no listo → intacto, ErrorDefinitivo → fallido,
  Error común → reintento; `AVISOS_ENVIO=baileis` → error claro y el despachador no arranca.
- Corrección propia: un valor desconocido de `AVISOS_ENVIO` ya no cae en `log` (marcaría
  avisos como enviados sin mandarlos).
- No verificado: conexión real, QR y entrega (sin conexión a WhatsApp desde el agente;
  prueba en vivo del usuario).
- Riesgo conocido: Baileys 6.7.x trae `libsignal` desde GitHub (git dep): `npm install`
  necesita acceso a GitHub.

## Próximo paso
Prueba en vivo del usuario (QR). Después: T4 (Fase D) con OK, y revisión cuando el usuario la pida.
