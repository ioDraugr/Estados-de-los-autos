// Pantalla de bienvenida del showroom (modo kiosko): un cartel a pantalla
// completa que invita a tocar. Al tocar en cualquier parte muestra la lista de
// autos (lo maneja Display con onTocar). Es puramente visual: los datos de
// /display siguen cargándose de fondo mientras se ve este cartel.
import { CabeceraCurva } from "./CabeceraCurva";
import { Flecha } from "./Flecha";

interface Props {
  onTocar: () => void;
}

export function Bienvenida({ onTocar }: Props) {
  return (
    <button
      type="button"
      onClick={onTocar}
      className="flex min-h-full w-full flex-col bg-crema text-left"
    >
      <CabeceraCurva alto="hero" conos>
        {/* "TALLER ML" entre dos líneas doradas, como en la referencia. */}
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="h-0.5 w-10 rounded-full bg-marca sm:w-16" />
          <p className="text-base font-bold tracking-[0.3em] text-marca uppercase sm:text-xl xl:text-2xl">
            Taller ML
          </p>
          <span className="h-0.5 w-10 rounded-full bg-marca sm:w-16" />
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl lg:text-8xl 2xl:text-9xl">
          ¿Cómo va tu auto?
        </h1>

        <p className="text-xl text-white/60 sm:text-3xl lg:text-4xl">
          Tocá para ver el estado
        </p>

        {/* Invitación a bajar/tocar, con un movimiento suave que llama la
            atención sin marear (se apaga si el sistema pide menos movimiento). */}
        <Flecha
          direccion="abajo"
          className="animate-flotar mt-2 h-10 w-10 text-marca sm:mt-4 sm:h-14 sm:w-14 lg:h-16 lg:w-16"
        />
      </CabeceraCurva>
    </button>
  );
}
