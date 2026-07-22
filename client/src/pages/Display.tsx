// Vista /display: pantalla del showroom para clientes (solo lectura, modo kiosko).
// Fase 1: usa datos mock, todavía sin conectar a la base ni a Socket.IO.
import { useState } from "react";
import type { Vehiculo } from "../types";
import { VEHICULOS_MOCK } from "../mockData";
import { COLOR_AREA, NOMBRE_AREA } from "../dominio";
import type { TipoServicio } from "../types";
import { TarjetaVehiculo } from "../components/TarjetaVehiculo";
import { DetalleVehiculo } from "../components/DetalleVehiculo";
import { Cono } from "../components/Cono";

const AREAS: TipoServicio[] = ["instalacion", "polarizado", "vitrificado"];

export function Display() {
  const [seleccionado, setSeleccionado] = useState<Vehiculo | null>(null);
  const vehiculos = VEHICULOS_MOCK;

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

      <main className="grid grid-cols-1 gap-6 p-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {vehiculos.map((v) => (
          <TarjetaVehiculo
            key={v.id}
            vehiculo={v}
            onSeleccionar={setSeleccionado}
          />
        ))}
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
