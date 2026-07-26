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
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-zinc-800 px-8 py-6">
        <h1 className="text-5xl font-black tracking-tight">Taller ML Center</h1>
        <div className="flex gap-6">
          {AREAS.map((tipo) => (
            <div key={tipo} className="flex items-center gap-2">
              <Cono color={COLOR_AREA[tipo]} estado="esperando" size={40} />
              <span className="text-2xl text-zinc-300">
                {NOMBRE_AREA[tipo]}
              </span>
            </div>
          ))}
        </div>
      </header>

      {sinConexion && huboDatos.current && (
        <p className="bg-amber-500 px-8 py-3 text-center text-2xl font-bold text-black">
          Sin conexión con el servidor — reintentando…
        </p>
      )}

      {cargando ? (
        <p className="p-16 text-center text-4xl text-zinc-400">Cargando…</p>
      ) : vehiculos.length === 0 ? (
        <p className="p-16 text-center text-4xl text-zinc-400">
          {sinConexion
            ? "Sin conexión con el servidor — reintentando…"
            : "No hay autos en el taller."}
        </p>
      ) : (
        <main className="grid grid-cols-1 gap-6 p-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
