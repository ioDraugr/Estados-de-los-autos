# Feature: historial de cambios (para reportes futuros)

Locator: `odd/tasks/historial-cambios.md` · Engram: `odd/historial-cambios/tasks`
Rama: `feat/historial-cambios` (sale de `origin/main` @ `8814901`). Worktree:
`../Estados-de-los-autos-worktrees/historial-cambios` (el árbol principal tiene cambios de otra
sesión en `odd/tasks/rediseno-vidrio.md`; no se tocan).

## Objetivo
Registrar en una tabla nueva cada evento que sirva para reportes más adelante: cambio de estado
de un servicio (servicio, auto, estado anterior, estado nuevo, fecha y hora), alta y retiro del
auto, y agregar/quitar un servicio a un auto que ya está en el taller. Nada visible todavía.

## Por qué
Pedido del usuario (2026-10-01): hoy solo se guarda el estado actual (`servicios.estado` +
`actualizado_en`); sin historial no se pueden medir tiempos ni contar trabajos por período.

## Decisiones del usuario (2026-10-01)
- Precio por servicio: **no por ahora**; se suma cuando se hagan los reportes, con su pantalla.
- Agregar/quitar servicio: **sí** se anota (`servicio_agregado` / `servicio_quitado`).
- Plan aprobado ("¿OK con el plan para arrancar?" → sí).

## Alcance y restricciones
- Tabla `historial` creada con `CREATE TABLE IF NOT EXISTS` en `db.ts` (bases viejas la reciben
  al arrancar). Columnas: `id, vehiculo_id, servicio_id (NULL en ingreso/retiro), tipo_servicio
  (NULL en ingreso/retiro), evento, estado_anterior, estado_nuevo, fecha (UTC, datetime('now'))`.
  `evento IN ('ingreso','cambio_estado','retiro','servicio_agregado','servicio_quitado')`.
- Cada anotación va en la MISMA transacción que el cambio: si el cambio falla, no queda fila.
- `cambiarEstado` al mismo estado no anota nada (no es un cambio).
- Alta: una fila `ingreso` + una `servicio_agregado` (NULL → esperando) por cada servicio.
- Sin API, sin pantalla, sin precio. Todo en español.

## Modo de trabajo
- TDD: off (sin configuración de proyecto/sesión ni pedido del usuario). Tests junto al
  comportamiento. Runner: `cd server && npm test` (`node --import tsx --test`).
- Chequeos: `npm test` y `npx tsc --noEmit` (server).
- RDD: on (global). Entrega: un solo PR (el usuario mergea con squash). Push/PR los decide el
  usuario.
- Pronóstico: ~250 líneas autoradas (bajo el presupuesto de ~400; sin cadena).

## Tareas
- [x] T1 — Registrar historial (tabla + `historial.ts` + enganche en `crearVehiculo`,
  `retirarVehiculo`, `cambiarEstado`, `agregarServicio`, `quitarServicio`) + tests
  `server/test/historial.test.ts` + `limpiarBase()` + README. Ruta: delegated direct (writer
  trigger: `db.ts`, `historial.ts` nuevo, `vehiculos.ts`, `servicios.ts`, tests, README).
  - Evidencia: `npm test` 52/52 (43 previos + 9 nuevos, incluido uno que fuerza un error dentro
    de la transacción con un TEMP TRIGGER y comprueba que el historial se deshace); `npx tsc
    --noEmit` limpio (el escritor además compiló `test/` con un tsconfig descartable: limpio).
    Revisión del diff por el padre: ok.
  - Decisiones menores: mismo estado sigue actualizando `actualizado_en` y avisos como antes,
    solo no anota; los autos de ejemplo del *seed* no generan historial (documentado en README).
  - Commit: ver "Progreso".

## Criterios de aceptación
- Alta de un auto con N servicios => 1 fila `ingreso` + N filas `servicio_agregado`.
- Cambio de estado real => 1 fila con anterior/nuevo correctos; mismo estado => 0 filas.
- Cambio fallido (servicio inexistente/quitado, estado inválido) => 0 filas.
- Retiro => 1 fila `retiro`; retirar dos veces => 1 sola fila.
- Agregar/quitar servicio => su fila; si se rechaza (duplicado, último servicio) => 0 filas.
- Tests previos (43) siguen en verde; `tsc` limpio.

## Progreso
- 2026-10-01: worktree creado, línea base `npm test` 43/43 verde.
- 2026-10-01: T1 hecha y commiteada en `feat/historial-cambios` (`d3dd447`).
- 2026-10-01: RDD `review assess` sobre `8814901..d3dd447`: riesgo **medio**
  (`executable_change` en `db.ts`), `review_due` por `slice_budget_reached` (443 líneas). Se
  pidió consentimiento al usuario: **declinado** → sigue la política normal del repo (sin
  recibo de revisión; entrega `disabled/unmanaged` para este slice).

- 2026-10-01: prueba manual de punta a punta (server de la rama, base descartable en /tmp,
  avisos en `log`): 11 acciones por la API → las 10 filas esperadas; doble toque, estado
  inválido y segundo retiro no anotaron nada. Base de prueba borrada.
- 2026-10-01: push de `feat/historial-cambios` y PR #12 abierto
  (https://github.com/ioDraugr/Estados-de-los-autos/pull/12), autorizado por el usuario.

## Próximo paso
El usuario mergea el PR #12 (squash). Después: limpiar el worktree y la rama local.
