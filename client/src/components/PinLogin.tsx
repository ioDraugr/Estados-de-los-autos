// Pantalla de ingreso a /admin: teclado numérico grande (pensado para tablet).
// Valida el PIN contra el servidor; si es correcto lo guarda y avisa al padre.
import { useState } from "react";
import { login } from "../api";
import { guardarPin } from "../sesion";
import { BOTON_MARCA, BOTON_SUAVE } from "../tema";
import { LogoML } from "./LogoML";

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

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 fondo-claro p-6 sm:gap-8">
      <LogoML className="h-16 w-auto sm:h-20" />
      <p className="text-xl text-tinta-suave sm:text-2xl">Ingresá el PIN</p>

      {/* Puntitos que muestran cuántos dígitos van, sin revelar el PIN. */}
      <div className="flex h-8 items-center gap-3">
        {pin.length === 0 ? (
          <span className="text-lg text-tinta/30">— — — —</span>
        ) : (
          Array.from(pin).map((_, i) => (
            <span
              key={i}
              className="h-4 w-4 rounded-full bg-tinta sm:h-5 sm:w-5"
            />
          ))
        )}
      </div>

      {error && (
        <p className="text-xl font-bold text-red-700">PIN incorrecto</p>
      )}

      <div className="grid w-full max-w-xs grid-cols-3 gap-3 sm:gap-4">
        {teclas.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => agregar(t)}
            className={`${BOTON_SUAVE} py-5 text-3xl sm:py-6 sm:text-4xl`}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={borrar}
          className={`${BOTON_SUAVE} py-5 text-2xl sm:py-6 sm:text-3xl`}
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => agregar("0")}
          className={`${BOTON_SUAVE} py-5 text-3xl sm:py-6 sm:text-4xl`}
        >
          0
        </button>
        <button
          type="button"
          onClick={ingresar}
          disabled={verificando}
          className={`${BOTON_MARCA} py-5 text-2xl sm:py-6 sm:text-3xl`}
        >
          {verificando ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}
