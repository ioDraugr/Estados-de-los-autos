// Vista /admin: panel de los trabajadores. Login por PIN y, ya adentro, alta de
// autos, cambio de estado por servicio, agregar/quitar servicios y retirar autos.
// Fase 3: sin tiempo real; tras cada acción se vuelve a pedir la lista.
import { useCallback, useEffect, useState } from "react";
import {
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
import {
  AVISO_ERROR,
  BOTON_MARCA,
  BOTON_OSCURO,
  TEXTO_VACIO,
} from "../tema";
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

  const cargar = useCallback(async () => {
    try {
      setVehiculos(await obtenerVehiculosAdmin());
      setError(null);
    } catch {
      setError("No se pudo conectar con el servidor.");
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

  async function guardarModal(datos: DatosVehiculo, servicios: TipoServicio[]) {
    const ok = await accion(() =>
      modal?.tipo === "edicion"
        ? editarVehiculo(modal.vehiculo.id, datos)
        : crearVehiculo(datos, servicios),
    );
    if (ok) setModal(null);
  }

  return (
    <div className="min-h-full bg-crema">
      <CabeceraCurva
        alto="compacta"
        acciones={
          <>
            <button
              type="button"
              onClick={() => setModal({ tipo: "alta" })}
              disabled={ocupado}
              className={`${BOTON_MARCA} px-4 py-2 text-base sm:px-5 sm:py-3 sm:text-xl`}
            >
              + Nuevo auto
            </button>
            <button
              type="button"
              onClick={salir}
              className={`${BOTON_OSCURO} px-4 py-2 text-base sm:px-5 sm:py-3 sm:text-xl`}
            >
              Salir
            </button>
          </>
        }
      />

      <main className="px-4 py-6 sm:px-8 sm:py-8">
        {error && (
          <p
            className={`${AVISO_ERROR} mb-5 rounded-2xl px-4 py-3 text-lg sm:mb-6 sm:text-xl`}
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
          <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-7 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
                onEditar={(vehiculo) => setModal({ tipo: "edicion", vehiculo })}
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
          onGuardar={guardarModal}
          onCancelar={() => setModal(null)}
        />
      )}
    </div>
  );
}
