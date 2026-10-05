// Vista /taller: para los trabajadores del taller. SOLO cambian el estado de cada
// servicio (esperando / en proceso / terminado). Sin alta, editar, agregar/quitar
// servicios ni retirar (eso es /admin).
//
// Reusa el login por PIN de /admin (mismo PIN, misma clave de localStorage, así la
// tablet del taller se loguea una sola vez) y se actualiza en vivo como /display:
// escucha el evento de Socket.IO y refetchea, con un poll de 30 s de respaldo.
// Tablero por estado de TRABAJOS (un servicio de un auto), con filtro de área
// guardado en la tablet y aviso para deshacer el último cambio.
import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  ErrorApi,
  NoAutorizado,
  cambiarEstadoServicio,
  obtenerVehiculosAdmin,
} from "../api";
import { borrarPin, leerPin } from "../sesion";
import type { EstadoServicio, TipoServicio, Vehiculo } from "../types";
import { NOMBRE_AREA, NOMBRE_ESTADO } from "../dominio";
import { PinLogin } from "../components/PinLogin";
import { TallerAvisoDeshacer } from "../components/TallerAvisoDeshacer";
import type { AvisoDeshacer } from "../components/TallerAvisoDeshacer";
import { TallerCabecera } from "../components/TallerCabecera";
import { TallerEleccionModo } from "../components/TallerEleccionModo";
import { TallerFiltroArea } from "../components/TallerFiltroArea";
import { TallerGeneral } from "../components/TallerGeneral";
import { TallerSectores } from "../components/TallerSectores";
import { TallerTablero } from "../components/TallerTablero";
import {
  armarTablero,
  guardarArea,
  leerArea,
  type Toque,
  type Trabajo,
} from "../components/tallerTablero";

// Pantallas: elegir modo (siempre al entrar, no se guarda), General (tarjeta por
// auto), elegir sector y el tablero por estado de un sector.
type Pantalla = "eleccion" | "general" | "sector-eleccion" | "sector";

// Poll de respaldo por si el socket se pierde algún evento.
const MS_REFRESCO = 30_000;

export function Taller() {
  const [logueado, setLogueado] = useState(() => leerPin() !== null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  // Aviso de arriba: sin conexión (reintentando), o el mensaje de error del
  // server (ej. 429 por demasiados intentos, que no es un problema de conexión).
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [socketConectado, setSocketConectado] = useState(true);
  const [pantalla, setPantalla] = useState<Pantalla>("eleccion");
  // Sector del modo "Por sector". Lo guardado solo resalta la opción en la
  // pantalla de elección de sector.
  const [area, setArea] = useState<TipoServicio | null>(leerArea);
  // Último servicio tocado: su tarjeta destella un instante.
  const [toque, setToque] = useState<Toque | null>(null);
  // Último cambio, para ofrecer deshacerlo unos segundos.
  const [deshacer, setDeshacer] = useState<
    (AvisoDeshacer & { servicioId: number; previo: EstadoServicio }) | null
  >(null);

  const tablero = useMemo(
    () => armarTablero(vehiculos, area),
    [vehiculos, area],
  );

  // 401 (PIN viejo) => volver al login, que corta el poll y el socket.
  const cargar = useCallback(async () => {
    try {
      setVehiculos(await obtenerVehiculosAdmin());
      setAviso(null);
    } catch (e) {
      if (e instanceof NoAutorizado) {
        setLogueado(false);
      } else {
        setAviso(avisoDeError(e));
      }
    } finally {
      setCargando(false);
    }
  }, []);

  // Datos + tiempo real (mismo patrón que /display). Solo cuando hay sesión.
  useEffect(() => {
    if (!logueado) return;

    cargar();
    const id = setInterval(cargar, MS_REFRESCO);

    const socket = io();
    const alConectar = () => {
      setSocketConectado(true);
      cargar();
    };
    const alDesconectar = () => setSocketConectado(false);
    socket.on("vehiculos:cambio", cargar);
    socket.on("connect", alConectar);
    socket.on("disconnect", alDesconectar);

    return () => {
      clearInterval(id);
      socket.disconnect();
    };
  }, [logueado, cargar]);

  const claveToque = toque?.clave;
  useEffect(() => {
    if (claveToque === undefined) return;
    const id = setTimeout(() => setToque(null), 900);
    return () => clearTimeout(id);
  }, [claveToque]);

  // Cambia el estado de un servicio. El evento del server hace que el cambio
  // (propio y de otras tablets) aparezca solo; igual refetcheamos por las dudas.
  // Devuelve si salió bien.
  async function aplicar(servicioId: number, estado: EstadoServicio) {
    setOcupado(true);
    try {
      await cambiarEstadoServicio(servicioId, estado);
      await cargar();
      return true;
    } catch (e) {
      if (e instanceof NoAutorizado) {
        setLogueado(false);
      } else {
        setAviso(avisoDeError(e));
      }
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function cambiar(trabajo: Trabajo, estado: EstadoServicio) {
    const { vehiculo: v, servicio: s } = trabajo;
    const previo = s.estado;
    const ok = await aplicar(s.id, estado);
    if (ok) {
      setToque({ servicioId: s.id, clave: Date.now() });
      setDeshacer({
        clave: Date.now(),
        servicioId: s.id,
        previo,
        texto: `${NOMBRE_AREA[s.tipo]} de ${v.marca} ${v.modelo} → ${NOMBRE_ESTADO[estado]}`,
      });
    }
  }

  async function deshacerUltimo() {
    if (!deshacer) return;
    const { servicioId, previo } = deshacer;
    setDeshacer(null);
    if (await aplicar(servicioId, previo)) {
      setToque({ servicioId, clave: Date.now() });
    }
  }

  const cerrarDeshacer = useCallback(() => setDeshacer(null), []);

  function elegirArea(a: TipoServicio) {
    setArea(a);
    guardarArea(a);
  }

  // Cambiar de pantalla descarta el aviso de deshacer.
  function ir(p: Pantalla) {
    setDeshacer(null);
    setPantalla(p);
  }

  function salir() {
    borrarPin();
    setLogueado(false);
    setVehiculos([]);
    setDeshacer(null);
    setPantalla("eleccion");
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

  const enVivo = socketConectado && !aviso?.reintentando;

  return (
    <div className="flex min-h-dvh flex-col bg-con-fondo tracking-[-0.01em] text-con-texto">
      <TallerCabecera
        enVivo={enVivo}
        onSalir={salir}
        onCambiarModo={
          pantalla === "eleccion" ? undefined : () => ir("eleccion")
        }
      />

      {/* Espacio abajo: el aviso de deshacer no tapa las acciones. */}
      <main className="flex flex-col gap-4 px-3 pt-4 pb-32 sm:px-6 sm:pt-6">
        {aviso && !aviso.reintentando && (
          <p
            role="alert"
            className="rounded-sm border border-con-peligro/60 bg-con-peligro/10 px-4 py-3 text-lg font-medium text-[#8f1d17]"
          >
            {aviso.texto}
          </p>
        )}

        {/* key: cada pantalla entra con su fade + deslizamiento corto. */}
        <div key={pantalla} className="con-anim-entrada flex flex-col gap-4">
          {pantalla === "eleccion" ? (
            <TallerEleccionModo
              onElegir={(m) =>
                ir(m === "general" ? "general" : "sector-eleccion")
              }
            />
          ) : cargando ? (
            <p className="p-10 text-center text-xl text-con-suave sm:p-16">
              Cargando…
            </p>
          ) : pantalla === "general" ? (
            <TallerGeneral
              vehiculos={vehiculos}
              toque={toque}
              ocupado={ocupado}
              onCambiar={cambiar}
            />
          ) : pantalla === "sector-eleccion" || !area || !tablero ? (
            <TallerSectores
              vehiculos={vehiculos}
              ultimo={area}
              onElegir={(a) => {
                elegirArea(a);
                ir("sector");
              }}
            />
          ) : (
            <>
              <TallerFiltroArea area={area} onArea={elegirArea} />
              <TallerTablero
                key={area}
                tablero={tablero}
                area={area}
                toque={toque}
                ocupado={ocupado}
                onCambiar={cambiar}
              />
            </>
          )}
        </div>
      </main>

      <TallerAvisoDeshacer
        aviso={deshacer}
        ocupado={ocupado}
        onDeshacer={deshacerUltimo}
        onCerrar={cerrarDeshacer}
      />
    </div>
  );
}

interface Aviso {
  texto: string;
  reintentando: boolean;
}

// Aviso para un error que no es de PIN: el mensaje del server si lo hay (ej.
// demasiados intentos) o, si no respondió, sin conexión (y reintentando).
function avisoDeError(e: unknown): Aviso {
  return e instanceof ErrorApi
    ? { texto: e.message, reintentando: false }
    : {
        texto: "Sin conexión con el servidor — reintentando…",
        reintentando: true,
      };
}
