# Feature: modo presentación (demo)

Locator: `odd/tasks/modo-demo.md` · Rama: `feat/modo-demo` (desde `main` @ 15ebbdb)

## Objetivo
Poder levantar el proyecto para una presentación: base propia con 5 autos falsos ya cargados; el
presentador crea un auto en vivo con su celular real y, mientras presenta, le van llegando por WhatsApp
real los mensajes automáticos de forma gradual (ingreso, en proceso, listo, reseña, mantenimiento),
comprimidos a minutos en vez de 5 min / días / meses.

## Decisiones del usuario (2026-10-04)
- Avance MANUAL: el presentador cambia estados y retira el auto a mano; el server no lo mueve solo.
  Solo se comprimen los tiempos de los mensajes.
- Se levanta con `npm run demo` (desde `server/`), sin Docker.
- Cronograma de los mensajes (desde cada hecho): ingreso +10 s tras crear; "ya arrancamos" +10 s tras
  pasar un servicio a en proceso; "listo" +10 s tras terminar todos; reseña +45 s tras retirar;
  mantenimiento +105 s tras retirar (solo con vitrificado). El conjunto cabe en ~4 min de presentación.

## Alcance / restricciones
- Modo normal intacto: sin MODO_DEMO el comportamiento actual no cambia (y los tests existentes pasan).
- La base real no se toca nunca: el demo usa `server/data/demo/demo.db`, que se recrea en cada arranque
  (solo se borra esa carpeta, con guardas).
- WhatsApp real por defecto (Baileys, la misma sesión vinculada); `AVISOS_ENVIO=log` para ensayar sin
  escribirle a nadie. Puerto aparte (3001) y aviso de que el server real no puede estar corriendo a la vez
  (una sesión de WhatsApp no sirve para dos procesos).
- Los 5 autos falsos NO tienen celular (no mandan mensajes); matrículas inventadas.
- Link de reseñas falso y claramente de demo; espaciado de post-venta en 0; horario de post-venta ignorado.

## Tareas
- [x] T1 Servidor: MODO_DEMO (tiempos comprimidos, horario/espaciado, semilla de 5 autos y config demo)
- [x] T2 `npm run demo` (script que recrea la base, arma el entorno, compila el cliente y arranca) + README
- [x] T3 141 tests del server pasan (128 + 13 nuevos); corrida real con AVISOS_ENVIO=log: 5 autos, y los 5 mensajes salieron a 11 s, 11 s, 11 s, 45 s y 105 s. Sin probar: WhatsApp real, Windows, build del cliente desde el script, interfaz en navegador.

- [x] T4 Reportes falsos: ~50 autos retirados en 5 semanas (determinístico, relativo a hoy) y PIN de reportes 5678; 150 tests pasan (observado). Sin ver: gráficos a ojo, ingreso del PIN con teclado real.

## Decisión del usuario (2026-10-04, después de T1–T3)
- El modo demo también debe mostrar /reportes con datos falsos que se vean reales (semana actual, semana
  anterior y mes), sin que esos autos aparezcan en /admin, /taller ni /display.

## Ruta
Delegado (varios archivos del server). TDD: se agregan tests; runner `cd server && npm test`.
