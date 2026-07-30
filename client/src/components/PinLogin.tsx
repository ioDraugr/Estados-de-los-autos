// Pantalla de ingreso a /admin: teclado numérico grande (pensado para tablet).
// Valida el PIN contra el servidor; si es correcto lo guarda y avisa al padre.
import { useState } from "react";
import { login } from "../api";
import { guardarPin } from "../sesion";

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
    <div className="flex min-h-full flex-col items-center justify-center gap-8 bg-zinc-950 p-6 text-white">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
        Taller ML Center
      </h1>
      <p className="text-xl text-zinc-300 sm:text-2xl">Ingresá el PIN</p>

      {/* Puntitos que muestran cuántos dígitos van, sin revelar el PIN. */}
      <div className="flex h-8 items-center gap-3">
        {pin.length === 0 ? (
          <span className="text-lg text-zinc-500">— — — —</span>
        ) : (
          Array.from(pin).map((_, i) => (
            <span key={i} className="h-4 w-4 rounded-full bg-white sm:h-5 sm:w-5" />
          ))
        )}
      </div>

      {error && (
        <p className="text-xl font-bold text-red-400">PIN incorrecto</p>
      )}

      <div className="grid w-full max-w-xs grid-cols-3 gap-3 sm:gap-4">
        {teclas.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => agregar(t)}
            className="rounded-2xl bg-zinc-800 py-5 text-3xl font-bold text-white active:scale-95 sm:py-6 sm:text-4xl"
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={borrar}
          className="rounded-2xl bg-zinc-700 py-5 text-2xl font-bold text-white active:scale-95 sm:py-6 sm:text-3xl"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => agregar("0")}
          className="rounded-2xl bg-zinc-800 py-5 text-3xl font-bold text-white active:scale-95 sm:py-6 sm:text-4xl"
        >
          0
        </button>
        <button
          type="button"
          onClick={ingresar}
          disabled={verificando}
          className="rounded-2xl bg-green-600 py-5 text-2xl font-bold text-white active:scale-95 disabled:opacity-50 sm:py-6 sm:text-3xl"
        >
          {verificando ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}
