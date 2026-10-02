// Pantalla de bienvenida del showroom (modo kiosko): un cartel a pantalla
// completa que invita a tocar. Al tocar en cualquier parte muestra la lista de
// autos (lo maneja Display con onTocar). Los datos de /display siguen
// cargándose de fondo mientras se ve este cartel, y de ahí salen la frase
// rotativa y la cápsula con el taller en vivo.
import type { ReactNode } from "react";
import type { Vehiculo } from "../types";
import { CabeceraCurva } from "./CabeceraCurva";
import { CapsulaTaller } from "./CapsulaTaller";
import { EmblemaML } from "./EmblemaML";
import { FraseRotativa } from "./FraseRotativa";

interface Props {
  onTocar: () => void;
  // La lista de /display; null mientras todavía no llegó (ahí no hay cápsula,
  // para no mostrar "sin autos" antes de saberlo).
  vehiculos: Vehiculo[] | null;
  // Frases de Configuración; vacía = no se muestra ninguna.
  frases: string[];
  // Aviso que, mientras venga, ocupa el lugar de la cápsula sobre el
  // horizonte (ej. "tal auto está listo para retirar").
  anuncio?: ReactNode;
}

export function Bienvenida({ onTocar, vehiculos, frases, anuncio }: Props) {
  // Lo que va apoyado sobre el horizonte: el anuncio si hay uno, si no la
  // cápsula con los números del taller.
  const pie =
    anuncio ?? (vehiculos ? <CapsulaTaller vehiculos={vehiculos} /> : null);

  return (
    <button
      type="button"
      onClick={onTocar}
      className="flex min-h-full w-full flex-col bg-tinta text-left"
    >
      <CabeceraCurva alto="hero" conos pie={pie}>
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
          className="animate-subir mt-1 pb-[0.06em] text-5xl leading-[1.02] font-[650] tracking-[-0.055em] text-balance texto-degrade sm:mt-2 sm:text-7xl lg:text-8xl xl:text-9xl bajo:mt-1 bajo:text-5xl"
          style={{ animationDelay: "0.25s" }}
        >
          ¿Cómo va tu auto?
        </h1>

        <p
          className="animate-subir mt-2 text-xl tracking-[-0.015em] text-crema/60 sm:mt-3 sm:text-2xl lg:text-[28px] 2xl:text-3xl bajo:mt-1 bajo:text-xl"
          style={{ animationDelay: "0.4s" }}
        >
          Tocá para ver el estado
        </p>

        {/* Debajo de la invitación, una frase que va cambiando (reemplaza a
            la flecha que subía y bajaba). */}
        <FraseRotativa frases={frases} />
      </CabeceraCurva>
    </button>
  );
}
