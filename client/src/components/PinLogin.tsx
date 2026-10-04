// Pantalla de ingreso a /admin y /taller: teclado numérico grande (pensado para
// tablet). Valida el PIN contra el servidor; si es correcto lo guarda y avisa al
// padre. Se ve sobre carbón liso, con teclas planas de esquinas chicas y el OK
// en el oro de la marca (sin vidrio, brillos ni animaciones).
// Si el server bloqueó el dispositivo por demasiados PIN mal, el teclado se
// apaga y el aviso cuenta los minutos que faltan; al terminar, vuelve solo.
// /reportes lo reusa con otro título, otra verificación (el PIN del dueño, o
// los pasos de crearlo) y otro lugar donde guardar el PIN: ver los props.
import { useEffect, useState, type ReactNode } from "react";
import { login, type ResultadoLogin } from "../api";
import { guardarPin } from "../sesion";
import { BOTON_MARCA } from "../tema";
import { LogoML } from "./LogoML";

// Medida de las teclas: 72 px en el celular, 80 px de tablet para arriba y
// 60 px en pantallas bajas (celular acostado), donde el teclado va al costado
// del título y tiene que entrar entero en el alto. Siempre >= 56 px.
const MEDIDA_TECLA =
  "h-[72px] w-[72px] sm:h-20 sm:w-20 bajo:h-[60px] bajo:w-[60px]";

// Foco visible: anillo en marfil con separación, se lee sobre el carbón.
const FOCO =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-crema";

// Tecla plana: superficie sólida con borde fino. Al tocarla se aclara.
const TECLA = `flex ${MEDIDA_TECLA} items-center justify-center rounded-xl border border-crema/25 bg-crema/10 text-3xl font-medium text-crema transition-colors hover:bg-crema/20 active:bg-crema/30 disabled:opacity-40 bajo:text-2xl ${FOCO}`;

// Cuántos aros se ven como mínimo (el PIN puede tener hasta 8 dígitos).
const AROS_MINIMOS = 4;

interface Props {
  // El PIN pasó la verificación (y ya se guardó). Recibe el PIN.
  onIngresar: (pin: string) => void;
  // Lo de abajo es opcional: sin nada, es el ingreso a /admin y /taller.
  titulo?: string;
  // Una línea más chica debajo del título (ej. qué PIN se pide).
  ayuda?: string;
  // Contra qué se valida el PIN (por defecto, el PIN de /admin).
  verificar?: (pin: string) => Promise<ResultadoLogin>;
  // Dónde se guarda el PIN si es correcto (por defecto, la sesión de /admin).
  guardar?: (pin: string) => void;
  // Debajo del aviso: ej. el botón para cancelar la creación del PIN.
  pie?: ReactNode;
}

export function PinLogin({
  onIngresar,
  titulo = "Ingresá el PIN",
  ayuda,
  verificar = login,
  guardar = guardarPin,
  pie,
}: Props) {
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
      const resultado = await verificar(pin);
      if (resultado.ok) {
        guardar(pin);
        onIngresar(pin);
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
    <div className="flex min-h-full flex-col items-center justify-center bg-tinta px-6 py-8 text-crema bajo:flex-row bajo:gap-14 bajo:py-4">
      <div className="flex flex-col items-center">
        <LogoML className="h-12 w-auto sm:h-[50px]" />
        <p className="mt-6 text-center text-3xl font-semibold sm:text-[34px] bajo:mt-4">
          {titulo}
        </p>
        {ayuda && (
          <p className="mt-1.5 max-w-md text-center text-lg text-crema/80">
            {ayuda}
          </p>
        )}

        {/* Puntitos que muestran cuántos dígitos van, sin revelar el PIN. */}
        <div className="mt-5 flex h-7 items-center gap-4 sm:gap-5">
          {Array.from({ length: aros }, (_, i) =>
            i < pin.length ? (
              <span
                key={i}
                className="h-3.5 w-3.5 rounded-full bg-crema"
              />
            ) : (
              <span
                key={i}
                className="h-3.5 w-3.5 rounded-full border-2 border-crema/70"
              />
            ),
          )}
        </div>

        {/* Mismo lugar para el error: un rojo claro que se lee sobre el oscuro. */}
        {aviso && (
          <p className="mt-3 max-w-md rounded-lg border border-[#F6B7A9]/60 bg-peligro/30 px-4 py-2 text-center text-lg font-semibold text-[#F6B7A9]">
            {aviso}
          </p>
        )}
        {pie && <div className="mt-4 bajo:mt-3">{pie}</div>}
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
        {/* Borrar: sin relleno, para que no se confunda con un dígito. */}
        <button
          type="button"
          onClick={borrar}
          disabled={bloqueado}
          aria-label="Borrar"
          className={`flex ${MEDIDA_TECLA} items-center justify-center rounded-xl text-3xl text-crema/85 transition-colors hover:bg-crema/10 hover:text-crema active:bg-crema/20 disabled:opacity-40 bajo:text-2xl ${FOCO}`}
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
          className={`${BOTON_MARCA} focus-visible:outline-crema! flex ${MEDIDA_TECLA} items-center justify-center text-2xl bajo:text-xl`}
        >
          {verificando ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}
