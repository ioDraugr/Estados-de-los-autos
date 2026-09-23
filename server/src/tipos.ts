// Tipos del dominio del taller (espejo de client/src/types.ts).
// La API devuelve exactamente esta forma, así el front no adapta nada.

export type TipoServicio = "instalacion" | "polarizado" | "vitrificado";

export type EstadoServicio = "esperando" | "en_proceso" | "terminado";

export interface Servicio {
  id: number;
  vehiculo_id: number;
  tipo: TipoServicio;
  estado: EstadoServicio;
}

export interface Vehiculo {
  id: number;
  marca: string;
  modelo: string;
  color: string;
  matricula: string;
  fecha_ingreso: string; // "YYYY-MM-DD HH:MM:SS"
  // Celular del cliente ("+5989XXXXXXX") o null si no se cargó. Opcional porque
  // la API solo lo manda con un PIN válido: NUNCA llega a /display (privacidad).
  telefono?: string | null;
  servicios: Servicio[];
}
