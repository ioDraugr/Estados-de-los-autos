// Selector segmentado de los tres estados de un servicio (consola de /admin).
// El activo lleva tilde y aria-pressed: el estado se lee por texto, no solo por
// color. Alto táctil de 48px.
import type { EstadoServicio } from "../types";

interface Props {
  estado: EstadoServicio;
  disabled: boolean;
  etiquetaServicio: string; // "Instalación", para los lectores de pantalla
  onCambiar: (estado: EstadoServicio) => void;
}

const OPCIONES: { estado: EstadoServicio; texto: string; activa: string }[] = [
  {
    estado: "esperando",
    texto: "Esperando",
    activa: "bg-[#e8e8eb] text-con-texto",
  },
  {
    estado: "en_proceso",
    texto: "En proceso",
    activa: "bg-con-acento text-white",
  },
  {
    estado: "terminado",
    texto: "Terminado",
    activa: "bg-con-listo text-white",
  },
];

export function ConsolaEstados({
  estado,
  disabled,
  etiquetaServicio,
  onCambiar,
}: Props) {
  return (
    <div
      role="group"
      aria-label={`Estado de ${etiquetaServicio}`}
      className="grid grid-cols-3 gap-1 rounded-sm border border-con-borde bg-con-fondo p-1"
    >
      {OPCIONES.map(({ estado: e, texto, activa }) => {
        const activo = e === estado;
        return (
          <button
            key={e}
            type="button"
            aria-pressed={activo}
            disabled={disabled}
            onClick={() => {
              if (!activo) onCambiar(e);
            }}
            className={`con-foco flex min-h-12 items-center justify-center gap-1.5 rounded-sm px-1 text-[15px] font-medium transition-colors disabled:opacity-60 ${
              activo
                ? activa
                : "text-con-suave hover:bg-con-sup2 hover:text-con-texto"
            }`}
          >
            {activo && <span aria-hidden="true">✓</span>}
            {texto}
          </button>
        );
      })}
    </div>
  );
}
