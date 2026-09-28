// Pantalla de bienvenida del showroom (modo kiosko): un cartel a pantalla
// completa que invita a tocar. Al tocar en cualquier parte muestra la lista de
// autos (lo maneja Display con onTocar). Es puramente visual: los datos de
// /display siguen cargándose de fondo mientras se ve este cartel.
import { CabeceraCurva } from "./CabeceraCurva";
import { EmblemaML } from "./EmblemaML";
import { Flecha } from "./Flecha";

interface Props {
  onTocar: () => void;
}

export function Bienvenida({ onTocar }: Props) {
  return (
    <button
      type="button"
      onClick={onTocar}
      className="flex min-h-full w-full flex-col bg-tinta text-left"
    >
      <CabeceraCurva alto="hero" conos>
        <EmblemaML />

        {/* Los textos entran subiendo, escalonados, después del emblema. */}
        <p
          className="animate-subir text-lg font-semibold tracking-[-0.01em] text-marca sm:text-xl lg:text-[22px] 2xl:text-2xl"
          style={{ animationDelay: "0.1s" }}
        >
          Taller ML
        </p>

        {/* Degradé de marfil a lino y tracking muy apretado, como la maqueta.
            El pb evita que el degradé recorte la cola de los signos. */}
        <h1
          className="animate-subir mt-1 pb-[0.06em] text-5xl leading-[1.02] font-[650] tracking-[-0.055em] text-balance texto-degrade sm:mt-2 sm:text-7xl lg:text-8xl xl:text-9xl"
          style={{ animationDelay: "0.25s" }}
        >
          ¿Cómo va tu auto?
        </h1>

        <p
          className="animate-subir mt-2 text-xl tracking-[-0.015em] text-crema/60 sm:mt-3 sm:text-2xl lg:text-[28px] 2xl:text-3xl"
          style={{ animationDelay: "0.4s" }}
        >
          Tocá para ver el estado
        </p>

        {/* Invitación a tocar: la flecha dentro de un círculo de vidrio que
            baja y sube suave (se queda quieto si el sistema pide menos
            movimiento). */}
        <span className="animate-bajar mt-5 flex h-14 w-14 items-center justify-center rounded-full vidrio-oscuro sm:mt-8 sm:h-[72px] sm:w-[72px]">
          <Flecha
            direccion="abajo"
            className="h-6 w-6 text-marca-suave sm:h-7 sm:w-7"
          />
        </span>
      </CabeceraCurva>
    </button>
  );
}
