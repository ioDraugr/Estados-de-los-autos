// Título de sección con, opcional, una línea de ayuda debajo. Lo usan las
// tres vistas, en dos tonos:
//   tono="claro"  (por defecto) → sobre el fondo claro (/taller, /admin):
//                                 título grande y apretado en tinta, ayuda en
//                                 tinta suave.
//   tono="oscuro"               → sobre el fondo oscuro del showroom: título
//                                 grande con el degradé de luz, sin barrita.
interface Props {
  titulo: string;
  ayuda?: string;
  tono?: "claro" | "oscuro";
}

export function TituloSeccion({ titulo, ayuda, tono = "claro" }: Props) {
  if (tono === "oscuro") {
    return (
      <div>
        {/* El pb evita que el degradé recorte la parte baja de las letras. */}
        <h2 className="pb-[0.06em] text-4xl leading-[1.05] font-[650] tracking-[-0.05em] texto-degrade sm:text-5xl xl:text-6xl">
          {titulo}
        </h2>
        {ayuda && (
          <p className="mt-1.5 text-lg tracking-[-0.01em] text-crema/60 sm:text-xl xl:text-2xl">
            {ayuda}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-4xl leading-[1.02] font-[650] tracking-[-0.055em] text-tinta sm:text-5xl xl:text-6xl">
        {titulo}
      </h2>
      {ayuda && (
        <p className="mt-2 text-lg tracking-[-0.01em] text-tinta-suave sm:text-xl xl:text-[22px]">
          {ayuda}
        </p>
      )}
    </div>
  );
}
