// Llamadas a la API del taller.
// Las rutas son relativas a propósito: en dev las redirige el proxy de Vite y
// en producción salen del mismo servidor que sirve el front, así que no hay
// ninguna IP hardcodeada que haya que cambiar si cambia la máquina del taller.
import { borrarPin, leerPin } from "./sesion";
import type { EstadoServicio, TipoServicio, Vehiculo } from "./types";

// Error 401: el PIN no sirve (o venció). Las vistas lo usan para volver al login.
export class NoAutorizado extends Error {}

// El server respondió con un error y un mensaje para mostrar tal cual (ej. un
// dato mal o "Demasiados intentos. Probá de nuevo en 3 min.").
export class ErrorApi extends Error {}

export async function obtenerVehiculos(): Promise<Vehiculo[]> {
  const res = await fetch("/api/vehiculos");
  if (!res.ok) {
    throw new Error(`La API respondió ${res.status}`);
  }
  return res.json();
}

// Lista para /admin y /taller: incluye también los terminados que /display
// esconde. Manda el PIN para que el server incluya el celular del cliente. Si
// el PIN ya no sirve (ej. lo cambiaron desde otra tablet) es 401 como en las
// escrituras: se borra y se vuelve al login, así no se sigue pidiendo la lista
// con un PIN malo (cada pedido cuenta para el bloqueo de intentos).
export async function obtenerVehiculosAdmin(): Promise<Vehiculo[]> {
  const res = await fetch("/api/vehiculos?todos=1", {
    headers: { "x-pin": leerPin() ?? "" },
  });
  if (!res.ok) await lanzarError(res);
  return res.json();
}

// Resultado del login: bien, PIN mal, o dispositivo bloqueado por demasiados
// intentos (con el mensaje del server, que dice cuántos minutos faltan).
export type ResultadoLogin =
  | { ok: true }
  | { ok: false; bloqueado: boolean; mensaje: string };

// Valida el PIN contra el servidor (sin guardarlo: eso lo decide quien llama).
export async function login(pin: string): Promise<ResultadoLogin> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (res.ok) return { ok: true };
  const detalle = await res.json().catch(() => null);
  return res.status === 429
    ? { ok: false, bloqueado: true, mensaje: detalle?.error ?? "Demasiados intentos." }
    : { ok: false, bloqueado: false, mensaje: "PIN incorrecto" };
}

export interface DatosVehiculo {
  marca: string;
  modelo: string;
  color: string;
  matricula: string;
  // Celular tal como lo escribió el trabajador ("" = sin celular). El server
  // lo valida y lo guarda normalizado; vacío en una edición lo borra.
  telefono: string;
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
// Los errores, como en lanzarError.
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

  if (!res.ok) await lanzarError(res);
}

// Respuesta con error de un pedido con PIN. 401 => limpia la sesión y lanza
// NoAutorizado. Otro error (400 de datos, 429 por demasiados intentos) => lanza
// ErrorApi con el mensaje del server, para mostrárselo al trabajador (ej. "Un
// auto no puede quedar sin servicios..."); el 429 NO desloguea.
async function lanzarError(res: Response): Promise<never> {
  if (res.status === 401) {
    borrarPin();
    throw new NoAutorizado("Sesión vencida: volvé a ingresar el PIN.");
  }
  const detalle = await res.json().catch(() => null);
  throw new ErrorApi(detalle?.error ?? `La API respondió ${res.status}`);
}
