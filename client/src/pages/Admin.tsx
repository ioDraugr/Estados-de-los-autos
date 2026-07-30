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
import { AdminTarjeta } from "../components/AdminTarjeta";
import { FormVehiculo } from "../components/FormVehiculo";
import { PinLogin } from "../components/PinLogin";

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
    <div className="min-h-full bg-zinc-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-zinc-800 px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
          Taller ML Center · Admin
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setModal({ tipo: "alta" })}
            disabled={ocupado}
            className="rounded-2xl bg-green-600 px-5 py-3 text-lg font-bold text-white active:scale-95 disabled:opacity-50 sm:text-xl"
          >
            + Nuevo auto
          </button>
          <button
            type="button"
            onClick={salir}
            className="rounded-2xl bg-zinc-700 px-5 py-3 text-lg font-bold text-white active:scale-95 sm:text-xl"
          >
            Salir
          </button>
        </div>
      </header>

      {error && (
        <p className="bg-red-600 px-4 py-3 text-center text-lg font-bold text-white sm:px-8 sm:text-xl">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="p-10 text-center text-2xl text-zinc-400 sm:p-16">Cargando…</p>
      ) : vehiculos.length === 0 ? (
        <p className="p-10 text-center text-2xl text-zinc-400 sm:p-16">
          No hay autos en el taller. Tocá “+ Nuevo auto” para agregar uno.
        </p>
      ) : (
        <main className="grid grid-cols-1 gap-4 p-4 sm:gap-6 sm:p-8 lg:grid-cols-2 xl:grid-cols-3">
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
              onRetirar={(vehiculo) => accion(() => retirarVehiculo(vehiculo.id))}
            />
          ))}
        </main>
      )}

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
