# Feature: /admin como consola oscura maestro-detalle

Locator: `odd/tasks/admin-consola.md` · Rama: `feat/admin-consola` (desde `main` @ d52021b)

## Objetivo
Rediseñar /admin como panel tipo consola (estilo Palantir): oscuro, denso, ordenado, fácil de operar.
Lista compacta a la izquierda (búsqueda, filtros, resumen) y detalle del auto elegido a la derecha.

## Decisiones del usuario (2026-10-04)
- Tono: tras probar oscuro (cálido y grafito), el usuario pidió modo CLARO corporativo y luego mandó como referencia el sitio de Palantir: blanco, negro azulado, grises neutros, letra liviana con etiquetas en monoespaciada, esquinas de 2px, botón principal negro (sin acento de color); oro solo en el logo.
- Incluir: búsqueda, filtros por estado y área, franja de resumen, cambio de estado rápido desde la
  fila, diálogo propio (con deshacer) en vez de confirm() para Quitar/Retirar.
- Móvil: lista primero; al tocar un auto, el detalle ocupa la pantalla (como Configuración).

## Alcance / restricciones
- Solo visual y de interacción en el cliente. Sin cambios de API, sockets, login ni privacidad
  (en /admin se ve la matrícula entera y el celular; /display y /taller no cambian).
- No se tocan componentes compartidos con /taller o /display (BotonesEstado, IndicadorArea, tema.ts):
  los componentes nuevos del admin son propios. Configuración sigue clara, dentro de una hoja.
- Todo en español, touch-first, sin <form>, sin internet.

## Tareas
- [x] T1 Componentes oscuros nuevos + Admin.tsx maestro-detalle (lista, detalle, resumen, filtros)
- [x] T2 Diálogo de confirmación propio (sin deshacer: el server no tiene ruta de restaurar); FormVehiculo oscuro; PinLogin intacto (lo usan /taller y /reportes)
- [~] T3 Verificación: tsc, oxlint y build OK (observado). Navegador: login, 2 columnas, búsqueda, diálogo, móvil OK. Pendiente a mano: Iniciar/Terminar desde la fila, Quitar/Retirar confirmados, alta/edición, Configuración.

## Ruta
T1–T2: delegado (escritor único, 2+ archivos no triviales). T3: inline.
TDD: no aplicable (UI), checks funcionales: `tsc`, build, revisión visual.
