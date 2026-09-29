// Vista /display: pantalla del showroom para clientes (solo lectura, modo kiosko).
// Fase 4: tiempo real con Socket.IO. Ante un cambio en /admin, el server emite un
// evento y acá volvemos a pedir la lista al instante. El poll de 30 s se mantiene
// como red de seguridad para el paso del tiempo (que un auto terminado se oculte
// solo al cruzar las horas) y por si el socket estuvo caído.
//
// Además, un "atractor" de kiosko: primero se ve la pantalla de bienvenida y
// recién al tocar aparece la lista. Los datos cargan de fondo igual (poll +
// socket siempre vivos), así al tocar la lista ya está fresca. Tras un rato sin
// tocar, vuelve sola a la bienvenida para el próximo cliente.
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { Vehiculo } from "../types";
import { obtenerVehiculos } from "../api";
import { AVISO, BOTON_OSCURO } from "../tema";
import { TarjetaVehiculo } from "../components/TarjetaVehiculo";
import { DetalleVehiculo } from "../components/DetalleVehiculo";
import { Bienvenida } from "../components/Bienvenida";
import { CabeceraCurva } from "../components/CabeceraCurva";
import { TituloSeccion } from "../components/TituloSeccion";

// Cada cuánto vuelve a pedir los datos. Hace falta para que un auto terminado
// desaparezca solo en una pantalla que nunca se recarga a mano.
const MS_REFRESCO = 30_000;

// Tras este tiempo sin que nadie toque la lista, se vuelve solo a la bienvenida.
const MS_INACTIVIDAD = 60_000;

// "Cargando…" / "No hay autos…" sobre el fondo oscuro del showroom (el
// TEXTO_VACIO de tema.ts es para fondo claro).
const TEXTO_VACIO_OSCURO = "text-center text-crema/60";

export function Display() {
  const [seleccionado, setSeleccionado] = useState<Vehiculo | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);
  // Arranca en la pantalla de bienvenida; el toque la pasa a la lista.
  const [bienvenida, setBienvenida] = useState(true);
  // Si ya llegaron datos alguna vez. En un ref para no re-disparar el efecto.
  const huboDatos = useRef(false);

  function volverAInicio() {
    setSeleccionado(null);
    setBienvenida(true);
  }

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      try {
        const datos = await obtenerVehiculos();
        if (!vigente) return;
        setVehiculos(datos);
        setSinConexion(false);
        huboDatos.current = true;
      } catch (error) {
        console.error("No se pudieron traer los vehículos:", error);
        // Si ya había datos los dejamos en pantalla: en el showroom es mejor
        // mostrar algo apenas viejo que quedar en blanco por un corte de wifi.
        if (vigente) setSinConexion(true);
      } finally {
        if (vigente) setCargando(false);
      }
    }

    cargar();
    const id = setInterval(cargar, MS_REFRESCO);

    // Tiempo real: el server avisa "vehiculos:cambio" tras cada cambio en /admin.
    // io() sin URL conecta al mismo origen (en dev lo proxya Vite); reconecta solo
    // si se corta el wifi. Al (re)conectar refrescamos para no perder cambios que
    // hayan pasado mientras estuvo caído.
    const socket = io();
    socket.on("vehiculos:cambio", cargar);
    socket.on("connect", cargar);

    return () => {
      vigente = false;
      clearInterval(id);
      socket.disconnect();
    };
  }, []);

  // Vuelta automática a la bienvenida por inactividad. Solo corre cuando se está
  // viendo la lista; cada toque real (pointerdown/keydown) reinicia la cuenta.
  useEffect(() => {
    if (bienvenida) return;

    let timer: ReturnType<typeof setTimeout>;
    const reiniciar = () => {
      clearTimeout(timer);
      timer = setTimeout(volverAInicio, MS_INACTIVIDAD);
    };

    reiniciar(); // empieza a contar al entrar a la lista
    window.addEventListener("pointerdown", reiniciar);
    window.addEventListener("keydown", reiniciar);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reiniciar);
      window.removeEventListener("keydown", reiniciar);
    };
  }, [bienvenida]);

  if (bienvenida) {
    return <Bienvenida onTocar={() => setBienvenida(false)} />;
  }

  return (
    <div className="min-h-full text-crema fondo-oscuro">
      {/* Misma cabecera oscura que la bienvenida, pero baja (cúpula con filo
          dorado): el logo y la referencia de conos siguen a la vista mientras
          se mira la lista. */}
      <CabeceraCurva
        alto="compacta"
        conos
        acciones={
          // Cierra la consulta y vuelve al cartel de bienvenida.
          <button
            type="button"
            onClick={volverAInicio}
            className={`${BOTON_OSCURO} min-h-11 px-4 py-2 text-base sm:px-5 sm:py-3 sm:text-xl`}
          >
            Inicio
          </button>
        }
      />

      <main className="px-4 pt-2 pb-10 sm:px-8 sm:pb-14 lg:px-12">
        {sinConexion && huboDatos.current && (
          <p
            className={`${AVISO} mb-5 px-4 py-3 text-lg sm:mb-6 sm:text-2xl`}
          >
            Sin conexión con el servidor — reintentando…
          </p>
        )}

        <TituloSeccion
          tono="oscuro"
          titulo="Autos en el taller"
          ayuda="Tocá tu auto para ver el estado."
        />

        {cargando ? (
          <p className={`${TEXTO_VACIO_OSCURO} p-10 text-2xl sm:p-16 sm:text-4xl`}>
            Cargando…
          </p>
        ) : vehiculos.length === 0 ? (
          <p className={`${TEXTO_VACIO_OSCURO} p-10 text-2xl sm:p-16 sm:text-4xl`}>
            {sinConexion
              ? "Sin conexión con el servidor — reintentando…"
              : "No hay autos en el taller."}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:gap-7">
            {vehiculos.map((v) => (
              <TarjetaVehiculo
                key={v.id}
                vehiculo={v}
                onSeleccionar={setSeleccionado}
              />
            ))}
          </div>
        )}
      </main>

      {seleccionado && (
        <DetalleVehiculo
          vehiculo={seleccionado}
          onCerrar={() => setSeleccionado(null)}
        />
      )}
    </div>
  );
}
