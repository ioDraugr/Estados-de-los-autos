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
- [ ] T2 — Fase B: cola de avisos en SQLite + worker, envío en modo `log`. (espera OK)
- [ ] T3 — Fase C: envío real con Baileys (QR, reintentos, `AVISOS_SOLO_A`). (espera OK)
- [ ] T4 — Fase D (opcional): estado del aviso en `/admin`. (espera OK)

## Criterios de aceptación T1
- Alta y edición aceptan `telefono` vacío (queda NULL) o celular uruguayo válido
  (`099 123 456`, `99123456`, `+598 99 123 456`, `59899123456`) → se guarda `+59899123456`.
- Teléfono inválido → 400 con mensaje claro en español.
- `GET /api/vehiculos` sin PIN no incluye `telefono`; con `x-pin` válido sí.
- `/admin` muestra el campo en el formulario (precargado al editar).
- Bases existentes migran solas (columna nueva).

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
- Commit: ver `git log` (mensaje "feat(avisos): Fase A ..."); RDD assess registrado abajo.

## Próximo paso
T2 (Fase B), con OK del usuario.
