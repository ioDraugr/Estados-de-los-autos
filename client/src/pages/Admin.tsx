// Vista /admin: panel de los trabajadores. Login por PIN y, ya adentro, alta de
// autos, cambio de estado por servicio, agregar/quitar servicios y retirar autos.
// Fase 3: sin tiempo real; tras cada acción se vuelve a pedir la lista.
import { useCallback, useEffect, useState } from "react";
import {
  ErrorApi,
  NoAutorizado,
  agregarServicio,
  cambiarEstadoServicio,
  crearVehiculo,
  editarVehiculo,
  obtenerVehiculosAdmin,
  quitarServicio,
  retirarVehiculo,
  type DatosVehiculo,
} from "../api";
import { borrarPin, leerPin } from "../sesion";
import type { EstadoServicio, TipoServicio, Vehiculo } from "../types";
import { AVISO_ERROR, BOTON_MARCA, BOTON_SUAVE, TEXTO_VACIO } from "../tema";
import { AdminTarjeta } from "../components/AdminTarjeta";
import { CabeceraCurva } from "../components/CabeceraCurva";
import { FormVehiculo } from "../components/FormVehiculo";
import { PinLogin } from "../components/PinLogin";
import { TituloSeccion } from "../components/TituloSeccion";

type Modal = { tipo: "alta" } | { tipo: "edicion"; vehiculo: Vehiculo } | null;

export function Admin() {
  const [logueado, setLogueado] = useState(() => leerPin() !== null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  // 401 (PIN viejo) => volver al login; 429 u otro error del server => su
  // mensaje; sin respuesta => sin conexión.
  const cargar = useCallback(async () => {
    try {
      setVehiculos(await obtenerVehiculosAdmin());
      setError(null);
    } catch (e) {
      if (e instanceof NoAutorizado) {
        setLogueado(false);
      } else {
        setError(
          e instanceof ErrorApi ? e.message : "No se pudo conectar con el servidor.",
        );
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (logueado) cargar();
  }, [logueado, cargar]);

  // Corre una acción que escribe, refresca la lista y maneja los errores:
  // 401 => volver al login; error de datos => mostrar el mensaje del server.
  // Devuelve true si salió bien (lo usan los modales para cerrarse).
  async function accion(fn: () => Promise<void>): Promise<boolean> {
    setOcupado(true);
    setError(null);
    try {
      await fn();
      await cargar();
      return true;
    } catch (e) {
      if (e instanceof NoAutorizado) {
        setLogueado(false);
      } else {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
      return false;
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

  // Al abrir el modal se limpia el error de la acción anterior, para que no
  // aparezca adentro del formulario como si fuera de este.
  function abrirModal(nuevo: Modal) {
    setError(null);
    setModal(nuevo);
  }

  async function guardarModal(datos: DatosVehiculo, servicios: TipoServicio[]) {
    const ok = await accion(() =>
      modal?.tipo === "edicion"
        ? editarVehiculo(modal.vehiculo.id, datos)
        : crearVehiculo(datos, servicios),
    );
    if (ok) setModal(null);
  }

  return (
    <div className="min-h-full fondo-claro">
      {/* Barra cápsula de vidrio claro, flotando sobre el fondo de la página. */}
      <CabeceraCurva
        alto="compacta"
        tono="claro"
        acciones={
          <>
            <button
              type="button"
              onClick={() => abrirModal({ tipo: "alta" })}
              disabled={ocupado}
              className={`${BOTON_MARCA} h-11 px-5 text-base sm:h-12 sm:px-[22px] sm:text-[17px]`}
            >
              + Nuevo auto
            </button>
            <button
              type="button"
              onClick={salir}
              className={`${BOTON_SUAVE} h-11 px-5 text-base sm:h-12 sm:px-[22px] sm:text-[17px]`}
            >
              Salir
            </button>
          </>
        }
      />

      <main className="px-4 pt-7 pb-10 sm:px-8 sm:pt-10 sm:pb-14 xl:px-12">
        {error && (
          <p
            className={`${AVISO_ERROR} mb-6 px-4 py-3 text-lg sm:mb-8 sm:text-xl`}
          >
            {error}
          </p>
        )}

        <TituloSeccion
          titulo="Autos en el taller"
          ayuda="Cargá autos, cambiá sus estados y retiralos cuando salen."
        />

        {cargando ? (
          <p className={`${TEXTO_VACIO} p-10 text-2xl sm:p-16`}>Cargando…</p>
        ) : vehiculos.length === 0 ? (
          <p className={`${TEXTO_VACIO} p-10 text-2xl sm:p-16`}>
            No hay autos en el taller. Tocá “+ Nuevo auto” para agregar uno.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:mt-9 sm:gap-7 lg:grid-cols-2 xl:grid-cols-3">
            {vehiculos.map((v) => (
              <AdminTarjeta
                key={v.id}
                vehiculo={v}
                ocupado={ocupado}
                onCambiarEstado={(id, estado: EstadoServicio) =>
                  accion(() => cambiarEstadoServicio(id, estado))
                }
                onAgregarServicio={(vehiculoId, tipo) =>
                  accion(() => agregarServicio(vehiculoId, tipo))
                }
                onQuitarServicio={(id) => accion(() => quitarServicio(id))}
                onEditar={(vehiculo) =>
                  abrirModal({ tipo: "edicion", vehiculo })
                }
                onRetirar={(vehiculo) =>
                  accion(() => retirarVehiculo(vehiculo.id))
                }
              />
            ))}
          </div>
        )}
      </main>

      {modal && (
        <FormVehiculo
          modo={modal.tipo}
          inicial={modal.tipo === "edicion" ? modal.vehiculo : undefined}
          guardando={ocupado}
          error={error}
          onGuardar={guardarModal}
          onCancelar={() => setModal(null)}
        />
      )}
    </div>
  );
}
