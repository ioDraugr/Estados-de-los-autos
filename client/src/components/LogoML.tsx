// Logo de la marca: rombo dorado con "ML" en carbón. El texto hereda la
// tipografía del body (Geist), en peso 800 y apretado.
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
      {/* Rombo liso, sin borde: el relieve lo dan el vidrio y la luz de
          alrededor. */}
      <path d="M70 3 L136 44 L70 85 L4 44 Z" fill="var(--color-marca)" />
      <text
        x="70"
        y="44"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--color-tinta)"
        fontSize="46"
        fontWeight="800"
        letterSpacing="-2"
      >
        ML
      </text>
    </svg>
  );
}
