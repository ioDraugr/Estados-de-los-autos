// Vista /display: pantalla del showroom para clientes (solo lectura, modo kiosko).
// Fase 2: lee los autos de la API real. El tiempo real (Socket.IO) llega en la
// Fase 3, junto con /admin; por ahora la pantalla se refresca sola cada tanto.
import { useEffect, useRef, useState } from "react";
import type { Vehiculo } from "../types";
import { obtenerVehiculos } from "../api";
import { COLOR_AREA, NOMBRE_AREA } from "../dominio";
import type { TipoServicio } from "../types";
import { TarjetaVehiculo } from "../components/TarjetaVehiculo";
import { DetalleVehiculo } from "../components/DetalleVehiculo";
import { Cono } from "../components/Cono";

const AREAS: TipoServicio[] = ["instalacion", "polarizado", "vitrificado"];

// Cada cuánto vuelve a pedir los datos. Hace falta para que un auto terminado
// desaparezca solo en una pantalla que nunca se recarga a mano.
const MS_REFRESCO = 30_000;

export function Display() {
  const [seleccionado, setSeleccionado] = useState<Vehiculo | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);
  // Si ya llegaron datos alguna vez. En un ref para no re-disparar el efecto.
  const huboDatos = useRef(false);

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
    return () => {
      vigente = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-full bg-zinc-950 text-white">
      {/* En el celular el título y la referencia de colores se apilan; en la
          pantalla del showroom van uno a cada lado y bien grandes. */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b-4 border-zinc-800 px-4 py-4 sm:px-8 sm:py-6">
        <h1 className="text-2xl font-black tracking-tight sm:text-4xl lg:text-5xl 2xl:text-6xl">
          Taller ML Center
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-6">
          {AREAS.map((tipo) => (
            <div key={tipo} className="flex items-center gap-2">
              <Cono
                color={COLOR_AREA[tipo]}
                estado="esperando"
                className="h-7 w-7 shrink-0 sm:h-9 sm:w-9 lg:h-10 lg:w-10"
              />
              <span className="text-base text-zinc-300 sm:text-xl lg:text-2xl">
                {NOMBRE_AREA[tipo]}
              </span>
            </div>
          ))}
        </div>
      </header>

      {sinConexion && huboDatos.current && (
        <p className="bg-amber-500 px-4 py-2 text-center text-lg font-bold text-black sm:px-8 sm:py-3 sm:text-2xl">
          Sin conexión con el servidor — reintentando…
        </p>
      )}

      {cargando ? (
        <p className="p-10 text-center text-2xl text-zinc-400 sm:p-16 sm:text-4xl">
          Cargando…
        </p>
      ) : vehiculos.length === 0 ? (
        <p className="p-10 text-center text-2xl text-zinc-400 sm:p-16 sm:text-4xl">
          {sinConexion
            ? "Sin conexión con el servidor — reintentando…"
            : "No hay autos en el taller."}
        </p>
      ) : (
        <main className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-6 sm:p-8 lg:grid-cols-3 xl:grid-cols-4">
          {vehiculos.map((v) => (
            <TarjetaVehiculo
              key={v.id}
              vehiculo={v}
              onSeleccionar={setSeleccionado}
            />
          ))}
        </main>
      )}

      {seleccionado && (
        <DetalleVehiculo
          vehiculo={seleccionado}
          onCerrar={() => setSeleccionado(null)}
        />
      )}
    </div>
  );
}
