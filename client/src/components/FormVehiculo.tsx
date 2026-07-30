// Formulario de auto, en modal. Sirve para el alta (elige los servicios
// iniciales) y para editar los datos de un auto ya cargado (sin tocar sus
// servicios: eso se hace desde la tarjeta). Sin <form> submit: onClick/onChange.
import { useState } from "react";
import type { DatosVehiculo } from "../api";
import { COLOR_AREA, NOMBRE_AREA } from "../dominio";
import type { TipoServicio } from "../types";
import { Cono } from "./Cono";

const AREAS: TipoServicio[] = ["instalacion", "polarizado", "vitrificado"];

interface Props {
  modo: "alta" | "edicion";
  inicial?: DatosVehiculo;
  guardando: boolean;
  onGuardar: (datos: DatosVehiculo, servicios: TipoServicio[]) => void;
  onCancelar: () => void;
}

export function FormVehiculo({
  modo,
  inicial,
  guardando,
  onGuardar,
  onCancelar,
}: Props) {
  const [marca, setMarca] = useState(inicial?.marca ?? "");
  const [modelo, setModelo] = useState(inicial?.modelo ?? "");
  const [color, setColor] = useState(inicial?.color ?? "");
  const [matricula, setMatricula] = useState(inicial?.matricula ?? "");
  const [servicios, setServicios] = useState<TipoServicio[]>([]);

  const esAlta = modo === "alta";
  const datosCompletos =
    marca.trim() && modelo.trim() && color.trim() && matricula.trim();
  // En alta hace falta al menos un servicio; en edición no se tocan.
  const listo = datosCompletos && (!esAlta || servicios.length > 0);

  function alternarServicio(tipo: TipoServicio) {
    setServicios((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  }

  function guardar() {
    if (!listo || guardando) return;
    onGuardar({ marca, modelo, color, matricula }, servicios);
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/80 p-3 sm:p-4"
      onClick={onCancelar}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-y-auto rounded-2xl border-4 border-zinc-700 bg-zinc-900 p-5 sm:rounded-3xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          {esAlta ? "Nuevo auto" : "Editar auto"}
        </h2>

        <div className="mt-5 flex flex-col gap-4">
          <Campo etiqueta="Marca" valor={marca} onCambio={setMarca} />
          <Campo etiqueta="Modelo" valor={modelo} onCambio={setModelo} />
          <Campo etiqueta="Color" valor={color} onCambio={setColor} />
          <Campo etiqueta="Matrícula" valor={matricula} onCambio={setMatricula} />
        </div>

        {esAlta && (
          <div className="mt-6">
            <p className="text-lg font-semibold text-zinc-300 sm:text-xl">
              Servicios
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {AREAS.map((tipo) => {
                const activo = servicios.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => alternarServicio(tipo)}
                    className={`flex items-center gap-4 rounded-2xl border-4 p-3 text-left active:scale-[0.99] sm:p-4 ${
                      activo
                        ? "border-green-500 bg-green-950/40"
                        : "border-zinc-700 bg-zinc-800"
                    }`}
                  >
                    <Cono
                      color={COLOR_AREA[tipo]}
                      estado="esperando"
                      className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
                    />
                    <span className="flex-1 text-xl font-semibold text-white sm:text-2xl">
                      {NOMBRE_AREA[tipo]}
                    </span>
                    <span
                      className={`text-2xl ${activo ? "text-green-400" : "text-zinc-500"}`}
                    >
                      {activo ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-7 flex gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 rounded-2xl bg-zinc-700 py-4 text-xl font-bold text-white active:scale-[0.98] sm:text-2xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!listo || guardando}
            className="flex-1 rounded-2xl bg-green-600 py-4 text-xl font-bold text-white active:scale-[0.98] disabled:opacity-40 sm:text-2xl"
          >
            {guardando ? "Guardando…" : esAlta ? "Crear" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CampoProps {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
}

function Campo({ etiqueta, valor, onCambio }: CampoProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-lg text-zinc-300 sm:text-xl">{etiqueta}</span>
      <input
        type="text"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className="rounded-xl border-2 border-zinc-600 bg-zinc-800 px-4 py-3 text-xl text-white outline-none focus:border-green-500 sm:text-2xl"
      />
    </label>
  );
}
