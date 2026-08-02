// Flecha (chevron) de la marca. "abajo" invita a bajar/tocar en la bienvenida;
// "derecha" es el botón redondo de "ver más" de las tarjetas.
// El tamaño y el color van por className, igual que Cono y LogoML.
interface Props {
  direccion: "abajo" | "derecha";
  className?: string;
}

export function Flecha({ direccion, className = "h-8 w-8" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={direccion === "abajo" ? "M5 9 L12 16 L19 9" : "M9 5 L16 12 L9 19"} />
    </svg>
  );
}
