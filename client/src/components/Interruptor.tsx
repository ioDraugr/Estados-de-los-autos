// Interruptor estilo iOS (solo el dibujo): pista verde con la perilla a la
// derecha cuando está prendido. Va adentro de un <button role="switch"> que
// ocupa toda la fila, así el toque no tiene que acertarle a la perilla.
export function Interruptor({ prendido }: { prendido: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative h-[34px] w-[58px] shrink-0 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        prendido ? "bg-listo-vivo" : "bg-tinta/[0.14]"
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] h-7 w-7 rounded-full bg-white shadow-[0_3px_8px_rgba(22,19,15,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.3,1.3,0.5,1)] ${
          prendido ? "translate-x-6" : ""
        }`}
      />
    </span>
  );
}
