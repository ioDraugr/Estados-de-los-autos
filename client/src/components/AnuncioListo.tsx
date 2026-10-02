// Anuncio dorado de la bienvenida: "Marca Modelo ••1234 está listo para
// retirar". Ocupa el lugar de la cápsula del taller mientras dura (ver
// useAnunciosListo). Cápsula de vidrio dorado con el tilde verde de "listo",
// un resplandor alrededor y una barrita abajo que se va achicando con el
// tiempo que le queda. La duración la maneja el timer de la cola, no la
// barrita: con "reducir movimiento" la barrita no se muestra y el anuncio
// dura lo mismo.
import type { Vehiculo } from "../types";
import { ultimosDigitos } from "../dominio";
import { MS_ANUNCIO } from "../useAnunciosListo";

interface Props {
  vehiculo: Vehiculo;
}

export function AnuncioListo({ vehiculo }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="vidrio-oro animate-anuncio relative flex max-w-[92vw] items-center gap-3 overflow-hidden rounded-[28px] py-3 pr-6 pl-3 text-left text-tinta sm:gap-5 sm:rounded-full sm:py-3.5 sm:pr-9 sm:pl-4 lg:max-w-[min(1200px,88vw)] lg:gap-6 lg:py-4 lg:pr-11 lg:pl-5 2xl:gap-7 2xl:py-5 2xl:pr-14 2xl:pl-6 bajo:gap-3 bajo:py-2 bajo:pr-6 bajo:pl-2.5"
    >
      {/* El tilde verde, como el de la pastilla "Listo". */}
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-listo shadow-[0_8px_20px_-8px_rgba(46,94,58,0.9)] sm:size-13 lg:size-15 2xl:size-20 bajo:size-10"
      >
        <svg viewBox="0 0 24 24" className="size-[55%]">
          <path
            d="M5 12.5 L10 17 L19 7"
            fill="none"
            stroke="#FAF6EE"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Solo marca, modelo y los últimos dígitos: NUNCA la matrícula entera.
          Una marca o modelo muy largo parte en renglones (break-words) en vez
          de desbordar la cápsula. */}
      <span className="min-w-0">
        <span className="block text-xl leading-tight font-[650] tracking-[-0.03em] break-words text-balance sm:text-2xl lg:text-[32px] 2xl:text-[44px] bajo:text-lg">
          {vehiculo.marca} {vehiculo.modelo}{" "}
          <span className="whitespace-nowrap">
            ••{ultimosDigitos(vehiculo.matricula)}
          </span>{" "}
          está listo para retirar
        </span>
        <span className="mt-0.5 block text-base font-medium tracking-[-0.01em] text-tinta/75 sm:text-lg lg:mt-1 lg:text-xl 2xl:text-[28px] bajo:mt-0 bajo:text-sm">
          ¡Ya podés pasar a retirarlo!
        </span>
      </span>

      {/* Barrita del tiempo que queda. Se oculta con "reducir movimiento"
          (ver .anuncio-tiempo en index.css). */}
      <span
        aria-hidden="true"
        className="anuncio-tiempo absolute inset-x-0 bottom-0 h-1 bg-tinta/35 2xl:h-1.5"
        style={{ animationDuration: `${MS_ANUNCIO}ms` }}
      />
    </div>
  );
}
