# Feature: /taller con la estética de consola, enfocado en la función

Locator: `odd/tasks/taller-consola.md` · Rama: `feat/taller-consola` (desde `main` @ 8a0d5de)

## Objetivo
Rediseñar /taller para los trabajadores (tablet, a veces con las manos ocupadas): serio, muy fácil de
entender, cómodo a la vista, centrado en la función, con el mismo lenguaje visual que /admin y /reportes
(claro, negro azulado, líneas finas, esquinas de 2px, etiquetas mono, sin color de acento).

## Decisiones (tomadas por el agente dentro de la libertad que dio el usuario; ajustables)
- Tablero por estado (Esperando | En proceso | Terminado) de TRABAJOS (un servicio de un auto), con una
  acción principal grande por trabajo: "Iniciar" / "Terminar"; volver atrás es secundario y chico.
- Filtro por área (Todas / Instalación / Polarizado / Vitrificado), guardado en la tablet, para que cada
  trabajador vea solo lo suyo.
- Aviso "deshacer" unos segundos después de cada cambio (evita toques sin querer).
- Móvil/tablet vertical: columnas como pestañas con contadores.

## Decisión del usuario (2026-10-04, después de ver el tablero)
Dos modos que se eligen al entrar a /taller:
- GENERAL: tarjetas por auto con los 3 sectores adentro y el selector de estado ahí mismo (como antes).
- POR SECTOR: se elige uno de los 3 sectores y se listan los autos de ese sector para cambiar el estado
  (se reutiliza el tablero por estado ya hecho, fijo en ese sector).
Animaciones lindas pero baratas (solo transform/opacity en CSS), pensado para tablet en el taller.

## Alcance / restricciones
- Solo cliente y solo visual/interacción. Sin cambios de API, sockets, PIN ni privacidad. Los trabajadores
  SOLO cambian estados (nada de alta, editar, agregar/quitar servicios ni retirar). Matrícula entera visible.
- Tiempo real (Socket.IO + poll de respaldo) y reconexión como hoy; aviso de sin conexión.
- No tocar componentes compartidos con /display o /reportes (PinLogin, tema.ts, Cono*, etc.).

## Tareas
- [x] T1 Página + componentes del tablero (cabecera, filtro de área, columnas, tarjeta de trabajo)
- [x] T2 Deshacer, estados vacío/carga/sin conexión, adaptación móvil
- [x] T3 tsc, oxlint y build OK (observado); flujo completo probado con el modo demo (clics reales y API).

- [x] T4 Pantalla de elección de modo, modo General (tarjeta por auto), Por sector (selector de sector + tablero), animaciones livianas, 'Cambiar modo'

## Ruta
T1–T2 delegados (varios archivos). T3 inline. TDD: no aplica (UI); checks funcionales.

## Pendiente de ver
Destello y escalonado en movimiento, estados vacíos, sin conexión real, cierre del aviso a los 6 s, reduced-motion, PIN con teclado en pantalla.
