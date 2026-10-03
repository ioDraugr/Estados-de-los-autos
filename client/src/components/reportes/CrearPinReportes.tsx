// Primera vez en /reportes: todavía no hay PIN del dueño y hay que crearlo.
// Tres pasos con el mismo teclado del login (PinLogin):
//   1. el PIN de administración (el de /admin), así no lo crea el primero que
//      llega; se valida contra el server pero NO se guarda en ningún lado,
//   2. el PIN de reportes nuevo (de 4 a 8 números, distinto del de /admin),
//   3. el mismo otra vez, para confirmarlo. Recién ahí se crea en el server y
//      queda guardado como sesión de reportes.
// "Volver a empezar" (pasos 2 y 3) le pide al padre que vuelva a preguntar si
// ya existe el PIN: así, si otro lo creó mientras tanto, se pasa a ingresarlo.
import { useState } from "react";
import { crearPinReportes, login, type ResultadoLogin } from "../../api";
import { guardarPinReportes } from "../../sesion";
import { BOTON_OSCURO } from "../../tema";
import { PinLogin } from "../PinLogin";

const PIN_VALIDO = /^\d{4,8}$/;

interface Props {
  // El PIN se creó y ya quedó guardado: entrar a los reportes.
  onCreado: () => void;
  onVolverAEmpezar: () => void;
}

// Un rechazo de un paso local (no hay bloqueo: no se le pregunta al server).
function rechazo(mensaje: string): ResultadoLogin {
  return { ok: false, bloqueado: false, mensaje };
}

// Pasos 1 y 2 no guardan nada: el PIN queda en el estado de esta pantalla.
function noGuardar() {}

export function CrearPinReportes({ onCreado, onVolverAEmpezar }: Props) {
  const [paso, setPaso] = useState<"admin" | "nuevo" | "repetir">("admin");
  const [pinAdmin, setPinAdmin] = useState("");
  const [nuevo, setNuevo] = useState("");

  const volver = (
    <button
      type="button"
      onClick={onVolverAEmpezar}
      className={`${BOTON_OSCURO} h-12 px-6 text-lg`}
    >
      Volver a empezar
    </button>
  );

  // Cada paso con su key: el teclado arranca vacío y sin avisos del anterior.
  if (paso === "admin") {
    return (
      <PinLogin
        key="admin"
        titulo="Crear PIN de reportes"
        ayuda="Todavía no hay PIN de reportes. Para crearlo, primero ingresá el PIN de administración."
        verificar={login}
        guardar={noGuardar}
        onIngresar={(pin) => {
          setPinAdmin(pin);
          setPaso("nuevo");
        }}
      />
    );
  }

  if (paso === "nuevo") {
    return (
      <PinLogin
        key="nuevo"
        titulo="Elegí el PIN de reportes"
        ayuda="De 4 a 8 números, distinto del PIN de administración."
        verificar={async (pin) => {
          if (!PIN_VALIDO.test(pin)) {
            return rechazo("El PIN tiene que tener de 4 a 8 números.");
          }
          if (pin === pinAdmin) {
            return rechazo("No puede ser igual al PIN de administración.");
          }
          return { ok: true };
        }}
        guardar={noGuardar}
        onIngresar={(pin) => {
          setNuevo(pin);
          setPaso("repetir");
        }}
        pie={volver}
      />
    );
  }

  return (
    <PinLogin
      key="repetir"
      titulo="Repetí el PIN de reportes"
      ayuda="Para confirmar que lo escribiste bien."
      verificar={async (pin) => {
        if (pin !== nuevo) {
          return rechazo("No coincide con el PIN que elegiste. Probá de nuevo.");
        }
        return crearPinReportes(pinAdmin, nuevo);
      }}
      guardar={guardarPinReportes}
      onIngresar={onCreado}
      pie={volver}
    />
  );
}
