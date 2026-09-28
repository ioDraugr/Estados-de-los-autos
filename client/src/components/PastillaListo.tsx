// Pastilla "Listo" de un auto con todos sus servicios terminados, para las
// tarjetas claras de /taller y /admin: cápsula verde con un tilde adelante.
// El tamaño de letra y el alto van por className.
import { PASTILLA_LISTO } from "../tema";

interface Props {
  className?: string;
}

export function PastillaListo({ className = "" }: Props) {
  return (
    <span
      className={`${PASTILLA_LISTO} inline-flex items-center gap-2 px-4 ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px]">
        <path
          d="M5 12.5 L10 17 L19 7"
          fill="none"
          stroke="#FAF6EE"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Listo
    </span>
  );
}
