// Límite de intentos de PIN por dispositivo: 5 PIN mal seguidos desde la misma
// IP => esa IP queda bloqueada 5 minutos. Mientras dura el bloqueo se rechaza
// TODO intento, aunque traiga el PIN correcto (si no, el bloqueo no frena nada).
// Un PIN bien vuelve la cuenta a cero; cuando el bloqueo vence, también.
//
// Vive en memoria: si el server se reinicia, se borra (decisión del usuario).
//
// OJO con Docker Desktop (Windows/Mac): puede que el server no vea la IP real
// de cada dispositivo sino la de la red interna de Docker, igual para todos. En
// ese caso el bloqueo corre para todos los dispositivos a la vez. Con Docker en
// Linux o sin Docker, cada dispositivo tiene su IP y se bloquea solo él.

export const MAX_FALLIDOS = 5;
export const MINUTOS_BLOQUEO = 5;
// Una IP con fallos pero sin bloqueo se olvida tras este tiempo sin intentos
// nuevos (así el mapa no crece para siempre).
export const MINUTOS_OLVIDO = 60;

const MS_MINUTO = 60 * 1000;

interface Registro {
  fallidos: number;
  // Hasta cuándo está bloqueada (ms). null = no está bloqueada.
  bloqueadoHasta: number | null;
  ultimoIntento: number;
}

export type EstadoIntentos =
  | { bloqueado: false }
  | { bloqueado: true; minutosRestantes: number };

export interface LimitadorPin {
  // ¿Está bloqueada esta IP ahora?
  consultar(ip: string): EstadoIntentos;
  // Anota un PIN mal. Devuelve el estado después de anotarlo (el quinto ya
  // devuelve bloqueado).
  registrarFallo(ip: string): EstadoIntentos;
  // Anota un PIN bien: la cuenta vuelve a cero.
  registrarExito(ip: string): void;
  // Cuántas IPs tiene anotadas (para los tests de limpieza).
  cantidad(): number;
}

/**
 * Crea un limitador. `reloj` devuelve la hora en ms: los tests pasan uno de
 * mentira para no tener que esperar 5 minutos de verdad.
 */
export function crearLimitador(reloj: () => number = Date.now): LimitadorPin {
  const registros = new Map<string, Registro>();

  // Borra las IPs cuyo bloqueo ya venció y las que hace rato no prueban.
  function limpiar(ahora: number): void {
    for (const [ip, registro] of registros) {
      const vencido =
        registro.bloqueadoHasta !== null && registro.bloqueadoHasta <= ahora;
      const olvidado =
        registro.bloqueadoHasta === null &&
        ahora - registro.ultimoIntento >= MINUTOS_OLVIDO * MS_MINUTO;
      if (vencido || olvidado) registros.delete(ip);
    }
  }

  function estado(ip: string, ahora: number): EstadoIntentos {
    const registro = registros.get(ip);
    if (!registro || registro.bloqueadoHasta === null) return { bloqueado: false };
    if (registro.bloqueadoHasta <= ahora) {
      // Venció el bloqueo: arranca de cero.
      registros.delete(ip);
      return { bloqueado: false };
    }
    return {
      bloqueado: true,
      minutosRestantes: Math.ceil((registro.bloqueadoHasta - ahora) / MS_MINUTO),
    };
  }

  return {
    consultar(ip) {
      return estado(ip, reloj());
    },
    registrarFallo(ip) {
      const ahora = reloj();
      limpiar(ahora);
      const actual = estado(ip, ahora);
      // Ya bloqueada: no se suma nada (el bloqueo no se estira).
      if (actual.bloqueado) return actual;
      const registro = registros.get(ip) ?? {
        fallidos: 0,
        bloqueadoHasta: null,
        ultimoIntento: ahora,
      };
      registro.fallidos += 1;
      registro.ultimoIntento = ahora;
      if (registro.fallidos >= MAX_FALLIDOS) {
        registro.bloqueadoHasta = ahora + MINUTOS_BLOQUEO * MS_MINUTO;
      }
      registros.set(ip, registro);
      return estado(ip, ahora);
    },
    registrarExito(ip) {
      registros.delete(ip);
    },
    cantidad() {
      return registros.size;
    },
  };
}
