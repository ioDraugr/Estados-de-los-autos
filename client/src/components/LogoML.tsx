// Logo de la marca: rombo amarillo con "ML" en negro.
// El tamaño va por className (ej. "h-12 w-auto"), igual que Cono, para que
// pueda achicarse en el celular y agrandarse en la pantalla del showroom.
interface Props {
  className?: string;
}

export function LogoML({ className = "h-14 w-auto" }: Props) {
  return (
    <svg
      viewBox="0 0 140 88"
      className={className}
      role="img"
      aria-label="Taller ML Center"
    >
      {/* Rombo, con un borde apenas más oscuro que le da relieve. */}
      <path
        d="M70 3 L136 44 L70 85 L4 44 Z"
        fill="var(--color-marca)"
        stroke="#d9a91d"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x="70"
        y="44"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--color-tinta)"
        fontSize="40"
        fontWeight="900"
        letterSpacing="-1"
      >
        ML
      </text>
    </svg>
  );
}
