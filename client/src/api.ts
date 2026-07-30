// Llamadas a la API del taller.
// Las rutas son relativas a propósito: en dev las redirige el proxy de Vite y
// en producción salen del mismo servidor que sirve el front, así que no hay
// ninguna IP hardcodeada que haya que cambiar si cambia la máquina del taller.
import { borrarPin, leerPin } from "./sesion";
import type { EstadoServicio, TipoServicio, Vehiculo } from "./types";

// Error 401: el PIN no sirve (o venció). Las vistas lo usan para volver al login.
export class NoAutorizado extends Error {}

export async function obtenerVehiculos(): Promise<Vehiculo[]> {
  const res = await fetch("/api/vehiculos");
  if (!res.ok) {
    throw new Error(`La API respondió ${res.status}`);
  }
  return res.json();
}

// Lista para /admin: incluye también los terminados que /display esconde.
export async function obtenerVehiculosAdmin(): Promise<Vehiculo[]> {
  const res = await fetch("/api/vehiculos?todos=1");
  if (!res.ok) {
    throw new Error(`La API respondió ${res.status}`);
  }
  return res.json();
}

// Valida el PIN contra el servidor (sin guardarlo: eso lo decide quien llama).
export async function login(pin: string): Promise<boolean> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  return res.ok;
}

export interface DatosVehiculo {
  marca: string;
  modelo: string;
  color: string;
  matricula: string;
}

export async function crearVehiculo(
  datos: DatosVehiculo,
  servicios: TipoServicio[],
): Promise<void> {
  await escribir("/api/vehiculos", "POST", { ...datos, servicios });
}

export async function editarVehiculo(
  id: number,
  datos: DatosVehiculo,
): Promise<void> {
  await escribir(`/api/vehiculos/${id}`, "PATCH", datos);
}

export async function retirarVehiculo(id: number): Promise<void> {
  await escribir(`/api/vehiculos/${id}/retirar`, "POST");
}

export async function agregarServicio(
  vehiculoId: number,
  tipo: TipoServicio,
): Promise<void> {
  await escribir(`/api/vehiculos/${vehiculoId}/servicios`, "POST", { tipo });
}

export async function cambiarEstadoServicio(
  id: number,
  estado: EstadoServicio,
): Promise<void> {
  await escribir(`/api/servicios/${id}`, "PATCH", { estado });
}

export async function quitarServicio(id: number): Promise<void> {
  await escribir(`/api/servicios/${id}`, "DELETE");
}

// --- Interno ---

// Hace un request que modifica datos, adjuntando el PIN en el header x-pin.
// Si el server responde 401 limpia la sesión y lanza NoAutorizado; ante otro
// error de datos (400) lanza un Error con el mensaje que mandó el server, para
// mostrárselo al trabajador (ej. "Un auto no puede quedar sin servicios...").
async function escribir(
  ruta: string,
  metodo: "POST" | "PATCH" | "DELETE",
  cuerpo?: unknown,
): Promise<void> {
  const res = await fetch(ruta, {
    method: metodo,
    headers: {
      "x-pin": leerPin() ?? "",
      ...(cuerpo !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });

  if (res.ok) return;

  if (res.status === 401) {
    borrarPin();
    throw new NoAutorizado("Sesión vencida: volvé a ingresar el PIN.");
  }

  const detalle = await res.json().catch(() => null);
  throw new Error(detalle?.error ?? `La API respondió ${res.status}`);
}
