// Constantes y helpers de dominio compartidos por la interfaz.
import type { EstadoServicio, TipoServicio, Vehiculo } from "./types";

// Color del cono por área de trabajo (según CLAUDE.md).
export const COLOR_AREA: Record<TipoServicio, string> = {
  instalacion: "#dc2626", // rojo
  polarizado: "#2563eb", // azul
  vitrificado: "#eab308", // amarillo
};

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

// Estilos de la pastilla de estado (texto + fondo), pensados para alto contraste.
export const ESTILO_ESTADO: Record<EstadoServicio, string> = {
  esperando: "bg-zinc-700 text-zinc-100",
  en_proceso: "bg-amber-500 text-black",
  terminado: "bg-green-600 text-white",
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
