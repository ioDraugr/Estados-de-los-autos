# Bienvenida viva (/display)

Archivo: `odd/tasks/bienvenida-viva.md` · Engram: `odd/bienvenida-viva/tasks`
Rama: `feat/bienvenida-viva` (worktree `../Estados-de-los-autos-worktrees/bienvenida-viva`, desde `origin/main` 175ba89)

## Objetivo
Mejorar la bienvenida del showroom (`client/src/components/Bienvenida.tsx`) sin perder emblema,
"Taller ML", "¿Cómo va tu auto?" ni "Tocá para ver el estado", sumando:
1. Cápsula de vidrio oscuro con datos en vivo: autos en el taller, cuántos listos, y por cono
   (instalación/polarizado/vitrificado) cuántos servicios sin terminar hay en esa área.
2. Anuncio dorado ~10 s cuando un auto pasa a "listo": "Marca Modelo ••XXXX está listo para retirar"
   (recorte con `ultimosDigitos`, nunca la matrícula entera). Reemplaza a la cápsula mientras dura;
   varios en cola, uno tras otro.
3. Frases rotativas (fundido suave, ~7 s) debajo de "Tocá para ver el estado", editables en
   Configuración (/admin).

## Por qué
El cartel de bienvenida hoy es estático; el showroom gana información viva y un aviso visible
cuando un auto queda listo.

## Decisiones aprobadas por el usuario (2026-10-02)
- Mockup aprobado: `odd/mockups/bienvenida.mockup.html`. La flecha que baja/sube se reemplaza por la frase.
- Datos de la cápsula: de la lista que /display ya carga (Socket.IO `vehiculos:cambio` + polling). Sin cambios de servidor.
- Detección de "listo": diff en el cliente entre la lista anterior y la nueva (no-listo → listo).
  La primera carga no anuncia. Si la pantalla se reinicia en ese momento, el anuncio se pierde (aceptado).
- Frases: nuevo ajuste en `AJUSTES` (grupo showroom) + endpoint PÚBLICO de solo lectura que devuelve
  solo las frases; /display las re-pide en `vehiculos:cambio` (PATCH /api/config ya lo emite).
- Estética "Vidrio cálido" existente (vidrio-oscuro, oro marca, listo-claro); legible de lejos.
- Reducir movimiento: la regla global `prefers-reduced-motion` apaga fundidos/escala/barrita;
  los cambios quedan instantáneos.

## Alcance
Server: ajuste de frases, endpoint público, tests. Client: Configuración (editor de lista),
api.ts, Display.tsx, Bienvenida.tsx (+ componentes nuevos), index.css, README.
Fuera de alcance: cambios en avisos WhatsApp, /taller, lista de /display.

## Configuración de verificación
- TDD: **off** (fuente: sin configuración de proyecto/sesión, igual que features previas). Checks funcionales.
- Runner: `cd server && npm test`; client: `cd client && npm run build` y `npm run lint`.
- Verificación visual manual en navegador (cliente sin tests).
- RDD: **on** (global). Assess tras cada commit; boundary inicial `175ba89`.
- Entrega: `single-pr` (memoria: el usuario mergea con squash, un PR por feature). Pronóstico ~600 líneas.

## Tareas
- [x] T1 Frases editables: ajuste en server (`ajustes.ts`), endpoint público `GET /api/frases`,
  tests de server, editor de lista (agregar/quitar) en Configuración, `api.ts`.
  Ruta: delegated direct (writer trigger: server + client, 2+ archivos no triviales).
- [x] T2 Bienvenida: frase rotativa + cápsula en vivo (Display pasa vehículos y frases a Bienvenida).
  Ruta: delegated direct (writer trigger: Display, Bienvenida, componentes nuevos, CSS).
- [x] T3 Anuncio dorado de "listo" con cola, diff en Display, README.
  Ruta: delegated direct (writer trigger: Display, componente nuevo, CSS, README).

## Criterios de aceptación
- Lo existente de la bienvenida se mantiene; tocar en cualquier parte sigue abriendo la lista.
- Cápsula se actualiza en vivo; números legibles de lejos.
- Anuncio nunca muestra matrícula completa; dura ~10 s; cola sin superposición.
- Frases guardadas en /admin aparecen en /display sin recargar; sin frases, no se muestra nada.
- Con reducir movimiento no hay animaciones.
- `npm test` (server), `npm run build` y lint (client) en verde.

## Progreso
- 2026-10-02: mockup aprobado, worktree y documento creados.
- T1 commit `d584c2e`: nuevo tipo de ajuste `lista`, clave `frases_bienvenida` (showroom, máx 10 × 80 car.,
  guardada una por línea; lista vacía = sin frases), `GET /api/frases` público → `{ frases }` (router
  `server/src/rutaFrases.ts`), editor CampoLista en Configuración. Evidencia: server 111/111 (7 nuevos en
  `frases.test.ts`), client build + lint OK (writer y orquestador re-corrió server). Pendiente: mirada
  visual del editor en navegador. RDD assess (base 175ba89, committed-only): medium, `under_budget` → pendiente en el slice.

- T2 commit `f1d44f5`: `FraseRotativa.tsx` (fundido 0,9 s cada 7 s; con reducir movimiento cambia al
  instante vía matchMedia), `CapsulaTaller.tsx` (vidrio oscuro, autos/listos/conos), slot `pie` en
  CabeceraCurva (en flujo, no se pisa con el título), Display carga frases en mount/connect/cambio,
  Bienvenida acepta `anuncio` que reemplaza la cápsula (gancho para T3). Se quitó `.animate-bajar`.
  Evidencia: client build + lint OK, server 111/111, capturas 1920×1080, 800×400 y 390×844 con DB
  descartable. Pendiente: reducir movimiento verificado solo por código. RDD assess (base 175ba89):
  medium, `slice_budget_reached` → review due.

- Docs `42145b0`: documento + mockup commiteados (evita untracked en el preflight RDD).
- RDD preflight rango 175ba89..42145b0: medium (17 archivos, 889 líneas), consentimiento relayado →
  **declinado** por el usuario. Boundary siguiente: `42145b0`.
- T3 commit `bb3b886`: `useAnunciosListo.ts` (snapshot en ref, primera carga no anuncia, cola sin
  duplicados, descarta los que dejan de estar listos, timer JS 10 s, no encola con la lista abierta y
  vacía la cola al tocar), `AnuncioListo.tsx` (vidrio-oro, role=status, barra de tiempo oculta con
  reducir movimiento), README. Evidencia: build + lint OK, server 111/111, browser: cola de 2 autos en
  orden, drop de un auto que vuelve a en_proceso, nombre largo envuelve. Hallazgo propio: scrollbar
  visible con el anuncio a 1920×1080 y +27 px a 800×400 con nombre largo → T3a.
- [x] T3a Fix commit `346eea9`: causa = `pb-[24dvh]` fijo bajo el pie en un hero `min-h-dvh`; ahora es un
  espaciador que cede (máx 24dvh, mín 8 px). Desde sm el nombre se trunca con "…" y "••XXXX está listo para
  retirar" queda entero; 2.ª línea oculta en `bajo:`. Corrige también un scroll de T2 a 1280×720.
  Evidencia: scrollHeight = innerHeight en 1920×1081, 1280×720, 800×400, 390×844 (cápsula, anuncio normal y
  largo); título nunca pisado. Efecto visible: a 1280×720 el pie queda sobre la línea del horizonte.
  Orquestador: server 111/111, client build + lint OK.

- RDD assess rango 42145b0..39d0360 (committed-only): medium, `under_budget` → queda pendiente en el slice (sin review).

## Siguiente paso
PR #15 abierto (single-pr), commits d584c2e..7b3b2ad. Queda el merge (squash) a decisión del usuario.
