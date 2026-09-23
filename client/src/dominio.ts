// Constantes y helpers de dominio compartidos por la interfaz.
import type { EstadoServicio, TipoServicio, Vehiculo } from "./types";

// Color del cono por área de trabajo (según CLAUDE.md).
export const COLOR_AREA: Record<TipoServicio, string> = {
  instalacion: "#dc2626", // rojo
  polarizado: "#2563eb", // azul
  vitrificado: "#eab308", // amarillo
};

// Las tres áreas, en el orden en que se muestran siempre (referencia de conos,
// alta de un auto, botones para agregar un servicio).
export const AREAS: TipoServicio[] = [
  "instalacion",
  "polarizado",
  "vitrificado",
];

export const NOMBRE_AREA: Record<TipoServicio, string> = {
  instalacion: "Instalación",
  polarizado: "Polarizado",
  vitrificado: "Vitrificado",
};

export const NOMBRE_ESTADO: Record<EstadoServicio, string> = {
  esperando: "Esperando",
  en_proceso: "En proceso",
  terminado: "Terminado",
};

// Estilos de la pastilla de estado (texto + fondo) sobre el fondo crema del
// tema, pensados para alto contraste y para leerse de lejos.
export const ESTILO_ESTADO: Record<EstadoServicio, string> = {
  esperando: "bg-arena text-tinta",
  en_proceso: "bg-marca text-tinta",
  terminado: "bg-listo text-crema-alta",
};

// Un auto está terminado solo cuando TODOS sus servicios están terminados.
export function autoTerminado(vehiculo: Vehiculo): boolean {
  return (
    vehiculo.servicios.length > 0 &&
    vehiculo.servicios.every((s) => s.estado === "terminado")
  );
}

// En /display nunca se muestra la matrícula entera: solo los últimos dígitos.
export function ultimosDigitos(matricula: string, cantidad = 4): string {
  const limpia = matricula.replace(/\s|-/g, "");
  return limpia.slice(-cantidad);
}

// El server guarda el celular como "+5989XXXXXXX" (formato de WhatsApp). Para
// leerlo en la tablet lo mostramos como se escribe acá: "099 123 456". Si no
// tiene esa forma (no debería pasar), se muestra tal cual.
export function celularLocal(telefono: string): string {
  const partes = telefono.match(/^\+598(9\d)(\d{3})(\d{3})$/);
  return partes ? `0${partes[1]} ${partes[2]} ${partes[3]}` : telefono;
}
