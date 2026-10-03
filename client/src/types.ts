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
  // Si el cliente aceptó los mensajes de post-venta (reseña, mantenimiento).
  // Igual que el teléfono: solo viene con un PIN válido.
  acepta_whatsapp?: boolean;
  servicios: Servicio[];
}

// --- Configuración (/admin → Configuración), tal como la manda GET /api/config ---

// Un ajuste editable: su definición (qué es, qué valores acepta) y su valor
// actual. Hay enteros, sí/no, textos y listas de frases; si el server suma otro tipo, se agrega
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

// Texto libre (los cuidados del aviso de "listo", los mensajes de post-venta, el
// link de reseñas). El server lo guarda sin los espacios de las puntas; vacío
// vale solo si `permiteVacio`.
export interface AjusteTexto extends AjusteBase {
  tipo: "texto";
  maxLargo: number;
  permiteVacio: boolean;
  formato?: "url";
  multilinea: boolean;
  porDefecto: string;
  valor: string;
}

// Lista de frases cortas (las de la bienvenida del showroom): hasta
// `maxCantidad`, de hasta `maxLargo` caracteres cada una. Puede quedar vacía.
export interface AjusteLista extends AjusteBase {
  tipo: "lista";
  maxCantidad: number;
  maxLargo: number;
  porDefecto: string[];
  valor: string[];
}

export type Ajuste = AjusteEntero | AjusteBooleano | AjusteTexto | AjusteLista;

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

// --- Reportes (/reportes), tal como los manda GET /api/reportes ---
// Ver server/src/reportes.ts: períodos y días en hora local del server.

export type PeriodoReporte = "semana" | "mes";

// Una barra del gráfico de autos atendidos: un día (semana) o una semana (mes).
export interface BarraAutos {
  etiqueta: string; // "Lun 28" o "1–4"
  desde: string; // "YYYY-MM-DD"
  hasta: string; // "YYYY-MM-DD" (inclusive)
  cantidad: number;
}

// Un auto de "los que más tardaron". Solo los últimos dígitos de la matrícula:
// el server nunca la manda entera.
export interface AutoLento {
  id: number;
  marca: string;
  modelo: string;
  color: string;
  ultimosDigitos: string;
  minutos: number; // desde el ingreso hasta su último servicio terminado
  tipos: TipoServicio[];
}

export interface Reporte {
  periodo: PeriodoReporte;
  desde: string; // primer día del período ("YYYY-MM-DD")
  hasta: string; // último día del período (inclusive)
  etiqueta: string; // "Semana del 28 sep al 4 oct" / "Octubre 2026"
  // Un día cualquiera del período anterior y del siguiente, para navegar.
  fechaAnterior: string;
  fechaSiguiente: string;
  autosAtendidos: { total: number; serie: BarraAutos[] };
  serviciosPorTipo: { tipo: TipoServicio; cantidad: number }[];
  // minutosPromedio es null si no hubo ninguna vuelta completa para promediar.
  tiempoPromedioPorTipo: {
    tipo: TipoServicio;
    minutosPromedio: number | null;
    muestras: number;
  }[];
  autosQueMasTardaron: AutoLento[];
}
