// Vista /admin: consola oscura de los trabajadores. Login por PIN y, ya adentro,
// maestro-detalle: a la izquierda búsqueda, filtros y lista de autos; a la
// derecha el detalle del auto elegido (estado por servicio, agregar/quitar
// servicios, editar y retirar). En el celular se ve la lista y, al tocar un
// auto, el detalle ocupa la pantalla. Sin tiempo real: tras cada acción se
// vuelve a pedir la lista. Desde la cabecera se entra a Configuración (PIN,
// backups, ajustes), que se muestra clara sobre el fondo oscuro.
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { Servicio, TipoServicio, Vehiculo } from "../types";
import { NOMBRE_AREA } from "../dominio";
import {
  contarGrupos,
  filtrarVehiculos,
  type FiltroEstado,
} from "../components/consola";
import { Configuracion } from "../components/Configuracion";
import { ConsolaCabecera } from "../components/ConsolaCabecera";
import { ConsolaDetalle } from "../components/ConsolaDetalle";
import { ConsolaVentana } from "../components/ConsolaVentana";
import { ConsolaDialogo } from "../components/ConsolaDialogo";
import { ConsolaFiltros } from "../components/ConsolaFiltros";
import { ConsolaLista } from "../components/ConsolaLista";
import { ConsolaResumen } from "../components/ConsolaResumen";
import { FormVehiculo } from "../components/FormVehiculo";
import { PinLogin } from "../components/PinLogin";

type Modal = { tipo: "alta" } | { tipo: "edicion"; vehiculo: Vehiculo } | null;

// Lo que espera confirmación en el diálogo (Quitar servicio / Retirar auto).
type Confirmacion =
  | { tipo: "quitar"; servicio: Servicio; vehiculo: Vehiculo }
  | { tipo: "retirar"; vehiculo: Vehiculo }
  | null;

export function Admin() {
  const [logueado, setLogueado] = useState(() => leerPin() !== null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [vista, setVista] = useState<"autos" | "config">("autos");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [filtroArea, setFiltroArea] = useState<TipoServicio | null>(null);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  // Móvil: el detalle ocupa la pantalla (en escritorio siempre está a la derecha).
  const [detalleMovil, setDetalleMovil] = useState(false);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);

  const visibles = useMemo(
    () => filtrarVehiculos(vehiculos, busqueda, filtroEstado, filtroArea),
    [vehiculos, busqueda, filtroEstado, filtroArea],
  );
  const conteo = useMemo(() => contarGrupos(vehiculos), [vehiculos]);
  // El elegido se conserva al recargar; si ya no está, el primero de la lista.
  const seleccionado =
    vehiculos.find((v) => v.id === seleccionId) ?? visibles[0] ?? null;

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
          e instanceof ErrorApi
            ? e.message
            : "No se pudo conectar con el servidor.",
        );
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (logueado) cargar();
  }, [logueado, cargar]);

  // El PIN guardado ya no sirve (401): de vuelta al login y, al volver a
  // entrar, a la lista. Estable, porque Configuración carga según él.
  const volverAlLogin = useCallback(() => {
    setLogueado(false);
    setVista("autos");
  }, []);

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
        volverAlLogin();
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
    volverAlLogin();
    setVehiculos([]);
    setConfirmacion(null);
    setDetalleMovil(false);
  }

  // Al volver de Configuración se refresca la lista (acá no hay tiempo real).
  function volverALosAutos() {
    setVista("autos");
    cargar();
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

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("todos");
    setFiltroArea(null);
  }

  // Confirmó el diálogo. Al retirar, queda elegido el auto que seguía en la
  // lista (o el anterior si era el último).
  async function confirmar() {
    const c = confirmacion;
    if (!c) return;
    if (c.tipo === "quitar") {
      await accion(() => quitarServicio(c.servicio.id));
    } else {
      const i = visibles.findIndex((v) => v.id === c.vehiculo.id);
      const siguiente = visibles[i + 1] ?? visibles[i - 1] ?? null;
      const ok = await accion(() => retirarVehiculo(c.vehiculo.id));
      if (ok) {
        setSeleccionId(siguiente?.id ?? null);
        setDetalleMovil(false);
      }
    }
    setConfirmacion(null);
  }

  const mostrarDetalle = detalleMovil && seleccionado !== null;

  return (
    <div className="flex min-h-dvh flex-col bg-con-fondo tracking-[-0.01em] text-con-texto lg:h-dvh">
      <ConsolaCabecera
        ocupado={ocupado}
        onNuevo={() => abrirModal({ tipo: "alta" })}
        onConfiguracion={() => {
          setError(null);
          setVista("config");
        }}
        onSalir={salir}
      />

      {error && (
        <p
          role="alert"
          className="mx-3 mt-3 shrink-0 rounded-sm border border-con-peligro/60 bg-con-peligro/10 px-4 py-3 text-lg font-medium text-[#8f1d17] sm:mx-6"
        >
          {error}
        </p>
      )}

      {cargando ? (
        <p className="p-10 text-center text-xl text-con-suave sm:p-16">
          Cargando…
        </p>
      ) : vehiculos.length === 0 ? (
        <div className="p-10 text-center sm:p-16">
          <p className="text-xl text-con-suave">
            No hay autos en el taller. Tocá “+ Nuevo auto” para agregar uno.
          </p>
        </div>
      ) : (
        <>
          <div className={mostrarDetalle ? "hidden lg:block" : ""}>
            <ConsolaResumen
              conteo={conteo}
              filtro={filtroEstado}
              onFiltro={setFiltroEstado}
            />
          </div>

          <main className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(380px,5fr)_7fr]">
            <section
              aria-label="Lista de autos"
              className={`min-h-0 flex-col lg:flex lg:overflow-y-auto lg:border-r lg:border-con-borde ${
                mostrarDetalle ? "hidden" : "flex"
              }`}
            >
              <div className="flex flex-col gap-4 p-3 sm:p-6 lg:p-4">
                <ConsolaFiltros
                  busqueda={busqueda}
                  onBusqueda={setBusqueda}
                  estado={filtroEstado}
                  onEstado={setFiltroEstado}
                  area={filtroArea}
                  onArea={setFiltroArea}
                />
                <p
                  className="text-sm text-con-suave tabular-nums"
                  aria-live="polite"
                >
                  {visibles.length === vehiculos.length
                    ? `${vehiculos.length} ${vehiculos.length === 1 ? "auto" : "autos"}`
                    : `${visibles.length} de ${vehiculos.length} autos`}
                  {filtroArea ? ` · ${NOMBRE_AREA[filtroArea]}` : ""}
                </p>
                {visibles.length === 0 ? (
                  <div className="rounded-sm border border-con-borde bg-con-sup p-8 text-center">
                    <p className="text-lg text-con-suave">
                      Ningún auto coincide con la búsqueda.
                    </p>
                    <button
                      type="button"
                      onClick={limpiarFiltros}
                      className="con-foco mt-4 min-h-12 rounded-sm border border-con-borde-fuerte px-5 text-base font-medium text-con-texto hover:bg-con-sup2"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                ) : (
                  <ConsolaLista
                    vehiculos={visibles}
                    seleccionadoId={seleccionado?.id ?? null}
                    ocupado={ocupado}
                    onSeleccionar={(id) => {
                      setSeleccionId(id);
                      setDetalleMovil(true);
                    }}
                    onAvanzar={(servicio, estado) =>
                      accion(() => cambiarEstadoServicio(servicio.id, estado))
                    }
                  />
                )}
              </div>
            </section>

            <section
              aria-label="Detalle del auto"
              className={`min-h-0 lg:block lg:overflow-y-auto ${
                mostrarDetalle ? "block" : "hidden"
              }`}
            >
              {seleccionado ? (
                <ConsolaDetalle
                  key={seleccionado.id}
                  vehiculo={seleccionado}
                  ocupado={ocupado}
                  onVolver={() => setDetalleMovil(false)}
                  onCambiarEstado={(id, estado) =>
                    accion(() => cambiarEstadoServicio(id, estado))
                  }
                  onAgregarServicio={(vehiculoId, tipo) =>
                    accion(() => agregarServicio(vehiculoId, tipo))
                  }
                  onQuitarServicio={(servicio) =>
                    setConfirmacion({
                      tipo: "quitar",
                      servicio,
                      vehiculo: seleccionado,
                    })
                  }
                  onEditar={(vehiculo) =>
                    abrirModal({ tipo: "edicion", vehiculo })
                  }
                  onRetirar={(vehiculo) =>
                    setConfirmacion({ tipo: "retirar", vehiculo })
                  }
                />
              ) : (
                <p className="p-10 text-center text-lg text-con-suave">
                  Elegí un auto de la lista para ver su detalle.
                </p>
              )}
            </section>
          </main>
        </>
      )}

      {vista === "config" && (
        <ConsolaVentana titulo="Configuración" onCerrar={volverALosAutos}>
          <Configuracion
            enVentana
            onVolver={volverALosAutos}
            onNoAutorizado={volverAlLogin}
          />
        </ConsolaVentana>
      )}

      {confirmacion && (
        <ConsolaDialogo
          titulo={
            confirmacion.tipo === "quitar"
              ? `¿Quitar ${NOMBRE_AREA[confirmacion.servicio.tipo]}?`
              : "¿Retirar este auto?"
          }
          texto={
            confirmacion.tipo === "quitar"
              ? `Se saca ${NOMBRE_AREA[confirmacion.servicio.tipo]} de ${confirmacion.vehiculo.marca} ${confirmacion.vehiculo.modelo}.`
              : `${confirmacion.vehiculo.marca} ${confirmacion.vehiculo.modelo} (${confirmacion.vehiculo.matricula}) sale de la lista del taller.`
          }
          confirmar={
            confirmacion.tipo === "quitar" ? "Quitar servicio" : "Retirar auto"
          }
          ocupado={ocupado}
          onConfirmar={confirmar}
          onCancelar={() => setConfirmacion(null)}
        />
      )}

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
