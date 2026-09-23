# Feature: rediseño visual "Vidrio cálido"

Locator: `odd/tasks/rediseno-vidrio.md` · Engram: `odd/rediseno-vidrio/tasks`
Rama: `feat/rediseno-vidrio` (sale de `fix/avisos-revision` @ `4e4085b`, que ya trae el celular del
cliente; los avisos todavía no están en `main` local).
Diseño aprobado: página 2 ("Propuesta 2 · Vidrio cálido") del lienzo
https://claude.ai/artifact/HFAbxTcoEbQ5GuoRGuBNsM

## Objetivo
Llevar las tres vistas (/display, /taller, /admin) a la dirección "Vidrio cálido": capas
translúcidas con desenfoque, luz dorada, una sola tipografía (Geist) y la paleta cálida aprobada.

## Por qué
El usuario pidió un rediseño visual premium, "estilo Apple sin copiarlo", con mucha
transparencia, manteniendo la identidad (rombo ML, curva con resplandor dorado, conos por área).

## Alcance (autorizado por el usuario, 2026-09-22)
- SOLO visual. No cambian los campos del formulario (Marca, Modelo, Color, Matrícula, "Celular para
  avisos por WhatsApp (opcional)", Servicios solo en alta), sus etiquetas ni validaciones; tampoco
  API, sockets, tiempos de refresco, login ni reglas de privacidad (matrícula parcial en /display).
- Se descartan del diseño los agregados de información: estado general "En proceso/En espera" en
  las tarjetas del showroom (queda solo "Listo"), contadores ("7 autos", "En el taller", "Listos"),
  indicador "En vivo", textos nuevos ("Tu auto está listo cuando…", "Acceso del personal",
  "Agregar…" → sigue "+ Instalación").
- Los `confirm()` de Quitar/Retirar quedan nativos.
- Emblema ML animado en la bienvenida (giro 3D, órbitas, ondas, destellos), solo CSS.

## Restricciones
- Todo local, sin internet: la tipografía va empaquetada (`@fontsource-variable/geist`).
- Touch-first; botones ≥44 px; respetar `prefers-reduced-motion`.
- Fallback cuando no hay `backdrop-filter` (fondos más opacos).
- Nada de `<form>` con submit: `onClick`/`onChange` (regla del proyecto).
- Una fase por vez: plan corto, OK del usuario, commit al terminar cada fase.

## Paleta
carbón #16130F · tabaco #2B231B · marfil #F3ECDF · papel #FAF6EE · arena #E6DAC3 · lino #D8C9AE ·
oro ML #EBB82F (claro #F7D678) · bosque #2E5E3A · taupe (texto secundario) #6F6454 ·
peligro #8E2B1F. Conos: sobre claro #D7402F / #3D6CC0 / #E2A822; sobre oscuro #E0473A / #4B7BD6 / #EBB82F.

## Modo de trabajo
- TDD: off (sin configuración de proyecto/sesión; el cliente no tiene runner de tests).
- Chequeos por fase: `cd client && npm run build` (tsc + vite) y `npm run lint` (oxlint), más
  prueba visual en el navegador (celular, tablet, pantalla del showroom).
- RDD: on (global). Entrega: `ask-on-risk`. Pronóstico > 400 líneas en total (4 fases): antes del
  commit que cruce el presupuesto se pregunta la estrategia de cadena.

## Tareas
- [x] F0 — Base visual: Geist empaquetada (sale Nunito), paleta en `@theme`, clases de vidrio
  (claro/oscuro/hoja + fallback), fondos ambientales, animaciones base y reduced-motion, piezas de
  `tema.ts` al estilo cápsula, `LogoML` con "ML" en Geist.
  Ruta: delegated direct (writer trigger: index.css, tema.ts, LogoML.tsx, package.json).
- [ ] F1 — Showroom (/display): cabecera cápsula + horizonte dorado, bienvenida con `EmblemaML` 3D,
  grilla de tarjetas de vidrio, ficha como hoja de vidrio con progreso por servicio, conos
  redibujados, estados vacío/cargando/sin conexión.
- [ ] F2 — Personal (/taller y /admin): PIN con teclado circular (+ error), `BotonesEstado`
  segmentado, tarjetas de vidrio claro, `FormVehiculo` agrupado con interruptores (mismos campos),
  estados "Guardando…"/error.
- [ ] F3 — Pulido: responsive (celular, tablet, showroom), rendimiento del desenfoque, fallback,
  README.

## Criterios de aceptación
- `npm run build` y `npm run lint` limpios en `client/` después de cada fase.
- Mismos campos, textos funcionales y comportamiento que antes; solo cambia el aspecto.
- Se ve correcto en celular, tablet y pantalla grande; sin scroll horizontal.
- Sin dependencias de internet en runtime.

## Progreso / evidencia
### F0 (hecha)
- Ruta: delegated direct (writer trigger: index.css, tema.ts, LogoML.tsx, package.json + raíces de
  4 vistas).
- Geist: `@fontsource-variable/geist/files/geist-latin-wght-normal.woff2` (29 kB en dist); Nunito
  desinstalada (solo se usaba en index.css).
- Utilidades `vidrio-claro|oscuro|hoja-clara|hoja-oscura`, `texto-degrade`, `fondo-claro|oscuro`
  con fallback opaco (0.94) bajo `@supports not (backdrop-filter)`. Tailwind v4 solo emite las que
  se usan: por ahora solo `vidrio-claro` y `fondo-claro` (el resto se valida en F1/F2).
- Chequeos (re-ejecutados por el orquestador): `npm run build` OK sin warnings; `npm run lint` OK.
- Visual: capturas con Chromium headless + `vite` solo (sin server, para no tocar WhatsApp):
  /admin (PIN) con Geist, fondo ambiental y botones cápsula OK; /display (bienvenida) con Geist,
  todavía con la cabecera vieja (F1).
- Pendiente para F3: iOS ignora `background-attachment: fixed` (las manchas scrollean); revisar
  contraste de pantallas aún no rediseñadas; `npm audit` reporta hallazgos previos (no tocados).

## Próximo paso
F1 — showroom (plan corto al usuario y esperar OK).
