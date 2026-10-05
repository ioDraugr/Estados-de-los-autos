// Aviso fijo abajo tras cada cambio de estado, con Deshacer grande. Lo
// reemplaza el siguiente cambio y se va solo a los pocos segundos.
import { useEffect, useState } from "react";

export interface AvisoDeshacer {
  clave: number;
  texto: string;
}

interface Props {
  aviso: AvisoDeshacer | null;
  ocupado: boolean;
  onDeshacer: () => void;
  onCerrar: () => void;
}

const MS_AVISO = 6000;

export function TallerAvisoDeshacer({
  aviso,
  ocupado,
  onDeshacer,
  onCerrar,
}: Props) {
  const clave = aviso?.clave;
  useEffect(() => {
    if (clave === undefined) return;
    const id = setTimeout(onCerrar, MS_AVISO);
    return () => clearTimeout(id);
  }, [clave, onCerrar]);

  // Mientras sale (fade) se sigue mostrando el último aviso.
  const [ultimo, setUltimo] = useState<AvisoDeshacer | null>(aviso);
  if (aviso && aviso !== ultimo) setUltimo(aviso);
  const saliendo = !aviso && ultimo !== null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3 sm:px-6 sm:pb-4"
    >
      {ultimo && (
        <div
          key={ultimo.clave}
          onAnimationEnd={() => {
            if (saliendo) setUltimo(null);
          }}
          className={`${saliendo ? "con-anim-aviso-sale pointer-events-none" : "con-anim-aviso-entra pointer-events-auto"} flex w-full max-w-3xl items-center gap-3 rounded-sm bg-con-acento py-2 pr-2 pl-4 text-white`}
        >
          <p className="min-w-0 flex-1 text-base leading-snug sm:text-lg">
            {ultimo.texto}
          </p>
          <button
            type="button"
            disabled={ocupado}
            onClick={onDeshacer}
            className="con-foco min-h-14 focus-visible:outline-white! shrink-0 rounded-sm bg-white px-6 text-lg font-medium text-con-texto transition-colors hover:bg-con-sup2 disabled:opacity-50"
          >
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}
