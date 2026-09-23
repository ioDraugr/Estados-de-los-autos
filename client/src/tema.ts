// Clases compartidas por las tres vistas. Los colores y los materiales de
// vidrio viven en index.css (bloque @theme y utilidades @utility) y las piezas
// que se repiten —tarjetas, botones, pastillas, avisos— se arman acá para no
// copiar cadenas de Tailwind en cada componente. Estilo "Vidrio cálido":
// tarjetas de vidrio claro y botones en forma de cápsula.
// Los tamaños de texto NO van acá: cada vista usa el suyo (el showroom se mira
// de lejos, la tablet del taller de cerca).

// Tarjeta de vidrio claro sobre el fondo ambiental (fondo-claro): esquinas bien
// redondeadas, borde de luz arriba y sombra cálida (todo lo pone vidrio-claro).
export const TARJETA = "rounded-[28px] vidrio-claro";

// Se suma a TARJETA cuando el auto tiene todos sus servicios terminados: tinte
// verde en el borde y en el vidrio. Va con "!" para ganarle al fondo y al borde
// que pone vidrio-claro.
export const RESALTE_LISTO =
  "border-listo/40! bg-[rgba(226,238,224,0.62)]!";

// Botón principal (oro de la marca) con sombra dorada y un filo de luz arriba.
export const BOTON_MARCA =
  "rounded-full bg-marca font-semibold text-tinta shadow-[0_10px_24px_-12px_rgba(190,138,24,0.9),inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:bg-[#f2c544] active:scale-95 disabled:opacity-50";

// Botón secundario sobre fondo claro: cápsula apenas tintada.
export const BOTON_SUAVE =
  "rounded-full bg-tinta/[0.07] font-semibold text-tinta transition hover:bg-tinta/[0.12] active:scale-95 disabled:opacity-50";

// Botón destructivo (Quitar, Retirar): tintado en rojo, no un bloque rojo lleno.
export const BOTON_PELIGRO =
  "rounded-full bg-peligro/10 font-semibold text-peligro transition hover:bg-peligro/[0.18] active:scale-95 disabled:opacity-50";

// Botón sobre fondo oscuro (Inicio, Salir, + Nuevo auto en la cabecera).
export const BOTON_OSCURO =
  "rounded-full bg-crema/10 font-semibold text-crema transition hover:bg-crema/[0.18] active:scale-95 disabled:opacity-50";

// Pastilla "Listo" de un auto terminado, con un resplandor verde suave.
export const PASTILLA_LISTO =
  "shrink-0 rounded-full bg-listo font-semibold text-crema-alta shadow-[0_10px_24px_-10px_rgba(46,94,58,0.8)]";

// Pastilla "Listo" sobre fondo oscuro (showroom): verde más encendido para que
// no se pierda contra el carbón. Lleva un puntito claro adelante.
export const PASTILLA_LISTO_OSCURO =
  "inline-flex shrink-0 items-center gap-2 rounded-full bg-listo-vivo font-semibold text-crema-alta shadow-[0_10px_24px_-10px_rgba(63,122,78,0.8)]";

// Cápsula de la matrícula parcial en el showroom ("•••• 4821"): cifras
// tabulares para que no bailen de un auto a otro.
export const CAPSULA_MATRICULA =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-crema/[0.09] font-semibold tracking-[0.02em] tabular-nums";

// Aviso de "sin conexión": cápsula de vidrio dorado.
export const AVISO =
  "rounded-full border border-white/60 bg-marca/55 text-center font-semibold text-tinta backdrop-blur-md";

// Aviso de error: recuadro tintado en rojo (puede ocupar varias líneas, por eso
// no es cápsula).
export const AVISO_ERROR =
  "rounded-2xl border border-peligro/20 bg-peligro/10 text-center font-semibold text-peligro";

// Mensajes de "Cargando…" / "No hay autos…".
export const TEXTO_VACIO = "text-center text-tinta-suave";
