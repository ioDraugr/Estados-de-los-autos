# Feature: cuidados por servicio en el aviso de "listo"

Locator: `odd/tasks/cuidados-aviso-listo.md` · Engram: `odd/cuidados-aviso-listo/tasks`
Rama: `feat/cuidados-aviso-listo` (sale de `origin/main` @ `6688a2e`). Worktree:
`../Estados-de-los-autos-worktrees/cuidados-aviso-listo` (el árbol principal tiene un cambio de
otra sesión en `odd/tasks/rediseno-vidrio.md`; no se toca).

## Objetivo
Cuando sale el aviso de WhatsApp "listo", que incluya los cuidados de cada servicio que se le
hizo al auto (instalación, polarizado, vitrificado). Varios servicios => todos los cuidados en
**un solo mensaje**. Los textos se editan desde /admin → Configuración.

## Por qué
Pedido del usuario (2026-10-01). Plan aprobado y textos iniciales ajustados por el usuario.

## Decisiones
- Los cuidados son ajustes de tipo "texto" en `AJUSTES` (server/src/ajustes.ts), guardados en
  la tabla `config`: `cuidados_instalacion`, `cuidados_polarizado`, `cuidados_vitrificado`.
  Máx. 800 caracteres, se recortan los espacios de las puntas, vacío permitido (= sin cuidados
  para ese servicio).
- El mensaje se arma al enviar (lee los textos en ese momento: un cambio vale para los avisos
  pendientes). Servicios activos (`eliminado_en IS NULL`), orden fijo instalación, polarizado,
  vitrificado; cada tipo una sola vez aunque haya repetidos.
- Formato:
  ```
  ¡Tu {marca} {modelo} está listo! Ya podés pasar a buscarlo por ML Center.

  Cuidados del polarizado:
  {texto}

  Cuidados del vitrificado:
  {texto}
  ```
  ("Cuidados de la instalación" para instalación.)
- Textos iniciales (aprobados por el usuario):
  - polarizado: "No bajes las ventanillas durante 2 días para que la lámina se asiente bien. Es
    normal ver alguna burbuja o zona empañada los primeros días: desaparece sola a medida que se
    seca. Para limpiar los vidrios usá un paño suave con agua o un limpiador sin amoníaco."
  - vitrificado: "Durante los primeros 7 días no lo laves y, si podés, evitá dejarlo bajo la
    lluvia. Después lavalo a mano con shampoo neutro y paño de microfibra; evitá los lavaderos con
    cepillos y los productos con cera o abrasivos. Si le cae caca de pájaro o resina, sacala cuanto
    antes con agua."
  - instalación: "Antes de irte probá que todo funcione como esperabas. No desconectes la batería
    ni toques el cableado de lo que instalamos sin consultarnos. Si notás cualquier falla o tenés
    una duda, escribinos por acá."

## Alcance y restricciones
- Solo el aviso "listo" cambia; "ingreso" y "en_proceso" quedan igual. Sin matrícula.
- Todo en español; touch-first; sin `<form>` submit (onClick/onChange).
- Fuera de alcance: editar los textos de los otros avisos.

## Modo de trabajo
- TDD: off (sin configuración de proyecto/sesión ni pedido del usuario; mismo criterio que
  features anteriores). Tests junto al comportamiento. Runner: `cd server && npm test`
  (`node --import tsx --test`). Base: 52 tests en verde.
- Chequeos: `npm test` + `npx tsc --noEmit` (server), `npm run build` + `npm run lint` (client).
- RDD: on (global). Entrega: un solo PR (el usuario mergea con squash). Push y PR los decide el
  usuario.
- Pronóstico: ~350 líneas (server ~200 con tests, client ~120, docs ~30). Un solo commit/PR.

## Tareas
- [x] T1 — Ajustes de texto + cuidados en el aviso "listo" + campo en Configuración + tests +
  README. Ruta: delegated direct (writer trigger: `ajustes.ts`, `avisos.ts`,
  `Configuracion.tsx`, `types.ts`, `api.ts`, tests).
  - Tests: ajustes de texto (default, guardar, recorta, vacío ok, rechaza no-string y >800);
    aviso "listo" con un servicio, con tres (un solo envío, orden fijo), texto vacío omitido,
    servicio eliminado no aparece, texto editado se usa al enviar.

  - Hecho: `leerAjuste` genérica (`ValorDe<C>`: string para texto, number para entero);
    `armarMensaje`/`cuidadosDe` en avisos.ts (`SELECT DISTINCT tipo`, un solo envío);
    Configuración con dos tarjetas ("Pantalla del showroom" y "Cuidados en el aviso de
    listo"), `<textarea>` grande con contador N/800 y botón Guardar por campo.
  - Evidencia: `npm test` 67/67 (52 + 15 nuevos: 8 ajustes, 7 avisos); `npx tsc --noEmit` ok;
    client `npm run build` ok y `npm run lint` ok (verificado por el orquestador). El writer
    comprobó que sin `armarMensaje` fallan los 6 tests de cuidados.
  - Tamaño: ~620 líneas (547+/73−), más que el pronóstico: ~210 son tests y el resto el campo de
    texto del cliente y el tipo nuevo de ajustes. Se mantiene un solo PR.
  - Pendiente: prueba manual de la pantalla en la tablet (no se levantó la app).

## Progreso
- 2026-10-01: plan y textos aprobados; worktree creado; base 52/52 en verde.
- 2026-10-01: T1 implementada y verificada.

## Próximo paso
Commit de T1, evaluación RDD, prueba manual del usuario, push/PR cuando el usuario decida.
