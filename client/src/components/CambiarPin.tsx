// Tarjeta "PIN de acceso" de Configuración: cambiar el PIN compartido de /admin
// y /taller, pidiendo el actual. Sin <form> submit: onClick/onChange.
// Los chequeos simples (de 4 a 8 números, que el nuevo esté repetido igual) se
// hacen acá para avisar antes; igual el server revalida todo. Un PIN actual mal
// (o el bloqueo por demasiados intentos) se muestra en la tarjeta: NO desloguea.
// /reportes la reusa para el PIN del dueño (ver los props opcionales).
import { useId, useState } from "react";
import { NoAutorizado, cambiarPin, textoDeError } from "../api";
import { guardarPin } from "../sesion";
import { AVISO_ERROR, AVISO_OK, BOTON_MARCA } from "../tema";
import { CAMPO_TEXTO, CONTENEDOR_FILAS, GRUPO, TarjetaConfig } from "./TarjetaConfig";

const PIN_VALIDO = /^\d{4,8}$/;

interface Props {
  // El PIN guardado en este dispositivo ya no sirve: volver al login.
  onNoAutorizado: () => void;
  // Lo de abajo es opcional: sin nada, es el PIN de /admin y /taller.
  titulo?: string;
  ayuda?: string;
  // Aviso cuando salió bien.
  textoListo?: string;
  // Llamada al server que cambia el PIN.
  cambiar?: (actual: string, nuevo: string) => Promise<void>;
  // Dónde queda guardado el PIN nuevo en este dispositivo.
  guardar?: (pin: string) => void;
  // Dentro de la categoría "Seguridad" de Configuración: sin tarjeta propia
  // (el título y la ayuda los pone el detalle), solo las filas y el botón.
  incrustado?: boolean;
}

export function CambiarPin({
  onNoAutorizado,
  titulo = "PIN de acceso",
  ayuda = "Es el mismo para /admin y /taller.",
  textoListo = "PIN cambiado. Las otras tablets y PCs van a pedir el PIN nuevo.",
  cambiar = cambiarPin,
  guardar: guardarNuevo = guardarPin,
  incrustado = false,
}: Props) {
  const [actual, setActual] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [repetido, setRepetido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const completo = actual !== "" && nuevo !== "" && repetido !== "";

  // Al escribir se borran los avisos de antes.
  function cambio(set: (v: string) => void) {
    return (valor: string) => {
      set(valor);
      setError(null);
      setListo(false);
    };
  }

  async function guardar() {
    if (!completo || guardando) return;
    if (!PIN_VALIDO.test(nuevo)) {
      setError("El PIN nuevo tiene que tener de 4 a 8 números.");
      return;
    }
    if (nuevo !== repetido) {
      setError("Los dos PIN nuevos no coinciden. Escribilos de nuevo.");
      return;
    }
    if (nuevo === actual) {
      setError("El PIN nuevo es igual al actual.");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await cambiar(actual, nuevo);
      // Este dispositivo sigue adentro con el PIN nuevo.
      guardarNuevo(nuevo);
      setActual("");
      setNuevo("");
      setRepetido("");
      setListo(true);
    } catch (e) {
      if (e instanceof NoAutorizado) onNoAutorizado();
      else setError(textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const cuerpo = (
    <>
      <div className={incrustado ? CONTENEDOR_FILAS : GRUPO}>
        <CampoPin etiqueta="PIN actual" valor={actual} onCambio={cambio(setActual)} />
        <CampoPin etiqueta="PIN nuevo (4 a 8 números)" valor={nuevo} onCambio={cambio(setNuevo)} />
        <CampoPin etiqueta="Repetí el PIN nuevo" valor={repetido} onCambio={cambio(setRepetido)} />
      </div>

      {error && (
        <p role="alert" className={`${AVISO_ERROR} mt-4 px-4 py-3 text-lg`}>{error}</p>
      )}
      {listo && (
        <p role="status" className={`${AVISO_OK} mt-4 px-4 py-3 text-lg`}>{textoListo}</p>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={!completo || guardando}
        className={`${BOTON_MARCA} mt-5 h-14 w-full text-lg sm:text-xl ${
          incrustado ? "sm:w-auto sm:px-8" : ""
        }`}
      >
        {guardando ? "Cambiando…" : "Cambiar PIN"}
      </button>
    </>
  );

  if (incrustado) return cuerpo;
  return (
    <TarjetaConfig titulo={titulo} ayuda={ayuda}>
      {cuerpo}
    </TarjetaConfig>
  );
}

interface CampoPinProps {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
}

// Una fila del grupo: etiqueta a la izquierda y el campo a la derecha (en
// pantalla chica, el campo debajo). Teclado numérico en la tablet y solo se
// aceptan números.
function CampoPin({ etiqueta, valor, onCambio }: CampoPinProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5">
      <label htmlFor={id} className="text-lg font-semibold text-tinta">
        {etiqueta}
      </label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={8}
        value={valor}
        onChange={(e) => onCambio(e.target.value.replace(/\D/g, ""))}
        className={`${CAMPO_TEXTO} h-12 text-2xl tracking-[0.3em] sm:w-56`}
      />
    </div>
  );
}
