// Modo General de /taller: una tarjeta por auto con todos sus servicios. Filtro
// simple Pendientes / Todos (los listos solo se ven con Todos).
import { useState } from "react";
import type { EstadoServicio, Vehiculo } from "../types";
import { TallerAuto } from "./TallerAuto";
import {
  esPendiente,
  ordenarVehiculos,
  type Toque,
  type Trabajo,
} from "./tallerTablero";
import { propsEntrada, useEntradaInicial } from "./useEntradaInicial";

interface Props {
  vehiculos: Vehiculo[];
  toque: Toque | null;
  ocupado: boolean;
  onCambiar: (trabajo: Trabajo, estado: EstadoServicio) => void;
}

function chip(activo: boolean) {
  return `con-foco inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border px-5 text-base font-medium transition-colors duration-200 sm:text-lg ${
    activo
      ? "border-con-acento bg-con-acento text-white"
      : "border-con-borde-fuerte bg-con-sup text-con-texto hover:bg-con-sup2"
  }`;
}

export function TallerGeneral({ vehiculos, toque, ocupado, onCambiar }: Props) {
  const [soloPendientes, setSoloPendientes] = useState(true);
  const entrada = useEntradaInicial();
  const ordenados = ordenarVehiculos(vehiculos);
  const pendientes = ordenados.filter(esPendiente);
  const visibles = soloPendientes ? pendientes : ordenados;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Qué autos mostrar"
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          aria-pressed={soloPendientes}
          onClick={() => setSoloPendientes(true)}
          className={chip(soloPendientes)}
        >
          Pendientes
          <span className="tabular-nums">{pendientes.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={!soloPendientes}
          onClick={() => setSoloPendientes(false)}
          className={chip(!soloPendientes)}
        >
          Todos
          <span className="tabular-nums">{ordenados.length}</span>
        </button>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-sm border border-con-borde bg-con-sup p-10 text-center text-xl text-con-suave">
          {ordenados.length === 0
            ? "No hay autos en el taller."
            : "No hay autos pendientes. Todos están listos."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 min-[1700px]:grid-cols-3">
          {visibles.map((v, i) => (
            <TallerAuto
              key={v.id}
              vehiculo={v}
              ocupado={ocupado}
              onCambiar={onCambiar}
              entrada={propsEntrada(entrada, i)}
              destelloServicio={toque}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
