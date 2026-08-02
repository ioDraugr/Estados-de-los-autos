// Clases compartidas por las tres vistas. Los colores viven en index.css
// (bloque @theme) y las piezas que se repiten —tarjetas, botones, pastillas,
// avisos— se arman acá para no copiar cadenas de Tailwind en cada componente.
// Los tamaños de texto NO van acá: cada vista usa el suyo (el showroom se mira
// de lejos, la tablet del taller de cerca).

// Tarjeta clara sobre el fondo crema: esquinas redondeadas y sombra apenas
// marcada, como en la referencia.
export const TARJETA =
  "rounded-3xl border border-linea bg-crema-alta shadow-[0_3px_14px_rgba(14,14,14,0.06)]";

// Se suma a TARJETA cuando el auto tiene todos sus servicios terminados.
export const RESALTE_LISTO = "ring-4 ring-listo/60";

// Botón principal (amarillo de la marca) y secundario, sobre fondo crema.
export const BOTON_MARCA =
  "rounded-2xl bg-marca font-bold text-tinta active:scale-95 disabled:opacity-50";
export const BOTON_SUAVE =
  "rounded-2xl border border-linea bg-crema font-bold text-tinta active:scale-95 disabled:opacity-50";
export const BOTON_PELIGRO =
  "rounded-2xl bg-red-700 font-bold text-white active:scale-95 disabled:opacity-50";

// Botón dentro de la parte oscura de la cabecera (Inicio, Salir, + Nuevo auto).
export const BOTON_OSCURO =
  "rounded-2xl border border-white/25 bg-white/10 font-bold text-white active:scale-95 disabled:opacity-50";

// Pastilla "Listo" de un auto terminado.
export const PASTILLA_LISTO =
  "shrink-0 rounded-full bg-listo font-bold text-white";

// Franjas de aviso a todo lo ancho: sin conexión (amarillo) y error (rojo).
export const AVISO = "bg-marca text-center font-bold text-tinta";
export const AVISO_ERROR = "bg-red-600 text-center font-bold text-white";

// Mensajes de "Cargando…" / "No hay autos…".
export const TEXTO_VACIO = "text-center text-tinta-suave";
