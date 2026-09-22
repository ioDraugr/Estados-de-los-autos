// Formulario de auto, en modal. Sirve para el alta (elige los servicios
// iniciales) y para editar los datos de un auto ya cargado (sin tocar sus
// servicios: eso se hace desde la tarjeta). Sin <form> submit: onClick/onChange.
// El celular es opcional: si se carga, el server lo valida (un error vuelve como
// mensaje en /admin, igual que los demás datos).
import { useState } from "react";
import type { DatosVehiculo } from "../api";
import { AREAS, COLOR_AREA, NOMBRE_AREA, celularLocal } from "../dominio";
import type { TipoServicio, Vehiculo } from "../types";
import { AVISO_ERROR, BOTON_MARCA, BOTON_SUAVE } from "../tema";
import { Cono } from "./Cono";

interface Props {
  modo: "alta" | "edicion";
  // Al editar llega el auto tal como lo manda la API (telefono puede ser null).
  inicial?: Pick<
    Vehiculo,
    "marca" | "modelo" | "color" | "matricula" | "telefono"
  >;
  guardando: boolean;
  // Mensaje del server si no se pudo guardar (ej. celular mal escrito). Se
  // muestra dentro del modal: el aviso de la página queda tapado por el fondo.
  error?: string | null;
  onGuardar: (datos: DatosVehiculo, servicios: TipoServicio[]) => void;
  onCancelar: () => void;
}

export function FormVehiculo({
  modo,
  inicial,
  guardando,
  error,
  onGuardar,
  onCancelar,
}: Props) {
  const [marca, setMarca] = useState(inicial?.marca ?? "");
  const [modelo, setModelo] = useState(inicial?.modelo ?? "");
  const [color, setColor] = useState(inicial?.color ?? "");
  const [matricula, setMatricula] = useState(inicial?.matricula ?? "");
  const [telefono, setTelefono] = useState(
    inicial?.telefono ? celularLocal(inicial.telefono) : "",
  );
  const [servicios, setServicios] = useState<TipoServicio[]>([]);

  const esAlta = modo === "alta";
  // El celular no cuenta: es opcional.
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
    onGuardar({ marca, modelo, color, matricula, telefono }, servicios);
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-tinta/80 p-3 sm:p-4"
      onClick={onCancelar}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-y-auto rounded-3xl bg-crema p-5 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black text-tinta sm:text-3xl">
          {esAlta ? "Nuevo auto" : "Editar auto"}
        </h2>

        <div className="mt-5 flex flex-col gap-4">
          <Campo etiqueta="Marca" valor={marca} onCambio={setMarca} />
          <Campo etiqueta="Modelo" valor={modelo} onCambio={setModelo} />
          <Campo etiqueta="Color" valor={color} onCambio={setColor} />
          <Campo etiqueta="Matrícula" valor={matricula} onCambio={setMatricula} />
          <Campo
            etiqueta="Celular para avisos por WhatsApp (opcional)"
            valor={telefono}
            onCambio={setTelefono}
            tipo="tel"
            placeholder="099 123 456"
          />
        </div>

        {esAlta && (
          <div className="mt-6">
            <p className="text-lg font-bold text-tinta-suave sm:text-xl">
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
                    className={`flex items-center gap-4 rounded-2xl border-2 bg-crema-alta p-3 text-left active:scale-[0.99] sm:p-4 ${
                      activo ? "border-listo" : "border-linea"
                    }`}
                  >
                    <Cono
                      color={COLOR_AREA[tipo]}
                      estado="esperando"
                      className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
                    />
                    <span className="flex-1 text-xl font-bold text-tinta sm:text-2xl">
                      {NOMBRE_AREA[tipo]}
                    </span>
                    <span
                      className={`text-2xl font-bold ${activo ? "text-listo" : "text-tinta/40"}`}
                    >
                      {activo ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p
            className={`${AVISO_ERROR} mt-6 rounded-2xl px-4 py-3 text-lg sm:text-xl`}
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onCancelar}
            className={`${BOTON_SUAVE} flex-1 py-4 text-xl sm:text-2xl`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!listo || guardando}
            className={`${BOTON_MARCA} flex-1 py-4 text-xl sm:text-2xl`}
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
  // "tel" abre el teclado numérico en la tablet.
  tipo?: "text" | "tel";
  placeholder?: string;
}

function Campo({
  etiqueta,
  valor,
  onCambio,
  tipo = "text",
  placeholder,
}: CampoProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-lg text-tinta-suave sm:text-xl">{etiqueta}</span>
      <input
        type={tipo}
        inputMode={tipo === "tel" ? "tel" : undefined}
        autoComplete={tipo === "tel" ? "off" : undefined}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onCambio(e.target.value)}
        className="rounded-xl border-2 border-linea bg-crema-alta px-4 py-3 text-xl text-tinta outline-none placeholder:text-tinta/40 focus:border-marca sm:text-2xl"
      />
    </label>
  );
}
