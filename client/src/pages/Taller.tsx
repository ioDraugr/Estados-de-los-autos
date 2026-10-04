// Vista /taller: para los trabajadores del taller. SOLO cambian el estado de cada
// servicio (esperando / en proceso / terminado). Sin alta, editar, agregar/quitar
// servicios ni retirar (eso es /admin).
//
// Reusa el login por PIN de /admin (mismo PIN, misma clave de localStorage, así la
// tablet del taller se loguea una sola vez) y se actualiza en vivo como /display:
// escucha el evento de Socket.IO y refetchea, con un poll de 30 s de respaldo.
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  ErrorApi,
  NoAutorizado,
  cambiarEstadoServicio,
  obtenerVehiculosAdmin,
} from "../api";
import { borrarPin, leerPin } from "../sesion";
import type { EstadoServicio, Vehiculo } from "../types";
import { AVISO_CONEXION, BOTON_SUAVE, TEXTO_VACIO } from "../tema";
import { CabeceraCurva } from "../components/CabeceraCurva";
import { PinLogin } from "../components/PinLogin";
import { TallerTarjeta } from "../components/TallerTarjeta";
import { TituloSeccion } from "../components/TituloSeccion";

// Poll de respaldo por si el socket se pierde algún evento.
const MS_REFRESCO = 30_000;

export function Taller() {
  const [logueado, setLogueado] = useState(() => leerPin() !== null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  // Aviso de arriba: sin conexión (reintentando), o el mensaje de error del
  // server (ej. 429 por demasiados intentos, que no es un problema de conexión).
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // 401 (PIN viejo) => volver al login, que corta el poll y el socket.
  const cargar = useCallback(async () => {
    try {
      setVehiculos(await obtenerVehiculosAdmin());
      setAviso(null);
    } catch (e) {
      if (e instanceof NoAutorizado) {
        setLogueado(false);
      } else {
        setAviso(avisoDeError(e));
      }
    } finally {
      setCargando(false);
    }
  }, []);

  // Datos + tiempo real (mismo patrón que /display). Solo cuando hay sesión.
  useEffect(() => {
    if (!logueado) return;

    cargar();
    const id = setInterval(cargar, MS_REFRESCO);

    const socket = io();
    socket.on("vehiculos:cambio", cargar);
    socket.on("connect", cargar);

    return () => {
      clearInterval(id);
      socket.disconnect();
    };
  }, [logueado, cargar]);

  // Cambiar el estado de un servicio. El evento del server hace que el cambio
  // (propio y de otras tablets) aparezca solo; igual refetcheamos por las dudas.
  async function cambiar(servicioId: number, estado: EstadoServicio) {
    setOcupado(true);
    try {
      await cambiarEstadoServicio(servicioId, estado);
      await cargar();
    } catch (e) {
      if (e instanceof NoAutorizado) {
        setLogueado(false);
      } else {
        setAviso(avisoDeError(e));
      }
    } finally {
      setOcupado(false);
    }
  }

  function salir() {
    borrarPin();
    setLogueado(false);
    setVehiculos([]);
  }

  if (!logueado) {
    return (
      <PinLogin
        onIngresar={() => {
          setCargando(true);
          setLogueado(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-full fondo-claro">
      {/* Barra a todo el ancho, con la referencia de áreas. */}
      <CabeceraCurva
        alto="compacta"
        tono="claro"
        conos
        acciones={
          <button
            type="button"
            onClick={salir}
            className={`${BOTON_SUAVE} px-5 text-base sm:text-[17px]`}
          >
            Salir
          </button>
        }
      />

      {/* Mismos márgenes laterales que la barra de arriba. */}
      <main className="px-3 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-14 xl:px-10">
        {aviso && (
          <p
            role="status"
            className={`${AVISO_CONEXION} mb-6 flex items-center gap-3 px-4 py-3 text-base sm:text-lg`}
          >
            {/* Ícono estático (sin animación): sin conexión, reintentando. */}
            {aviso.reintentando && <IconoSinConexion />}
            {aviso.texto}
          </p>
        )}

        <TituloSeccion
          titulo="Trabajos del taller"
          ayuda="Tocá el estado de cada trabajo para actualizarlo."
        />

        {cargando ? (
          <p className={`${TEXTO_VACIO} p-10 text-xl sm:p-16`}>Cargando…</p>
        ) : vehiculos.length === 0 ? (
          <p className={`${TEXTO_VACIO} p-10 text-xl sm:p-16`}>
            No hay autos en el taller.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 items-start gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {vehiculos.map((v) => (
              <TallerTarjeta
                key={v.id}
                vehiculo={v}
                ocupado={ocupado}
                onCambiarEstado={cambiar}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface Aviso {
  texto: string;
  reintentando: boolean;
}

// Aviso para un error que no es de PIN: el mensaje del server si lo hay (ej.
// demasiados intentos) o, si no respondió, sin conexión (y reintentando).
function avisoDeError(e: unknown): Aviso {
  return e instanceof ErrorApi
    ? { texto: e.message, reintentando: false }
    : { texto: "Sin conexión con el servidor — reintentando…", reintentando: true };
}

// Ícono de "sin conexión" (triángulo de aviso), estático.
function IconoSinConexion() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-6 w-6 shrink-0"
    >
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4.5M12 17.5h0" />
    </svg>
  );
}
