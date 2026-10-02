// Frase rotativa de la bienvenida (las que se editan en /admin → Configuración):
// muestra una a la vez, en oro claro, y cada tanto pasa a la siguiente con un
// fundido suave. Sin frases no muestra nada (ni deja un hueco); con una sola,
// la deja quieta.
import { useEffect, useState } from "react";

// Cada cuánto cambia la frase, y cuánto dura el fundido de salida (tiene que
// coincidir con el duration-[900ms] de la clase de abajo).
const MS_FRASE = 7_000;
const MS_FUNDIDO = 900;

interface Props {
  frases: string[];
}

export function FraseRotativa({ frases }: Props) {
  // Cuántas veces avanzó; la frase es indice % cantidad, así si la lista cambia
  // (se agregó o quitó una frase) nunca queda apuntando fuera de rango.
  const [indice, setIndice] = useState(0);
  // false mientras la frase se está apagando, antes de cambiarla.
  const [visible, setVisible] = useState(true);
  const cantidad = frases.length;

  useEffect(() => {
    if (cantidad < 2) return;

    let fundido: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      // Con "reducir movimiento" la regla global ya apaga la transición: ahí
      // la frase cambia de golpe, sin quedar ~1 s en blanco esperando el
      // fundido. Se consulta en cada vuelta por si cambia la preferencia.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setIndice((i) => i + 1);
        return;
      }
      // Se apaga, y recién apagada cambia el texto y vuelve a aparecer. Con
      // timers (no transitionend), así no depende de que la transición corra.
      setVisible(false);
      fundido = setTimeout(() => {
        setIndice((i) => i + 1);
        setVisible(true);
      }, MS_FUNDIDO);
    }, MS_FRASE);

    return () => {
      clearInterval(id);
      clearTimeout(fundido);
      setVisible(true);
    };
  }, [cantidad]);

  if (cantidad === 0) return null;

  return (
    // El contenedor entra subiendo como los demás textos; el fundido va en el
    // span de adentro (si fuera en el mismo elemento, la animación de entrada
    // le pisaría la opacidad).
    <p
      className="animate-subir mt-2 max-w-[90vw] text-lg tracking-[-0.01em] text-balance text-marca-suave/85 sm:mt-3 sm:text-xl lg:text-[22px] 2xl:text-2xl bajo:hidden"
      style={{ animationDelay: "0.55s" }}
    >
      <span
        className={`inline-block transition-[opacity,translate] duration-[900ms] ease-in-out ${
          visible ? "opacity-100" : "translate-y-1.5 opacity-0"
        }`}
      >
        {frases[indice % cantidad]}
      </span>
    </p>
  );
}
