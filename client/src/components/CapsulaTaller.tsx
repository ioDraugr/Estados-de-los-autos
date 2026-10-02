// Cápsula de vidrio oscuro de la bienvenida con el taller "en vivo": cuántos
// autos hay, cuántos están listos para retirar y, por cono, cuántos trabajos
// quedan sin terminar en cada área. Sale de la misma lista que ya carga
// /display (Socket.IO + poll), así que se actualiza sola.
import type { Vehiculo } from "../types";
import { AREAS, COLOR_AREA_OSCURO, NOMBRE_AREA, autoTerminado } from "../dominio";
import { Cono } from "./Cono";

interface Props {
  vehiculos: Vehiculo[];
}

// Separador vertical entre los datos. En el celular la cápsula se parte en
// dos filas y la rayita sobra: solo va de tablet para arriba.
function Separador() {
  return (
    <span
      aria-hidden="true"
      className="hidden w-px self-stretch bg-crema/20 sm:block"
    />
  );
}

// Número grande (se lee de lejos) seguido de su texto.
const NUMERO =
  "mr-1.5 text-2xl font-bold tracking-[-0.03em] sm:text-3xl lg:text-[34px] 2xl:text-5xl bajo:text-2xl";

export function CapsulaTaller({ vehiculos }: Props) {
  const total = vehiculos.length;
  const listos = vehiculos.filter(autoTerminado).length;

  // Servicios que todavía no terminaron, por área (esperando + en proceso).
  const pendientes = AREAS.map((tipo) => ({
    tipo,
    cantidad: vehiculos.reduce(
      (suma, v) =>
        suma +
        v.servicios.filter((s) => s.tipo === tipo && s.estado !== "terminado")
          .length,
      0,
    ),
  }));

  const base =
    "flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-[28px] px-5 py-3 text-base text-crema/80 vidrio-oscuro sm:flex-nowrap sm:gap-x-6 sm:rounded-full sm:px-7 sm:text-lg lg:gap-x-7 lg:px-8 lg:py-3.5 lg:text-2xl 2xl:gap-x-9 2xl:px-11 2xl:py-5 2xl:text-3xl bajo:py-2 bajo:text-base";

  // Sin autos: un aviso tranquilo en vez de una fila de ceros.
  if (total === 0) {
    return <div className={base}>Taller sin autos por ahora</div>;
  }

  return (
    <div className={base}>
      <span>
        <b className={`${NUMERO} text-crema-alta`}>{total}</b>
        {total === 1 ? "auto en el taller" : "autos en el taller"}
      </span>

      <Separador />

      <span>
        <b className={`${NUMERO} text-listo-claro`}>{listos}</b>
        {listos === 1 ? "listo para retirar" : "listos para retirar"}
      </span>

      <Separador />

      {/* Un cono por área (sin atenuar) con lo que falta hacer en esa área.
          El nombre del área queda para los lectores de pantalla: a la vista
          ya está la referencia de conos de la barra de arriba. */}
      <span className="flex items-center gap-4 sm:gap-5 2xl:gap-7">
        {pendientes.map(({ tipo, cantidad }) => (
          <span
            key={tipo}
            className="flex items-center gap-1.5 text-2xl font-bold text-crema-alta sm:text-[26px] lg:text-[28px] 2xl:text-4xl bajo:text-xl"
          >
            <Cono
              color={COLOR_AREA_OSCURO[tipo]}
              estado="en_proceso"
              className="h-6 w-auto shrink-0 sm:h-7 lg:h-8 2xl:h-11 bajo:h-6"
            />
            <span className="sr-only">{NOMBRE_AREA[tipo]}:</span>
            {cantidad}
          </span>
        ))}
      </span>
    </div>
  );
}
