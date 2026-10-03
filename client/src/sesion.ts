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

// Sesión de /reportes (el dueño): su PIN va en otra clave, NUNCA mezclado con
// el de /admin. Y en sessionStorage, no en localStorage: la PC o la tablet
// donde mira los reportes la usan también los vendedores, así que al cerrar la
// pestaña o el navegador /reportes vuelve a pedir el PIN.
const CLAVE_REPORTES = "taller_pin_reportes";

export function guardarPinReportes(pin: string): void {
  sessionStorage.setItem(CLAVE_REPORTES, pin);
}

export function leerPinReportes(): string | null {
  return sessionStorage.getItem(CLAVE_REPORTES);
}

export function borrarPinReportes(): void {
  sessionStorage.removeItem(CLAVE_REPORTES);
}
