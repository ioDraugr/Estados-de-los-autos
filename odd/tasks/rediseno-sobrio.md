# rediseno-sobrio

Rama: `feat/rediseno-sobrio` · Entrega: un solo PR (squash), una fase = un commit.

## Objetivo
Rediseñar /taller, /admin y Configuración con estética seria: cómoda, fácil de entender, accesible. Menos caricaturesco, nada llamativo como /display.

## Decisiones del usuario (2026-10-04)
- Configuración: **menú lateral + detalle** (maestro-detalle). En pantalla chica: lista que abre cada sección. Filas "título + ayuda + control", agrupadas.
- Conos: **reemplazar por indicador plano** de color por área (rojo/azul/amarillo) junto al nombre.
- Estilo: **superficies sólidas, radios 8–12px, sin brillos ni sombras de color**, paleta cálida aprobada, sans (Geist), sin serifas. Contraste AA+, foco visible, objetivos táctiles >= 48px, sin animaciones salvo foco/estado.
- Entrega: un PR.

## Restricciones
- /display y Bienvenida NO se tocan. Compartidos que no deben cambiar su aspecto en /display: `CabeceraCurva` (tonos oscuros), `Cono`/`ConoCirculo` con tono de display, `PastillaListo*`, `AVISO`, `fondo-oscuro`, `vidrio-oscuro`, `emblema-*`, animaciones `animate-*`, tokens `@theme`.
- Seguros de tocar (solo staff): `fondo-claro`, `vidrio-claro`, `TARJETA`, `BOTON_*`, `GRUPO`, `BotonesEstado`, `AVISO_ERROR/OK`, etc.
- Todo en español; touch-first; sin `<form>`; no mostrar matrícula entera en /display.
- Cliente sin tests: verificación = `npm run build` + `npm run lint` + revisión visual en navegador.
- TDD: no aplica al cliente (sin runner). Tests de servidor no se tocan.
- ~400 líneas/tarea es solo heurística.

## Tareas
- [x] T1 Base: tokens/estilos staff sobrios en `index.css` y `tema.ts`, indicador de área plano, cabecera sobria para tono claro, `TituloSeccion`.
- [x] T2 Taller y Admin: `TallerTarjeta`, `AdminTarjeta`, `BotonesEstado`, `FormVehiculo`, `DetalleVehiculo`, `PinLogin`, páginas.
- [ ] T3 Configuración: layout maestro-detalle, filas agrupadas, `TarjetaConfig`, `Interruptor`, `CambiarPin`, respaldos.

## Aceptación
- Build y lint limpios; /display idéntico (revisado visualmente).
- Contraste AA, foco visible, táctil >= 48px en controles de staff.
- Configuración usable en 360px y en escritorio.

## Ruta / evidencia
(se completa por tarea: ruta inline o delegada, commit, checks)
- T1: delegada (writer; activa el trigger de 2+ archivos). Commit 25310ab. build + lint OK. Revisión visual pendiente.
- T2: delegada. build + lint OK (verificado por el orquestador). PinLogin sobrio también aplica a Reportes (vista de staff, aceptado). Revisión visual pendiente.

## Progreso / siguiente paso
Rama creada. Siguiente: T1.

## Delivery
Estrategia: `single-pr` (el usuario mergea con squash). Pronóstico: > 400 líneas; un PR igualmente, por preferencia registrada del usuario.
