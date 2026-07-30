// Sesión de /admin en la tablet. Guardamos el PIN en localStorage para que la
// tablet del taller quede logueada aunque se cierre y reabra el navegador; se
// desloguea a mano con el botón "Salir".
const CLAVE = "taller_pin";

export function guardarPin(pin: string): void {
  localStorage.setItem(CLAVE, pin);
}

export function leerPin(): string | null {
  return localStorage.getItem(CLAVE);
}

export function borrarPin(): void {
  localStorage.removeItem(CLAVE);
}
