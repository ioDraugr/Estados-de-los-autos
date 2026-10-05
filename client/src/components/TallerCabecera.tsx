// Cabecera de /taller: marca, título, estado de la conexión y Salir.
import { LogoML } from "./LogoML";

interface Props {
  enVivo: boolean;
  onSalir: () => void;
  // Vuelve a la pantalla de elección de modo (ausente en esa misma pantalla).
  onCambiarModo?: () => void;
}

export function TallerCabecera({ enVivo, onSalir, onCambiarModo }: Props) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-con-borde bg-con-sup px-3 py-3 sm:px-6">
      <LogoML className="h-10 w-auto shrink-0" />
      <h1 className="font-mono text-sm font-medium tracking-[0.12em] text-con-texto uppercase sm:text-base">
        Taller
      </h1>
      <p
        role="status"
        className="flex min-w-0 flex-1 items-center justify-end gap-2 text-sm text-con-suave"
      >
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            enVivo ? "bg-con-listo" : "bg-con-peligro"
          }`}
        />
        <span
          className={`min-w-0 truncate ${enVivo ? "sr-only sm:not-sr-only" : "text-con-peligro"}`}
        >
          {enVivo ? "En vivo" : "Sin conexión — reintentando…"}
        </span>
      </p>
      {onCambiarModo && (
        <button
          type="button"
          onClick={onCambiarModo}
          aria-label="Cambiar modo"
          className="con-foco inline-flex min-h-12 items-center justify-center rounded-sm border border-con-borde-fuerte bg-con-sup px-4 text-base font-medium text-con-texto transition-colors hover:bg-con-sup2"
        >
          <span className="sm:hidden">Modo</span>
          <span className="hidden sm:inline">Cambiar modo</span>
        </button>
      )}
      <button
        type="button"
        onClick={onSalir}
        className="con-foco inline-flex min-h-12 items-center justify-center rounded-sm border border-con-borde-fuerte bg-con-sup px-4 text-base font-medium text-con-texto transition-colors hover:bg-con-sup2"
      >
        Salir
      </button>
    </header>
  );
}
