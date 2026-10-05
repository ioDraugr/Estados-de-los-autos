// Panel blanco de /reportes con la estética de consola: borde fino, esquinas
// de 2px, encabezado con título y ayuda, separador y cuerpo con aire.
import type { ReactNode } from "react";

interface Props {
  titulo: string;
  ayuda?: string;
  children: ReactNode;
}

export function PanelReporte({ titulo, ayuda, children }: Props) {
  return (
    <section className="rounded-sm border border-con-borde bg-con-sup">
      <header className="border-b border-con-borde px-5 py-4 sm:px-6">
        <h3 className="text-lg font-medium tracking-[-0.01em] text-con-texto">
          {titulo}
        </h3>
        {ayuda && <p className="mt-0.5 text-sm text-con-suave">{ayuda}</p>}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
