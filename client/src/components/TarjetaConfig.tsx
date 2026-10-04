// Tarjeta plana de una sección de Configuración (PIN, backups, ajustes):
// título, una línea de ayuda opcional y el contenido.
import type { ReactNode } from "react";
import { TARJETA } from "../tema";

// Grupo plano de filas: marfil con borde de lino, estilo lista agrupada (como
// en el formulario de autos); los campos van adentro separados por líneas finas.
export const GRUPO =
  "overflow-hidden rounded-xl border border-linea bg-crema";

interface Props {
  titulo: string;
  ayuda?: string;
  children: ReactNode;
}

export function TarjetaConfig({ titulo, ayuda, children }: Props) {
  return (
    <section className={`flex flex-col p-5 sm:p-8 ${TARJETA}`}>
      <h3
        className={`text-[26px] leading-tight font-[650] tracking-[-0.04em] text-tinta sm:text-[30px] ${
          ayuda ? "" : "mb-4 sm:mb-5"
        }`}
      >
        {titulo}
      </h3>
      {ayuda && (
        <p className="mt-1 mb-4 text-lg text-tinta-suave sm:mb-5">{ayuda}</p>
      )}
      {children}
    </section>
  );
}
