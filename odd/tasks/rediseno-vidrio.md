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
- RDD: on (global). Entrega: `single-pr` — el usuario pidió commits + push de esta rama y hace el
  merge él desde GitHub (2026-09-22). Pronóstico > 400 líneas en total (4 fases).

## Tareas
- [x] F0 — Base visual: Geist empaquetada (sale Nunito), paleta en `@theme`, clases de vidrio
  (claro/oscuro/hoja + fallback), fondos ambientales, animaciones base y reduced-motion, piezas de
  `tema.ts` al estilo cápsula, `LogoML` con "ML" en Geist.
  Ruta: delegated direct (writer trigger: index.css, tema.ts, LogoML.tsx, package.json).
- [x] F1 — Showroom (/display): cabecera cápsula + horizonte dorado, bienvenida con `EmblemaML` 3D,
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
- Commit: `7b22152`. RDD assess (base `4e4085b`, committed-only): riesgo medium
  (package-lock), 339 líneas con lock (276+55 sin lock), `review_due=false` / `under_budget`
  → queda pendiente en el slice; el borde revisado sigue en `4e4085b`.
- Pendiente para F3: iOS ignora `background-attachment: fixed` (las manchas scrollean); revisar
  contraste de pantallas aún no rediseñadas; `npm audit` reporta hallazgos previos (no tocados).

### F1 (hecha)
- Ruta: delegated direct (writer trigger: CabeceraCurva, Bienvenida, Display, TarjetaVehiculo,
  DetalleVehiculo, Cono, index.css + 2 componentes nuevos).
- Nuevos: `EmblemaML.tsx` (rombo 3D: caras + 6 capas de canto, giro, vaivén, órbitas con puntos en
  colores de área, ondas, destellos, sombra; escenario 360 px escalado por breakpoint/alto con
  `--emblema-escala`) y `ConoCirculo.tsx` (cono en círculo con aro/tilde, compartido tarjeta/ficha).
- `COLOR_AREA` a tonos para claro + `COLOR_AREA_OSCURO`; `TituloSeccion` con prop visual `tono`.
  Se quitaron `.curva`, `.curva-baja` y `animate-flotar` (sin usos).
- Textos, props, handlers, lógica y `ultimosDigitos` sin cambios; no se trajeron agregados de info.
- Tamaño: ~1.380 líneas (emblema 3D + keyframes comentados ~600); supera la guía de 400 porque el
  emblema no se parte sin romperse.
- Chequeos (re-ejecutados por el orquestador): `npm run build` OK; `npm run lint` OK.
- Visual (writer, Chromium headless con API simulada por CDP, sin tocar el server): celular 390,
  tablet 820, notebook 1440, TV 1920; sin scroll horizontal; /taller y /admin siguen bien con la
  cúpula nueva; con reduced-motion el emblema queda quieto y de frente. El orquestador revisó las
  capturas de bienvenida, lista, ficha, celular y /taller en TV.
- Abierto para F2/F3: costura tenue y brillos cuadrados del emblema en render por software
  (mirar con GPU real); ficha max-w-2xl chica en TV; `BotonesEstado` desborda en celular (F2);
  hueco extra bajo la cúpula en /taller y /admin (F2); franjas de conos se funden con tarjetas
  claras (F2).

## Próximo paso
F2 — personal (/taller y /admin): plan corto al usuario y esperar OK.
