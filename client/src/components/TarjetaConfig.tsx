// Piezas de Configuración (y de Reportes): la tarjeta plana de una sección, el
// grupo de filas y la fila "título + ayuda a la izquierda, control a la derecha".
import type { ReactNode } from "react";
import { TARJETA } from "../tema";

// Grupo plano de filas: borde fino de lino, estilo lista agrupada (como en el
// formulario de autos); los campos van adentro separados por líneas finas.
export const GRUPO =
  "overflow-hidden rounded-xl border border-linea bg-crema divide-y divide-linea";

// Contenedor único de las filas de una categoría de Configuración: papel con
// borde fino y divisores finos entre filas.
export const CONTENEDOR_FILAS =
  "overflow-hidden rounded-xl border border-linea bg-crema-alta divide-y divide-linea";

// Campo de texto de las filas: borde de contraste suficiente (>= 3:1) para que
// se vea dónde escribir, y foco visible en carbón.
export const CAMPO_TEXTO =
  "w-full min-w-0 rounded-lg border border-tinta-suave bg-crema px-4 text-lg text-tinta caret-tinta placeholder:text-tinta-suave focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:opacity-60";

interface FilaProps {
  titulo: string;
  ayuda?: ReactNode;
  // Controles cortos (valor, "+/−", botón): van a la derecha y, si no entran,
  // bajan debajo del texto.
  control?: ReactNode;
  // Si el título es la etiqueta de un campo de abajo: id de ese campo.
  paraCampo?: string;
  // Contenido ancho debajo del título (campos de texto, listas, avisos).
  children?: ReactNode;
}

export function Fila({ titulo, ayuda, control, paraCampo, children }: FilaProps) {
  const claseTitulo = "block text-lg font-semibold text-tinta";
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-[12rem] flex-1">
          {paraCampo ? (
            <label htmlFor={paraCampo} className={claseTitulo}>
              {titulo}
            </label>
          ) : (
            <p className={claseTitulo}>{titulo}</p>
          )}
          {ayuda && <p className="mt-1 text-base text-tinta-suave">{ayuda}</p>}
        </div>
        {control && <div className="flex shrink-0 flex-wrap items-center gap-3">{control}</div>}
      </div>
      {children}
    </div>
  );
}

interface Props {
  titulo: string;
  ayuda?: string;
  children: ReactNode;
}

export function TarjetaConfig({ titulo, ayuda, children }: Props) {
  return (
    <section className={`flex flex-col p-5 sm:p-6 ${TARJETA}`}>
      <h3
        className={`text-xl leading-tight font-semibold tracking-[-0.01em] text-tinta sm:text-2xl ${
          ayuda ? "" : "mb-4 sm:mb-5"
        }`}
      >
        {titulo}
      </h3>
      {ayuda && (
        <p className="mt-1 mb-4 text-base text-tinta-suave sm:mb-5 sm:text-lg">{ayuda}</p>
      )}
      {children}
    </section>
  );
}
