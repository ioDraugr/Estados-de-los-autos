// Formulario de auto, en modal. Sirve para el alta (elige los servicios
// iniciales) y para editar los datos de un auto ya cargado (sin tocar sus
// servicios: eso se hace desde la tarjeta). Sin <form> submit: onClick/onChange.
// El celular es opcional: si se carga, el server lo valida (un error vuelve como
// mensaje en /admin, igual que los demás datos). Abajo, el interruptor "Acepta
// recibir mensajes por WhatsApp" (post-venta): en el alta arranca prendido; al
// editar muestra lo guardado.
// Se ve como una hoja sólida sobre la lista oscurecida: los campos con
// etiqueta visible arriba y borde propio (la etiqueta larga del celular entra
// en el celular y en la tablet) y los servicios con un interruptor cada uno.
import { useState } from "react";
import type { DatosVehiculo } from "../api";
import { AREAS, NOMBRE_AREA, celularLocal } from "../dominio";
import type { TipoServicio, Vehiculo } from "../types";
import { AVISO_ERROR, BOTON_MARCA, BOTON_SUAVE } from "../tema";
import { IndicadorArea } from "./IndicadorArea";
import { Interruptor } from "./Interruptor";

// Grupo plano: papel con borde fino y esquinas de 12px.
const GRUPO = "overflow-hidden rounded-xl border border-linea bg-crema-alta";

interface Props {
  modo: "alta" | "edicion";
  // Al editar llega el auto tal como lo manda la API (telefono puede ser null).
  inicial?: Pick<
    Vehiculo,
    "marca" | "modelo" | "color" | "matricula" | "telefono" | "acepta_whatsapp"
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
  // Alta: prendido (lo habitual es que acepte). Edición: lo guardado.
  const [aceptaWhatsapp, setAceptaWhatsapp] = useState(
    esAlta ? true : (inicial?.acepta_whatsapp ?? false),
  );
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
    onGuardar(
      { marca, modelo, color, matricula, telefono, acepta_whatsapp: aceptaWhatsapp },
      servicios,
    );
  }

  return (
    // El fondo oscurece la lista (sin desenfoque); tocarlo cancela.
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-tinta/60 p-3 sm:p-4"
      onClick={onCancelar}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-y-auto rounded-xl p-5 vidrio-hoja-clara sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl leading-tight font-semibold text-tinta">
          {esAlta ? "Nuevo auto" : "Editar auto"}
        </h2>

        <div className={`mt-5 shrink-0 ${GRUPO}`}>
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

        <div className={`mt-4 shrink-0 ${GRUPO}`}>
          <button
            type="button"
            role="switch"
            aria-checked={aceptaWhatsapp}
            onClick={() => setAceptaWhatsapp((v) => !v)}
            className="flex min-h-[72px] w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-arena/50 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-tinta"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-medium text-tinta">
                Acepta recibir mensajes por WhatsApp
              </span>
              <span className="mt-0.5 block text-[15px] text-tinta-suave">
                Pedido de reseña y recordatorio de mantenimiento, después del retiro.
              </span>
            </span>
            <Interruptor prendido={aceptaWhatsapp} />
          </button>
        </div>

        {esAlta && (
          <div className="mt-6 shrink-0">
            <p className="mb-2 text-base font-semibold text-tinta">
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
                    className="flex min-h-[62px] w-full items-center gap-3.5 border-t border-linea px-4 py-2.5 text-left transition-colors first:border-t-0 hover:bg-arena/50 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-tinta"
                  >
                    <IndicadorArea tipo={tipo} />
                    <span className="min-w-0 flex-1 text-lg font-medium text-tinta">
                      {NOMBRE_AREA[tipo]}
                    </span>
                    <Interruptor prendido={activo} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p
            className={`${AVISO_ERROR} mt-5 shrink-0 px-4 py-3 text-lg`}
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex shrink-0 gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className={`${BOTON_SUAVE} h-14 flex-1 text-lg`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!listo || guardando}
            className={`${BOTON_MARCA} h-14 flex-1 text-lg`}
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
  // Una fila del grupo: etiqueta siempre visible arriba y el campo abajo, con
  // borde propio. Al enfocarlo, el borde se engrosa en carbón.
  return (
    <label className="flex flex-col gap-1 border-t border-linea px-4 py-3 first:border-t-0">
      <span className="text-[15px] font-semibold text-tinta">{etiqueta}</span>
      <input
        type={tipo}
        inputMode={tipo === "tel" ? "tel" : undefined}
        autoComplete={tipo === "tel" ? "off" : undefined}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onCambio(e.target.value)}
        className="h-12 w-full min-w-0 rounded-lg border border-tinta-suave bg-white px-3 text-xl text-tinta outline-none placeholder:text-[#8a7d68] focus-visible:border-tinta focus-visible:ring-2 focus-visible:ring-tinta"
      />
    </label>
  );
}
