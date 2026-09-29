// Formulario de auto, en modal. Sirve para el alta (elige los servicios
// iniciales) y para editar los datos de un auto ya cargado (sin tocar sus
// servicios: eso se hace desde la tarjeta). Sin <form> submit: onClick/onChange.
// El celular es opcional: si se carga, el server lo valida (un error vuelve como
// mensaje en /admin, igual que los demás datos).
// Se ve como una hoja de vidrio claro sobre la lista desenfocada: los campos en
// un grupo redondeado con separadores finos (etiqueta arriba, campo abajo, para
// que la etiqueta larga del celular entre en el celular y en la tablet) y los
// servicios con un interruptor cada uno.
import { useState } from "react";
import type { DatosVehiculo } from "../api";
import { AREAS, COLOR_AREA, NOMBRE_AREA, celularLocal } from "../dominio";
import type { TipoServicio, Vehiculo } from "../types";
import { AVISO_ERROR, BOTON_MARCA, BOTON_SUAVE } from "../tema";
import { ConoCirculo } from "./ConoCirculo";

// Grupo redondeado blanco translúcido, estilo lista agrupada.
const GRUPO = "overflow-hidden rounded-[20px] bg-white/[0.72]";

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
    // El fondo tiñe y desenfoca la lista; tocarlo cancela. Sin desenfoque
    // (sin-vidrio) tiñe más, para que la lista de atrás no distraiga.
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-tabaco/[0.22] p-3 backdrop-blur-[22px] backdrop-saturate-[1.4] sm:p-4 sin-vidrio:bg-tabaco/60"
      onClick={onCancelar}
    >
      <div
        className="animate-hoja flex max-h-[90dvh] w-full max-w-xl flex-col overflow-y-auto rounded-[32px] p-5 vidrio-hoja-clara sm:rounded-[40px] sm:p-9"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[34px] leading-[1.05] font-[650] tracking-[-0.05em] text-tinta sm:text-[44px]">
          {esAlta ? "Nuevo auto" : "Editar auto"}
        </h2>

        <div className={`mt-5 shrink-0 sm:mt-6 ${GRUPO}`}>
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
          <div className="mt-6 shrink-0">
            <p className="mb-2 ml-4 text-base font-medium text-tinta-suave sm:ml-[18px]">
              Servicios
            </p>
            <div className={GRUPO}>
              {AREAS.map((tipo) => {
                const activo = servicios.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    role="switch"
                    aria-checked={activo}
                    onClick={() => alternarServicio(tipo)}
                    className="flex min-h-[62px] w-full items-center gap-3.5 border-t border-tinta/[0.08] px-4 py-2.5 text-left transition-colors first:border-t-0 active:bg-tinta/[0.04] sm:px-[18px]"
                  >
                    <ConoCirculo
                      color={COLOR_AREA[tipo]}
                      estado="esperando"
                      tamano="tarjeta"
                      tono="claro"
                    />
                    <span className="min-w-0 flex-1 text-lg font-medium text-tinta sm:text-xl">
                      {NOMBRE_AREA[tipo]}
                    </span>
                    {/* Interruptor: pista verde con la perilla a la derecha
                        cuando el servicio está elegido. */}
                    <span
                      aria-hidden="true"
                      className={`relative h-[34px] w-[58px] shrink-0 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                        activo ? "bg-listo-vivo" : "bg-tinta/[0.14]"
                      }`}
                    >
                      <span
                        className={`absolute top-[3px] left-[3px] h-7 w-7 rounded-full bg-white shadow-[0_3px_8px_rgba(22,19,15,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.3,1.3,0.5,1)] ${
                          activo ? "translate-x-6" : ""
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p
            className={`${AVISO_ERROR} mt-5 shrink-0 px-4 py-3 text-lg sm:text-xl`}
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex shrink-0 gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className={`${BOTON_SUAVE} h-14 flex-1 text-lg sm:h-16 sm:text-xl`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!listo || guardando}
            className={`${BOTON_MARCA} h-14 flex-1 text-lg sm:h-16 sm:text-xl`}
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
  // Una fila del grupo: etiqueta arriba y el campo abajo, grande y sin borde.
  // Al escribir, la fila se tiñe de dorado.
  return (
    <label className="flex flex-col border-t border-tinta/[0.08] px-4 pt-2.5 transition-colors first:border-t-0 focus-within:bg-marca/[0.12] sm:px-[18px]">
      <span className="text-[15px] font-medium text-tinta-suave sm:text-base">
        {etiqueta}
      </span>
      <input
        type={tipo}
        inputMode={tipo === "tel" ? "tel" : undefined}
        autoComplete={tipo === "tel" ? "off" : undefined}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onCambio(e.target.value)}
        className="h-12 w-full min-w-0 bg-transparent text-xl text-tinta caret-[#be8a18] outline-none placeholder:text-[#A89B84] sm:h-[52px] sm:text-[22px]"
      />
    </label>
  );
}
