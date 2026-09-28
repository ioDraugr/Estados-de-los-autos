// Pantalla de ingreso a /admin y /taller: teclado numérico grande (pensado para
// tablet). Valida el PIN contra el servidor; si es correcto lo guarda y avisa al
// padre. Se ve sobre el fondo oscuro, con teclas circulares de vidrio y el OK
// en el oro de la marca.
import { useState } from "react";
import { login } from "../api";
import { guardarPin } from "../sesion";
import { BOTON_MARCA } from "../tema";
import { LogoML } from "./LogoML";

// Tecla circular de vidrio sobre el fondo oscuro. Al tocarla se ilumina y se
// hunde apenas.
const TECLA =
  "flex h-[76px] w-[76px] items-center justify-center rounded-full border border-crema/10 bg-crema/[0.09] text-[32px] font-normal text-crema shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl backdrop-saturate-[1.7] transition-[background-color,scale] duration-150 hover:bg-crema/[0.16] active:scale-[0.94] active:bg-crema/30 sm:h-[88px] sm:w-[88px] sm:text-4xl";

// Cuántos aros se ven como mínimo (el PIN puede tener hasta 8 dígitos).
const AROS_MINIMOS = 4;

interface Props {
  onIngresar: () => void;
}

export function PinLogin({ onIngresar }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  function agregar(digito: string) {
    if (verificando) return;
    setError(false);
    setPin((p) => (p.length < 8 ? p + digito : p));
  }

  function borrar() {
    setError(false);
    setPin((p) => p.slice(0, -1));
  }

  async function ingresar() {
    if (pin.length === 0 || verificando) return;
    setVerificando(true);
    setError(false);
    try {
      if (await login(pin)) {
        guardarPin(pin);
        onIngresar();
      } else {
        setError(true);
        setPin("");
      }
    } catch {
      setError(true);
      setPin("");
    } finally {
      setVerificando(false);
    }
  }

  // Un aro por dígito: los ya escritos se rellenan. Siempre se ven al menos
  // cuatro, aunque no se haya escrito nada.
  const aros = Math.max(AROS_MINIMOS, pin.length);

  return (
    <div className="flex min-h-full flex-col items-center justify-center fondo-oscuro px-6 py-8 text-crema">
      <LogoML className="h-12 w-auto sm:h-[50px]" />
      <p className="mt-6 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">
        Ingresá el PIN
      </p>

      {/* Puntitos que muestran cuántos dígitos van, sin revelar el PIN. */}
      <div className="mt-5 flex h-7 items-center gap-4 sm:gap-5">
        {Array.from({ length: aros }, (_, i) =>
          i < pin.length ? (
            <span
              key={i}
              className="animate-marcar h-3.5 w-3.5 rounded-full bg-crema shadow-[0_0_12px_rgba(243,236,223,0.5)]"
            />
          ) : (
            <span
              key={i}
              className="h-3.5 w-3.5 rounded-full border-[1.5px] border-crema/50"
            />
          ),
        )}
      </div>

      {/* Mismo lugar para el error: un rojo claro que se lee sobre el oscuro. */}
      {error && (
        <p className="mt-3 rounded-full bg-peligro/30 px-4 py-1.5 text-lg font-semibold text-[#F6B7A9] sm:text-xl">
          PIN incorrecto
        </p>
      )}

      <div className="mt-7 grid grid-cols-3 justify-items-center gap-x-5 gap-y-4 sm:mt-8 sm:gap-x-7 sm:gap-y-[18px]">
        {teclas.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => agregar(t)}
            className={TECLA}
          >
            {t}
          </button>
        ))}
        {/* Borrar: sin vidrio, para que no se confunda con un dígito. */}
        <button
          type="button"
          onClick={borrar}
          aria-label="Borrar"
          className="flex h-[76px] w-[76px] items-center justify-center rounded-full text-[28px] text-crema/75 transition-[background-color,color,scale] duration-150 hover:text-crema active:scale-[0.94] active:bg-crema/10 sm:h-[88px] sm:w-[88px] sm:text-[32px]"
        >
          ←
        </button>
        <button type="button" onClick={() => agregar("0")} className={TECLA}>
          0
        </button>
        <button
          type="button"
          onClick={ingresar}
          disabled={verificando}
          className={`${BOTON_MARCA} flex h-[76px] w-[76px] items-center justify-center text-[22px] tracking-[-0.01em] sm:h-[88px] sm:w-[88px]`}
        >
          {verificando ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}
