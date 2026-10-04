// Clases compartidas por las tres vistas. Los colores y los materiales de
// vidrio viven en index.css (bloque @theme y utilidades @utility) y las piezas
// que se repiten —tarjetas, botones, pastillas, avisos— se arman acá para no
// copiar cadenas de Tailwind en cada componente. Las vistas del personal usan
// un estilo sobrio: superficies sólidas, bordes finos y radios de 8 a 12px.
// BOTON_OSCURO, PASTILLA_* y AVISO siguen siendo del showroom/cabecera oscura.
// Los tamaños de texto NO van acá: cada vista usa el suyo (el showroom se mira
// de lejos, la tablet del taller de cerca).

// Tarjeta plana de /taller, /admin y Configuración: papel con borde fino de
// lino, esquinas de 12px, sin sombra ni desenfoque (lo pone vidrio-claro).
export const TARJETA = "rounded-xl vidrio-claro";

// Se suma a TARJETA cuando el auto tiene todos sus servicios terminados: borde
// y fondo en verde suave. Va con "!" para ganarle al fondo y al borde que pone
// vidrio-claro.
export const RESALTE_LISTO = "border-listo/50! bg-[#e8f0e4]!";

// Foco visible para teclado y lectores de pantalla en los botones del personal:
// anillo de 3px en carbón con separación (se lee sobre papel y sobre oro).
const FOCO =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-tinta";

// Botón principal: oro de la marca sólido con texto carbón (contraste ~9:1),
// sin sombras. Alto táctil mínimo de 48px.
export const BOTON_MARCA = `min-h-12 rounded-lg bg-marca font-semibold text-tinta transition-colors hover:bg-[#f2c544] disabled:opacity-50 ${FOCO}`;

// Botón secundario sobre fondo claro: arena con borde de lino.
export const BOTON_SUAVE = `min-h-12 rounded-lg border border-linea bg-arena font-semibold text-tinta transition-colors hover:bg-[#dccdb1] disabled:opacity-50 ${FOCO}`;

// Botón destructivo (Quitar, Retirar): contorno rojo sobre papel, no un bloque
// rojo lleno.
export const BOTON_PELIGRO = `min-h-12 rounded-lg border border-peligro/60 bg-crema-alta font-semibold text-peligro transition-colors hover:bg-peligro/10 disabled:opacity-50 ${FOCO}`;

// Botón sobre fondo oscuro (Inicio, Salir, + Nuevo auto en la cabecera).
export const BOTON_OSCURO =
  "rounded-full bg-crema/10 font-semibold text-crema transition hover:bg-crema/[0.18] active:scale-95 disabled:opacity-50";

// Etiqueta "Listo" de un auto terminado (solo el personal): verde bosque
// plano con esquinas chicas, sin resplandor.
export const PASTILLA_LISTO =
  "shrink-0 rounded-md bg-listo font-semibold text-crema-alta";

// Pastilla "Listo" sobre fondo oscuro (showroom): verde más encendido para que
// no se pierda contra el carbón. Lleva un puntito claro adelante.
export const PASTILLA_LISTO_OSCURO =
  "inline-flex shrink-0 items-center gap-2 rounded-full bg-listo-vivo font-semibold text-crema-alta shadow-[0_10px_24px_-10px_rgba(63,122,78,0.8)]";

// Cápsula de la matrícula parcial en el showroom ("•••• 4821"): cifras
// tabulares para que no bailen de un auto a otro.
export const CAPSULA_MATRICULA =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-crema/[0.09] font-semibold tracking-[0.02em] tabular-nums";

// Matrícula ENTERA en las tarjetas claras de /taller y /admin (los trabajadores
// la necesitan para identificar el auto): placa plana con borde, cifras
// tabulares.
export const CAPSULA_MATRICULA_CLARA =
  "inline-flex h-[30px] shrink-0 items-center rounded-md border border-linea bg-arena px-3 font-semibold tracking-[0.04em] text-tinta tabular-nums";

// Aviso de "sin conexión": cápsula de vidrio dorado. Sin desenfoque
// (sin-vidrio) el dorado va casi lleno, para que el texto oscuro se lea igual.
export const AVISO =
  "rounded-full border border-white/60 bg-marca/55 text-center font-semibold text-tinta backdrop-blur-md sin-vidrio:bg-marca/90";

// Aviso de "sin conexión" de las vistas del personal: recuadro plano en oro
// con borde carbón, sin desenfoque ni sombras (lleva texto e ícono estático).
export const AVISO_CONEXION =
  "rounded-lg border border-tinta bg-marca font-semibold text-tinta";

// Aviso de error: recuadro plano con borde rojo (puede ocupar varias líneas).
export const AVISO_ERROR =
  "rounded-lg border border-peligro/60 bg-[#f6e3df] text-center font-semibold text-peligro";

// Aviso de que algo salió bien (ej. "PIN cambiado"): el mismo recuadro, en verde.
export const AVISO_OK =
  "rounded-lg border border-listo/60 bg-[#e3eee2] text-center font-semibold text-listo";

// Mensajes de "Cargando…" / "No hay autos…" (taupe sobre papel: contraste AA).
export const TEXTO_VACIO = "text-center text-tinta-suave";
