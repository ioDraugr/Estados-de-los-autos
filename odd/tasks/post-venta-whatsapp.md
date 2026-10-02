# Feature: post-venta automática por WhatsApp

Locator: `odd/tasks/post-venta-whatsapp.md` · Engram: `odd/post-venta-whatsapp/tasks` · Rama: `feat/post-venta-whatsapp` (desde `6688a2e`)

## Objetivo
Después de que el cliente retira el auto, mandarle por WhatsApp (reusando la cola `avisos`):
1. **Pedido de reseña** N días después del retiro (default 3) con el link de reseñas de Google.
2. **Recordatorio de mantenimiento** N meses después (default 6), solo si el auto tuvo vitrificado.

## Por qué
Fidelizar y conseguir reseñas sin trabajo manual del taller.

## Alcance y decisiones del usuario (2026-10-02)
- Todo configurable desde /admin → Configuración: activar/desactivar cada uno, días/meses, textos, link,
  horario y espaciado. Textos con marcadores `{marca}`, `{modelo}`, `{link}`.
- Casilla en alta/edición "Acepta recibir mensajes por WhatsApp" → columna `vehiculos.acepta_whatsapp`.
  - Aplica **solo a post-venta**; los avisos ingreso/en_proceso/listo siguen como hoy.
  - Autos existentes (antes de la migración) = **no aceptaron**.
  - En el alta la casilla arranca **marcada**.
- Horario: configurable, default **10 a 19 h, lunes a sábado**, hora local (TZ del server, America/Montevideo).
- Espaciado: mínimo **3 min** entre dos mensajes de post-venta (configurable). Los avisos operativos no se espacian.
- Fecha de envío se fija **al retirar** con la config vigente; cambiar días/meses vale para próximos retiros.
  Activar/desactivar, textos, link, horario y espaciado se evalúan al momento de mandar.
- Sin link cargado, la reseña no se manda (queda cancelada con motivo).
- Solo clientes con celular cargado (sin celular → `sin_telefono`, como hoy).
- Textos por defecto:
  - Reseña: "¡Hola! Gracias por confiar en ML Center con tu {marca} {modelo}. Si te gustó el trabajo, nos ayudás mucho dejándonos una reseña acá: {link}"
  - Mantenimiento: "¡Hola! Ya pasaron unos meses desde el vitrificado de tu {marca} {modelo}. Es un buen momento para hacerle el mantenimiento y que siga protegido. Escribinos por acá y coordinamos un día."

## Restricciones
- Español, touch-first, sin `<form>` submit (onClick/onChange).
- La tabla `avisos` tiene CHECK de tipos: migración que reconstruye la tabla sin perder filas.
- Al retirar hoy se cancelan los avisos pendientes; los de post-venta quedan fuera de esa cancelación.
- Mantenimiento: corresponde si el auto tiene un servicio vitrificado no eliminado.

## Modo de trabajo
- TDD: **off** (fuente: sin configuración de proyecto/sesión, igual que features previas). Checks funcionales.
- Runner: `cd server && npm test` (`node --import tsx --test "test/**/*.test.ts"`); client: `npm run build` (tsc + vite).
- RDD: **on** (global). Assess después de cada commit; boundary inicial `6688a2e`.
- Entrega: `single-pr` (el usuario mergea con squash, un PR por feature). Pronóstico ~950 líneas.

## Tareas
- [x] T1 — Ajustes tipo `booleano` y `texto` (server `ajustes.ts` + UI `Configuracion.tsx`) y definiciones de
  post-venta (activar ×2, días reseña, meses mantenimiento, textos ×2, link, hora desde/hasta, domingo no, espaciado). Tests de validación.
  Ruta: delegated direct (writer trigger: server + client, 2+ archivos no triviales).
- [x] T2 — Migración: `avisos.tipo` acepta `resena`/`mantenimiento`; columna `acepta_whatsapp` (existentes 0).
  Casilla en alta/edición (server `vehiculos.ts` + client `FormVehiculo.tsx`). Tests de migración y consentimiento.
  Ruta: delegated direct (writer trigger: db, vehiculos, FormVehiculo, tipos).
- [x] T3 — Programar al retirar + despachador (horario, espaciado, consentimiento, activado, link, textos) +
  README. Tests de programación, horario, espaciado, desactivado, sin link, sin consentimiento.
  Ruta: delegated direct (writer trigger: avisos, vehiculos, README, tests).

## Criterios de aceptación
- Retirar un auto con celular y consentimiento encola reseña a +N días; con vitrificado, también mantenimiento a +N meses.
- Fuera de horario o domingo no sale nada de post-venta; dentro sale, con ≥ espaciado entre ellos.
- Desactivado, sin consentimiento, sin link (reseña) → no sale y queda registrado el motivo.
- Avisos ingreso/en_proceso/listo sin cambios de comportamiento.
- Tests server verdes y build del client OK.

## Progreso
- Exploración hecha; decisiones del usuario registradas.
- T1 hecha, commit `e73e11f`. Checks: `npm test` server
  59/59 pass; client `npm run build` OK; `oxlint src` sin avisos.
  - Ajustes ahora tienen `grupo` (showroom | postventa): una tarjeta por grupo en Configuración.
  - Sí/no se guarda al tocar el interruptor (sin botón Guardar). Textos con "Usar el de fábrica".
  - Interruptor extraído a `client/src/components/Interruptor.tsx` (lo usa también FormVehiculo).
  - Decisión propia (conservadora): textos sin espacios en las puntas; mensajes máx. 600, link máx. 300;
    el link puede ser http o https; no se exige que el texto de reseña contenga `{link}`.
  - Tamaño: ~770 líneas (sobre la heurística de 400): dos tipos nuevos de ajuste en server y client, sus
    campos táctiles y 11 definiciones con su ayuda; partirla habría dejado tipos sin UI.
- T2 hecha, commit `0d98493`. Checks: `npm test` server 68/68 pass (nuevos: `migracion.test.ts`,
  `consentimiento.test.ts`); client `npm run build` OK; `oxlint src` sin avisos.
  - Migración: reconstruye `avisos` si su CREATE no menciona 'resena' (foreign_keys OFF fuera de la
    transacción, copia con ids, recrea el índice, conserva el contador AUTOINCREMENT, `foreign_key_check`).
    Ninguna tabla ni trigger referencia `avisos` (historial apunta a vehiculos/servicios).
  - Decisión propia (conservadora): por API, alta sin `acepta_whatsapp` = no aceptó (el "marcado por
    defecto" es solo del formulario); valores no booleanos => 400. El consentimiento solo viaja con PIN,
    igual que el celular. En el formulario es un interruptor (mismo estilo que los servicios), no un checkbox.
- T3 hecha, commit `6272907`. Checks: `npm test` server 89/89 pass (nuevo: `postventa.test.ts`,
  21 tests; `avisos.test.ts` sin tocar y verde); `tsc --noEmit` server OK; client `npm run build` OK;
  `oxlint src` sin avisos.
  - Módulo nuevo `server/src/postventa.ts` (programar, horario, espaciado, motivos, texto); avisos.ts
    lo usa en el despachador. `despacharPendientes(enviador, reloj?)`: reloj inyectable solo para el horario.
  - Orden al vencer un post-venta: fuera de horario => espera (sin intentos) → motivo (desactivado, sin
    consentimiento, sin link) => cancelado → sin celular => sin_telefono → espaciado => espera → envío.
  - `cancelarAvisos` (retiro y auto inactivo) solo toca ingreso/en_proceso/listo; "el auto ya se retiró"
    solo aplica a esos tipos.
  - Decisiones propias (conservadoras): el motivo de cancelación de post-venta también queda en
    `avisos.ultimo_error` (los del taller siguen igual, solo log). Un post-venta desactivado se decide
    recién dentro del horario (si lo reactivan antes, sale). El espaciado se mide con `enviado_en` (reloj de
    SQLite). Se documentó `TZ` como zona del horario (README, `.env.example`, `docker-compose.yml`).
- RDD assess por commit: no corrido por el writer (queda para el orquestador).
- Próximo: revisión del usuario y PR único (`single-pr`).
