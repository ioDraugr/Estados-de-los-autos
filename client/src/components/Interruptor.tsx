// Interruptor (solo el dibujo): pista verde con la perilla a la derecha cuando
// está prendido, pista clara con borde y perilla a la izquierda si no. Sin
// curvas elásticas ni sombras. Va adentro de un <button role="switch"> que
// ocupa toda la fila, así el toque no tiene que acertarle a la perilla.
// Con `conTexto` suma "Activado" / "Desactivado" al lado: el estado no depende
// solo del color.
interface Props {
  prendido: boolean;
  conTexto?: boolean;
}

export function Interruptor({ prendido, conTexto = false }: Props) {
  const pista = (
    <span
      aria-hidden="true"
      className={`relative h-8 w-14 shrink-0 rounded-full border-2 ${
        prendido ? "border-listo bg-listo" : "border-tinta-suave bg-crema"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full ${
          prendido ? "translate-x-6 bg-crema-alta" : "bg-tinta-suave"
        }`}
      />
    </span>
  );
  if (!conTexto) return pista;
  return (
    <span className="inline-flex shrink-0 items-center gap-3">
      <span
        className={`min-w-[6.5rem] text-right text-base font-semibold ${
          prendido ? "text-listo" : "text-tinta-suave"
        }`}
      >
        {prendido ? "Activado" : "Desactivado"}
      </span>
      {pista}
    </span>
  );
}
