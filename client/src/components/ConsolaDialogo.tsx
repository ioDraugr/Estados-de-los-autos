// Diálogo de confirmación propio de /admin (reemplaza a confirm()). Accesible:
// role="dialog" + aria-modal, el foco entra en "Cancelar" (lo seguro) y queda
// atrapado adentro, Escape o tocar el fondo cancelan, y al cerrar el foco vuelve
// a donde estaba.
import { useEffect, useId, useRef } from "react";

interface Props {
  titulo: string;
  texto: string;
  confirmar: string; // texto del botón de confirmar (ej. "Retirar auto")
  ocupado: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConsolaDialogo({
  titulo,
  texto,
  confirmar,
  ocupado,
  onConfirmar,
  onCancelar,
}: Props) {
  const idTitulo = useId();
  const idTexto = useId();
  const caja = useRef<HTMLDivElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);
  // Siempre la última función, sin volver a montar el efecto.
  const alCancelar = useRef(onCancelar);
  useEffect(() => {
    alCancelar.current = onCancelar;
  });

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    cancelar.current?.focus();
    function teclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        alCancelar.current();
        return;
      }
      if (e.key !== "Tab" || !caja.current) return;
      const botones = Array.from(
        caja.current.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ),
      );
      if (botones.length === 0) return;
      const primero = botones[0];
      const ultimo = botones[botones.length - 1];
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
      if (previo && document.contains(previo)) previo.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onCancelar}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idTexto}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-sm border border-con-borde-fuerte bg-con-sup p-6 text-con-texto"
      >
        <h2 id={idTitulo} className="text-2xl font-normal tracking-[-0.02em]">
          {titulo}
        </h2>
        <p id={idTexto} className="mt-2 text-lg text-con-suave">
          {texto}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            ref={cancelar}
            type="button"
            onClick={onCancelar}
            className="con-foco min-h-12 flex-1 rounded-sm border border-con-borde-fuerte bg-con-sup2 px-4 text-base font-medium hover:bg-con-sup2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={ocupado}
            className="con-foco min-h-12 flex-1 rounded-sm bg-con-peligro px-4 text-base font-medium text-white hover:bg-[#8f1d17] disabled:opacity-50"
          >
            {ocupado ? "Un momento…" : confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
