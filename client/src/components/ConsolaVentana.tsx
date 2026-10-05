// Ventana flotante de la consola de /admin (hoy: Configuración). Se abre
// encima de la lista de autos, con el fondo atenuado; se cierra con el botón
// "Cerrar" de la barra de título, con Escape o tocando afuera. En el celular
// ocupa toda la pantalla. Foco: entra al botón Cerrar, queda atrapado adentro
// mientras está abierta y vuelve a donde estaba al cerrar.
import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

const FOCALIZABLES =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function ConsolaVentana({ titulo, onCerrar, children }: Props) {
  const idTitulo = useId();
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);
  // Siempre la última función, sin volver a montar el efecto.
  const alCerrar = useRef(onCerrar);
  useEffect(() => {
    alCerrar.current = onCerrar;
  });

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    cerrar.current?.focus();
    // Sin scroll de la página de atrás mientras la ventana está abierta.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function teclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        alCerrar.current();
        return;
      }
      if (e.key !== "Tab" || !caja.current) return;
      const items = Array.from(
        caja.current.querySelectorAll<HTMLElement>(FOCALIZABLES),
      );
      if (items.length === 0) return;
      const primero = items[0];
      const ultimo = items[items.length - 1];
      const activo = document.activeElement;
      if (
        e.shiftKey &&
        (activo === primero || !caja.current.contains(activo))
      ) {
        e.preventDefault();
        ultimo.focus();
      } else if (
        !e.shiftKey &&
        (activo === ultimo || !caja.current.contains(activo))
      ) {
        e.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("keydown", teclado);
      document.body.style.overflow = overflow;
      if (previo && document.contains(previo)) previo.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-20 flex items-stretch justify-center bg-slate-900/50 sm:items-center sm:p-6"
      onClick={onCerrar}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-5xl flex-col overflow-hidden bg-con-sup text-con-texto shadow-[0_24px_64px_-16px_rgba(15,23,42,0.5)] sm:max-h-[90dvh] sm:rounded-sm sm:border sm:border-con-borde-fuerte"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-con-borde bg-con-sup px-4 py-3 sm:px-6">
          <h2 id={idTitulo} className="text-xl font-normal tracking-[-0.02em]">
            {titulo}
          </h2>
          <button
            ref={cerrar}
            type="button"
            onClick={onCerrar}
            className="con-foco inline-flex min-h-12 items-center gap-2 rounded-sm border border-con-borde-fuerte bg-con-sup px-4 text-base font-medium text-con-texto transition-colors hover:bg-con-sup2"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            Cerrar
          </button>
        </div>
        {/* Cuerpo: Configuración con su paleta redefinida en .tema-consola. */}
        <div className="tema-consola fondo-claro min-h-0 flex-1 overflow-y-auto p-4 text-tinta sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
