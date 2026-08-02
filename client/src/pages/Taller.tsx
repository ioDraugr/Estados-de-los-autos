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
  NoAutorizado,
  cambiarEstadoServicio,
  obtenerVehiculosAdmin,
} from "../api";
import { borrarPin, leerPin } from "../sesion";
import type { EstadoServicio, Vehiculo } from "../types";
import { AVISO, BOTON_OSCURO, TEXTO_VACIO } from "../tema";
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
  const [sinConexion, setSinConexion] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setVehiculos(await obtenerVehiculosAdmin());
      setSinConexion(false);
    } catch {
      setSinConexion(true);
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
        setSinConexion(true);
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
    <div className="min-h-full bg-crema">
      <CabeceraCurva
        alto="compacta"
        conos
        acciones={
          <button
            type="button"
            onClick={salir}
            className={`${BOTON_OSCURO} px-4 py-2 text-base sm:px-5 sm:py-3 sm:text-xl`}
          >
            Salir
          </button>
        }
      />

      <main className="px-4 py-6 sm:px-8 sm:py-8">
        {sinConexion && (
          <p
            className={`${AVISO} mb-5 rounded-2xl px-4 py-3 text-lg sm:mb-6 sm:text-2xl`}
          >
            Sin conexión con el servidor — reintentando…
          </p>
        )}

        <TituloSeccion
          titulo="Trabajos del taller"
          ayuda="Tocá el estado de cada trabajo para actualizarlo."
        />

        {cargando ? (
          <p className={`${TEXTO_VACIO} p-10 text-2xl sm:p-16`}>Cargando…</p>
        ) : vehiculos.length === 0 ? (
          <p className={`${TEXTO_VACIO} p-10 text-2xl sm:p-16`}>
            No hay autos en el taller.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:mt-7 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
