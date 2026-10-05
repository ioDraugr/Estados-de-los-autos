// Cabecera de la consola de /admin: marca, título y las acciones globales.
import { LogoML } from "./LogoML";

interface Props {
  ocupado: boolean;
  onNuevo: () => void;
  onConfiguracion: () => void;
  onSalir: () => void;
}

const BOTON_NEUTRO =
  "con-foco inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-con-borde-fuerte bg-con-sup px-4 text-base font-medium text-con-texto transition-colors hover:bg-con-sup2 disabled:opacity-50";

export function ConsolaCabecera({
  ocupado,
  onNuevo,
  onConfiguracion,
  onSalir,
}: Props) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-con-borde bg-con-sup px-3 py-3 sm:px-6">
      <LogoML className="h-10 w-auto shrink-0" />
      <h1 className="min-w-0 flex-1 truncate text-lg font-medium tracking-[-0.02em] text-con-texto sm:text-xl">
        Autos en el taller
      </h1>
      {
        <>
          <button
            type="button"
            onClick={onNuevo}
            disabled={ocupado}
            className="con-foco min-h-12 rounded-sm bg-con-acento px-4 text-base font-medium text-white transition-colors hover:bg-[#3a3d47] disabled:opacity-50"
          >
            + Nuevo auto
          </button>
          <button
            type="button"
            onClick={onConfiguracion}
            aria-label="Configuración"
            className={`${BOTON_NEUTRO} w-12 px-0 sm:w-auto sm:px-4`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            >
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
            <span className="hidden sm:inline">Configuración</span>
          </button>
        </>
      }
      <button type="button" onClick={onSalir} className={BOTON_NEUTRO}>
        Salir
      </button>
    </header>
  );
}
