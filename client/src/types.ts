// Tipos del dominio del taller. Alineados con el modelo de datos del CLAUDE.md.

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

// --- Configuración (/admin → Configuración), tal como la manda GET /api/config ---

// Un ajuste editable: su definición (qué es, qué valores acepta) y su valor
// actual. Hay enteros, sí/no y textos; si el server suma otro tipo, se agrega
// acá a la unión `Ajuste` y su campo en CampoAjuste (components/Configuracion.tsx).
// `grupo` dice en qué tarjeta va (ver GRUPOS en Configuracion.tsx).
interface AjusteBase {
  clave: string;
  grupo: string;
  etiqueta: string;
  ayuda: string;
}

export interface AjusteEntero extends AjusteBase {
  tipo: "entero";
  min: number;
  max: number;
  porDefecto: number;
  valor: number;
}

export interface AjusteBooleano extends AjusteBase {
  tipo: "booleano";
  porDefecto: boolean;
  valor: boolean;
}

export interface AjusteTexto extends AjusteBase {
  tipo: "texto";
  maxLargo: number;
  permiteVacio: boolean;
  formato?: "url";
  multilinea: boolean;
  porDefecto: string;
  valor: string;
}

export type Ajuste = AjusteEntero | AjusteBooleano | AjusteTexto;

export interface InfoBackup {
  archivo: string; // solo el nombre, dentro de la carpeta de backups
  fecha: string; // ISO (UTC)
  bytes: number;
}

export interface EstadoBackups {
  carpeta: string; // ruta en la PC servidor
  ultimo: InfoBackup | null;
  // El último intento falló (se borra con el próximo backup que salga bien).
  ultimoError: { fecha: string; mensaje: string } | null;
  cantidad: number;
  maximo: number; // cuántos guarda el server
}

export interface DatosConfig {
  ajustes: Ajuste[];
  backups: EstadoBackups;
}
