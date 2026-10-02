// Llamadas a la API del taller.
// Las rutas son relativas a propósito: en dev las redirige el proxy de Vite y
// en producción salen del mismo servidor que sirve el front, así que no hay
// ninguna IP hardcodeada que haya que cambiar si cambia la máquina del taller.
import { borrarPin, leerPin } from "./sesion";
import type {
  DatosConfig,
  EstadoBackups,
  EstadoServicio,
  TipoServicio,
  Vehiculo,
} from "./types";

// Error 401: el PIN no sirve (o venció). Las vistas lo usan para volver al login.
export class NoAutorizado extends Error {}

// El server respondió con un error y un mensaje para mostrar tal cual (ej. un
// dato mal o "Demasiados intentos. Probá de nuevo en 3 min.").
export class ErrorApi extends Error {}

// Texto para el trabajador de un error que no es de sesión: el mensaje del
// server si respondió (ErrorApi) o, si no, que no hay conexión.
export function textoDeError(e: unknown): string {
  return e instanceof ErrorApi ? e.message : "No se pudo conectar con el servidor.";
}

export async function obtenerVehiculos(): Promise<Vehiculo[]> {
  const res = await fetch("/api/vehiculos");
  if (!res.ok) {
    throw new Error(`La API respondió ${res.status}`);
  }
  return res.json();
}

// Frases de la bienvenida del showroom (públicas, sin PIN). Lo único de la
// configuración que ve /display.
export async function obtenerFrases(): Promise<string[]> {
  const res = await fetch("/api/frases");
  if (!res.ok) {
    throw new Error(`La API respondió ${res.status}`);
  }
  const { frases } = (await res.json()) as { frases: string[] };
  return frases;
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
// intentos (con el mensaje del server y cuántos minutos faltan, si los dice).
export type ResultadoLogin =
  | { ok: true }
  | { ok: false; bloqueado: false; mensaje: string }
  | { ok: false; bloqueado: true; mensaje: string; minutosRestantes: number | null };

// Valida el PIN contra el servidor (sin guardarlo: eso lo decide quien llama).
export async function login(pin: string): Promise<ResultadoLogin> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (res.ok) return { ok: true };
  const detalle = await res.json().catch(() => null);
  if (res.status === 429) {
    const minutos = detalle?.minutosRestantes;
    return {
      ok: false,
      bloqueado: true,
      mensaje: detalle?.error ?? "Demasiados intentos.",
      minutosRestantes: typeof minutos === "number" ? minutos : null,
    };
  }
  return { ok: false, bloqueado: false, mensaje: "PIN incorrecto" };
}

export interface DatosVehiculo {
  marca: string;
  modelo: string;
  color: string;
  matricula: string;
  // Celular tal como lo escribió el trabajador ("" = sin celular). El server
  // lo valida y lo guarda normalizado; vacío en una edición lo borra.
  telefono: string;
  // Casilla "Acepta recibir mensajes por WhatsApp" (post-venta).
  acepta_whatsapp: boolean;
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

// --- Configuración (/admin → Configuración) ---

// Ajustes editables y estado de los backups.
export async function obtenerConfig(): Promise<DatosConfig> {
  const res = await fetch("/api/config", {
    headers: { "x-pin": leerPin() ?? "" },
  });
  if (!res.ok) await lanzarError(res);
  return res.json();
}

// Guarda ajustes ({ clave: valor }). Devuelve la configuración ya actualizada.
export async function guardarAjustes(
  cambios: Record<string, number | boolean | string | string[]>,
): Promise<DatosConfig> {
  const res = await escribir("/api/config", "PATCH", cambios);
  return res.json();
}

// "Hacer backup ahora". Devuelve el estado de los backups con el nuevo.
export async function hacerBackup(): Promise<EstadoBackups> {
  const res = await escribir("/api/backups", "POST");
  return res.json();
}

// Cambia el PIN compartido de /admin y /taller. Ojo con el 401: acá casi
// siempre quiere decir que el trabajador escribió mal el PIN *actual* (el del
// header sigue sirviendo), así que es un ErrorApi para mostrar en el campo y NO
// desloguea. Solo si el 401 es del header (el PIN guardado ya no sirve, ej. lo
// cambiaron desde otra tablet) se vuelve al login como en el resto.
export async function cambiarPin(actual: string, nuevo: string): Promise<void> {
  const res = await fetch("/api/config/pin", {
    method: "POST",
    headers: { "x-pin": leerPin() ?? "", "content-type": "application/json" },
    body: JSON.stringify({ actual, nuevo }),
  });
  if (res.ok) return;
  if (res.status === 401) {
    const detalle = await res.json().catch(() => null);
    // motivo "pin_actual": ver cambiarPin en server/src/auth.ts.
    if (detalle?.motivo === "pin_actual") throw new ErrorApi(`${detalle.error}.`);
  }
  // 401 del header => NoAutorizado (lanzarError no vuelve a leer el cuerpo en
  // ese caso); 429 o 400 (PIN nuevo que no sirve) => ErrorApi con su mensaje.
  await lanzarError(res);
}

// --- Interno ---

// Hace un request que modifica datos, adjuntando el PIN en el header x-pin.
// Los errores, como en lanzarError. Devuelve la respuesta (ya chequeada) para
// quien necesite leer el cuerpo.
async function escribir(
  ruta: string,
  metodo: "POST" | "PATCH" | "DELETE",
  cuerpo?: unknown,
): Promise<Response> {
  const res = await fetch(ruta, {
    method: metodo,
    headers: {
      "x-pin": leerPin() ?? "",
      ...(cuerpo !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });

  if (!res.ok) await lanzarError(res);
  return res;
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
