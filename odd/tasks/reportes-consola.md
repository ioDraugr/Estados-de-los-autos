# Feature: /reportes con la estética de consola corporativa

Locator: `odd/tasks/reportes-consola.md` · Rama: `feat/admin-consola` (sigue al commit 58a495f del /admin;
un solo PR, squash)

## Objetivo
Llevar /reportes al mismo lenguaje visual que /admin: claro, blanco y negro azulado, líneas finas,
esquinas de 2px, letra liviana, etiquetas en monoespaciada, sin acento de color. Panel serio para el dueño.

## Alcance / restricciones
- Solo cliente y solo visual. Sin cambios de API, PIN, datos ni privacidad (solo los últimos dígitos).
- No se tocan componentes compartidos con otras vistas: TarjetaConfig, tema.ts, PinLogin, CambiarPin,
  CrearPinReportes (el teclado oscuro de PIN queda como está).
- "Cambiar PIN" se abre como ventana flotante (ConsolaVentana), igual que Configuración en /admin.

## Tareas
- [x] T1 Cabecera, selector de período, franja de KPIs, panel genérico, estados vacío/carga/error
- [x] T2 Gráficos (Recharts), tiempos promedio y autos que más tardaron en el nuevo estilo
- [x] T3 tsc, oxlint y build OK (observado); revisión visual a 1440 y 390px; el usuario revisó y aprobó. Sin ver: estados de error, sin conexión y vacío.

## Ruta
T1–T2 delegados (varios archivos). T3 inline. TDD: no aplica (UI); checks funcionales.
