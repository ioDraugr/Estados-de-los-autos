// Pantalla de ingreso a /admin y /taller: teclado numérico grande (pensado para
// tablet). Valida el PIN contra el servidor; si es correcto lo guarda y avisa al
// padre. Se ve sobre el fondo oscuro, con teclas circulares de vidrio y el OK
// en el oro de la marca.
// Si el server bloqueó el dispositivo por demasiados PIN mal, el teclado se
// apaga y el aviso cuenta los minutos que faltan; al terminar, vuelve solo.
import { useEffect, useState } from "react";
import { login } from "../api";
import { guardarPin } from "../sesion";
import { BOTON_MARCA } from "../tema";
import { LogoML } from "./LogoML";

// Medida de las teclas redondas: 76 px en el celular, 88 px de tablet para
// arriba y 64 px en pantallas bajas (celular acostado), donde el teclado va al
// costado del título y tiene que entrar entero en el alto.
const MEDIDA_TECLA =
  "h-[76px] w-[76px] sm:h-[88px] sm:w-[88px] bajo:h-16 bajo:w-16";

// Tecla circular de vidrio sobre el fondo oscuro. Al tocarla se ilumina y se
// hunde apenas.
const TECLA = `flex ${MEDIDA_TECLA} items-center justify-center rounded-full border border-crema/10 bg-crema/[0.09] text-[32px] font-normal text-crema shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl backdrop-saturate-[1.7] transition-[background-color,scale] duration-150 hover:bg-crema/[0.16] active:scale-[0.94] active:bg-crema/30 disabled:opacity-40 sm:text-4xl bajo:text-[28px]`;

// Cuántos aros se ven como mínimo (el PIN puede tener hasta 8 dígitos).
const AROS_MINIMOS = 4;

interface Props {
  onIngresar: () => void;
}

export function PinLogin({ onIngresar }: Props) {
  const [pin, setPin] = useState("");
  // Mensaje a mostrar debajo de los puntitos (null = sin error).
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  // Bloqueado por demasiados intentos: hasta cuándo (ms) y la hora de la última
  // cuenta, que se refresca cada segundo mientras dura.
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (bloqueadoHasta === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      if (t >= bloqueadoHasta) {
        setBloqueadoHasta(null);
        setError(null);
      } else {
        setAhora(t);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [bloqueadoHasta]);

  const bloqueado = bloqueadoHasta !== null;
  const aviso = bloqueado
    ? `Demasiados intentos. Probá de nuevo en ${Math.max(1, Math.ceil((bloqueadoHasta - ahora) / 60_000))} min.`
    : error;

  const teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  function agregar(digito: string) {
    if (verificando || bloqueado) return;
    setError(null);
    setPin((p) => (p.length < 8 ? p + digito : p));
  }

  function borrar() {
    setError(null);
    setPin((p) => p.slice(0, -1));
  }

  async function ingresar() {
    if (pin.length === 0 || verificando || bloqueado) return;
    setVerificando(true);
    setError(null);
    try {
      const resultado = await login(pin);
      if (resultado.ok) {
        guardarPin(pin);
        onIngresar();
      } else {
        // PIN mal ("PIN incorrecto") o bloqueado por demasiados intentos (el
        // server dice cuánto falta; si no lo dice, queda su mensaje tal cual).
        setError(resultado.mensaje);
        setPin("");
        if (resultado.bloqueado && resultado.minutosRestantes !== null) {
          const t = Date.now();
          setAhora(t);
          setBloqueadoHasta(t + resultado.minutosRestantes * 60_000);
        }
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
      setPin("");
    } finally {
      setVerificando(false);
    }
  }

  // Un aro por dígito: los ya escritos se rellenan. Siempre se ven al menos
  // cuatro, aunque no se haya escrito nada.
  const aros = Math.max(AROS_MINIMOS, pin.length);

  return (
    // En pantallas bajas (celular acostado) el título y los puntitos van a la
    // izquierda y el teclado a la derecha, para que todo entre sin scroll.
    <div className="flex min-h-full flex-col items-center justify-center fondo-oscuro px-6 py-8 text-crema bajo:flex-row bajo:gap-14 bajo:py-4">
      <div className="flex flex-col items-center">
        <LogoML className="h-12 w-auto sm:h-[50px]" />
        <p className="mt-6 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px] bajo:mt-4">
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
        {aviso && (
          <p className="mt-3 max-w-md rounded-3xl bg-peligro/30 px-4 py-1.5 text-center text-lg font-semibold text-[#F6B7A9] sm:text-xl">
            {aviso}
          </p>
        )}
      </div>

      <div className="mt-7 grid grid-cols-3 justify-items-center gap-x-5 gap-y-4 sm:mt-8 sm:gap-x-7 sm:gap-y-[18px] bajo:mt-0 bajo:gap-x-5 bajo:gap-y-3">
        {teclas.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => agregar(t)}
            disabled={bloqueado}
            className={TECLA}
          >
            {t}
          </button>
        ))}
        {/* Borrar: sin vidrio, para que no se confunda con un dígito. */}
        <button
          type="button"
          onClick={borrar}
          disabled={bloqueado}
          aria-label="Borrar"
          className={`flex ${MEDIDA_TECLA} items-center justify-center rounded-full text-[28px] text-crema/75 transition-[background-color,color,scale] duration-150 hover:text-crema active:scale-[0.94] active:bg-crema/10 disabled:opacity-40 sm:text-[32px] bajo:text-[26px]`}
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => agregar("0")}
          disabled={bloqueado}
          className={TECLA}
        >
          0
        </button>
        <button
          type="button"
          onClick={ingresar}
          disabled={verificando || bloqueado}
          className={`${BOTON_MARCA} flex ${MEDIDA_TECLA} items-center justify-center text-[22px] tracking-[-0.01em] bajo:text-xl`}
        >
          {verificando ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}
