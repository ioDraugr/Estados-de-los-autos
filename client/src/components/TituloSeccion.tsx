// Título de sección del fondo crema: la barrita amarilla de la marca a la
// izquierda y, opcional, una línea de ayuda debajo. Lo usan las tres vistas.
interface Props {
  titulo: string;
  ayuda?: string;
}

export function TituloSeccion({ titulo, ayuda }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-7 w-1.5 shrink-0 rounded-full bg-marca sm:h-9 sm:w-2" />
        <h2 className="text-2xl font-black tracking-tight text-tinta sm:text-3xl xl:text-4xl">
          {titulo}
        </h2>
      </div>
      {ayuda && (
        <p className="mt-1 text-base text-tinta-suave sm:text-xl xl:text-2xl">
          {ayuda}
        </p>
      )}
    </div>
  );
}
