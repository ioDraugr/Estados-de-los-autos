# Reportes para el dueño (/reportes)

Archivo: `odd/tasks/reportes-dueno.md` · Engram: `odd/reportes-dueno/tasks`
Rama: `feat/reportes` (desde `main` afbd4de)

## Objetivo
Vista de reportes para el dueño, armada sobre la tabla `historial`, por semana y por mes:
autos atendidos, servicios más hechos, tiempo promedio de cada servicio ("en proceso" → "terminado"),
autos que más tardaron. Gráficos simples y claros, en español, para PC/tablet.

## Por qué
El historial se viene anotando desde #12 justamente para esto; el dueño no tiene hoy forma de ver
cómo rinde el taller.

## Decisiones aprobadas por el usuario (2026-10-03)
- Vista aparte `/reportes` con **PIN propio del dueño**, distinto del de /admin y /taller
  (los vendedores no la ven).
- **Sin facturación** por ahora (no hay precios guardados; queda para más adelante).
- Gráficos con **Recharts** (dependencia nueva del cliente).

## Decisiones de implementación (default razonable, a confirmar en el PR)
- PIN del dueño en `config` (clave `pin_reportes`). Si todavía no existe, /reportes pide crearlo,
  y para crearlo hay que ingresar también el PIN de /admin (así no lo inventa el primero que llega).
  No puede ser igual al de /admin. Usa el mismo limitador de intentos que el PIN de /admin.
  Se puede cambiar desde /reportes.
- Fechas: el historial está en UTC; los períodos (semana lunes–domingo, mes calendario) se arman en
  hora local del servidor.
- Tiempo de un servicio: desde el último `en_proceso` hasta su `terminado`; si vuelve atrás y
  re-termina, cuenta la última vuelta completa. Servicios quitados no cuentan.
- Autos que más tardaron: desde `ingreso` hasta que quedó con todos los servicios terminados
  (último `terminado`) — es el tiempo de taller, no depende de cuándo lo retiraron.
- Autos atendidos en el período: autos con al menos un servicio terminado en el período.

## Alcance
Server: módulo de reportes (consultas), PIN del dueño + middleware, endpoints, tests.
Client: ruta `/reportes`, login con PIN del dueño, pantalla de reportes con Recharts, README.
Fuera de alcance: facturación/precios, exportar a Excel/PDF, cambios en /admin, /taller, /display.

## Configuración de verificación
- TDD: **off** (fuente: sin configuración de proyecto/sesión, igual que features previas). Checks funcionales.
- Runner: `cd server && npm test`; client: `cd client && npm run build` y `npm run lint`.
- Verificación visual manual en navegador con datos de prueba (cliente sin tests).
- RDD: **on** (global). Assess tras cada commit; boundary inicial `afbd4de`.
- Entrega: `single-pr` (memoria: el usuario mergea con squash, un PR por feature). Pronóstico ~900 líneas.

## Tareas
- [x] T1 Server: PIN del dueño (config + validación + limitador + endpoints crear/ingresar/cambiar)
  y `GET /api/reportes?periodo=semana|mes&fecha=YYYY-MM-DD` con las 4 métricas; tests.
  Ruta: delegated direct (writer trigger: db/auth/index/reportes nuevos, 2+ archivos no triviales).
- [ ] T2 Client: ruta `/reportes`, login/creación de PIN del dueño, pantalla con selector
  Semana/Mes + navegación de períodos, tarjetas de números, gráficos Recharts, lista de autos lentos.
  Ruta: delegated direct (writer trigger: App, api, página y componentes nuevos).
- [ ] T3 README + verificación visual con datos de prueba.
  Ruta: inline (README) + verificación en navegador.

## Criterios de aceptación
- /reportes no se abre con el PIN de /admin; sí con el del dueño.
- Las métricas coinciden con el historial en los tests (casos: vuelve atrás, servicio quitado,
  auto sin terminar, borde de semana/mes en hora local).
- La lista de autos lentos respeta la regla del proyecto: marca modelo color + últimos dígitos,
  nunca la matrícula entera.
- Todo en español, legible en tablet, estilo "Vidrio cálido".
- `npm test` (server), `npm run build` y lint (client) en verde.

## Progreso
- 2026-10-03: plan aprobado, rama creada, documento creado.
- 2026-10-03: T1 hecho (delegated). Archivos: server/src/{auth,reportes,rutaReportes,index}.ts, test/{ayudas,reportes.test}.ts.
  Evidencia: `npm test` 129/129 (18 nuevos), `tsc --noEmit` limpio. ~1000 líneas (585 tests), supera la guía de 400: no se recortaron tests.
  Decisiones: headers `x-pin` (admin, solo para crear) y `x-pin-reportes` (dueño); limitador separado para el PIN
  del dueño (que errores de vendedores no bloqueen al dueño); NO se valida "PIN admin ≠ PIN dueño" al cambiar el
  PIN de admin (el rechazo filtraría el PIN del dueño sin límite de intentos). Autos cargados por seed no tienen
  historial y no aparecen. 401 con `motivo: sin_pin_reportes` → el cliente muestra "crear PIN".

## Próximo paso
T2.
