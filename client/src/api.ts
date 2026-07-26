// Llamadas a la API del taller.
// Las rutas son relativas a propósito: en dev las redirige el proxy de Vite y
// en producción salen del mismo servidor que sirve el front, así que no hay
// ninguna IP hardcodeada que haya que cambiar si cambia la máquina del taller.
import type { Vehiculo } from "./types";

export async function obtenerVehiculos(): Promise<Vehiculo[]> {
  const res = await fetch("/api/vehiculos");
  if (!res.ok) {
    throw new Error(`La API respondió ${res.status}`);
  }
  return res.json();
}
