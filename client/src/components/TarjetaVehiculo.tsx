// Tarjeta de un auto en la grilla del showroom. Toda la tarjeta es táctil.
// Los tamaños escalan con la pantalla: cómodos en un celular en la mano,
// enormes en la pantalla del showroom que se mira de lejos.
// Es una tarjeta de vidrio oscuro: arriba la matrícula parcial y la flecha,
// abajo el nombre del auto y, separados por una línea fina, sus servicios.
import type { Vehiculo } from "../types";
import { COLOR_AREA_OSCURO, autoTerminado, ultimosDigitos } from "../dominio";
import { CAPSULA_MATRICULA, PASTILLA_LISTO_OSCURO } from "../tema";
import { ConoCirculo } from "./ConoCirculo";
import { Flecha } from "./Flecha";

// Tinte verde de un auto con todo terminado. Va con "!" para ganarle al fondo
// y al borde que pone vidrio-oscuro (el borde dorado del hover también va con
// "!" y, por ser más específico, le gana a este).
const TINTE_LISTO =
  "bg-[rgba(46,94,58,0.32)]! border-[rgba(141,190,150,0.45)]!";

interface Props {
  vehiculo: Vehiculo;
  onSeleccionar: (v: Vehiculo) => void;
}

export function TarjetaVehiculo({ vehiculo, onSeleccionar }: Props) {
  const terminado = autoTerminado(vehiculo);

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(vehiculo)}
      className={`group animate-aparecer flex flex-col rounded-[28px] p-5 text-left text-crema vidrio-oscuro transition-[translate,scale,border-color,background-color] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1.5 hover:scale-[1.012] hover:border-marca-suave/45! active:scale-[0.98] sm:p-6 ${
        terminado ? TINTE_LISTO : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Nunca la matrícula entera: solo los últimos dígitos. */}
        <span
          className={`${CAPSULA_MATRICULA} h-[34px] px-3.5 text-base sm:text-lg 2xl:h-10 2xl:text-xl`}
        >
          <span aria-hidden="true" className="tracking-[0.12em] text-crema/45">
            ••••
          </span>
          {ultimosDigitos(vehiculo.matricula)}
        </span>

        {/* Botón redondo de "ver más": es la pista visual de que la tarjeta se
            toca. Decorativo, porque quien recibe el toque es la tarjeta entera.
            Con el mouse encima se vuelve dorado y se corre apenas. */}
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crema/10 text-crema transition-[background-color,color,translate] duration-300 group-hover:translate-x-[3px] group-hover:bg-marca group-hover:text-tinta 2xl:h-12 2xl:w-12"
        >
          <Flecha direccion="derecha" className="h-4 w-4 2xl:h-5 2xl:w-5" />
        </span>
      </div>

      {/* mt-auto: en una fila de la grilla, los nombres quedan alineados abajo
          aunque las tarjetas tengan distinto contenido.
          min-w-0 + break-words: un modelo largo corta en vez de desbordar. */}
      <div className="mt-auto min-w-0 pt-8 sm:pt-10">
        <p className="text-2xl leading-[1.08] font-semibold tracking-[-0.035em] break-words sm:text-3xl 2xl:text-4xl">
          {vehiculo.marca} {vehiculo.modelo}
        </p>
        <p className="mt-1 text-lg text-crema/60 sm:text-xl 2xl:text-2xl">
          {vehiculo.color}
        </p>
      </div>

      {/* flex-wrap: con 3 servicios y la tarjeta angosta, los conos bajan de fila. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-crema/10 pt-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {vehiculo.servicios.map((s) => (
            <ConoCirculo
              key={s.id}
              color={COLOR_AREA_OSCURO[s.tipo]}
              estado={s.estado}
              tamano="tarjeta"
            />
          ))}
        </div>
        {terminado && (
          <span
            className={`${PASTILLA_LISTO_OSCURO} px-3.5 py-1.5 text-base sm:px-4 sm:text-lg 2xl:text-xl`}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#CFE6D3]" />
            Listo
          </span>
        )}
      </div>
    </button>
  );
}
