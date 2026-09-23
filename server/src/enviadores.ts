// Formas de mandar los avisos por WhatsApp. El despachador (avisos.ts) no sabe
// cómo sale el mensaje: solo llama a `enviar`. Así se puede cambiar el envío
// (consola, WhatsApp real, más adelante la API oficial) sin tocar la cola.

export interface Enviador {
  nombre: string;
  // ¿Puede mandar ahora mismo? (por ejemplo: WhatsApp conectado y vinculado).
  // Si el envío no lo define, se asume que siempre puede. Mientras dé false, el
  // despachador no toca la cola: los avisos esperan sin gastar intentos.
  listo?(): boolean;
  // Manda `texto` al celular (formato "+5989XXXXXXX"). Si no pudo, tira un
  // error: el despachador lo cuenta como intento fallido y reintenta más tarde.
  // Si tira un ErrorDefinitivo, no se reintenta.
  enviar(telefono: string, texto: string): Promise<void>;
}

// Falla que no se arregla reintentando (por ejemplo: el número no tiene
// WhatsApp). El despachador marca el aviso como "fallido" de una.
export class ErrorDefinitivo extends Error {}

// No manda nada: imprime el mensaje en la consola del server. Sirve para probar
// la cola de avisos sin escribirle a nadie.
export const enviadorLog: Enviador = {
  nombre: "log",
  async enviar(telefono, texto) {
    console.log(`[aviso] → ${telefono}: ${texto}`);
  },
};

/**
 * Elige el envío según la env var AVISOS_ENVIO (default "log"):
 * - "log": imprime los avisos en la consola (no le escribe a nadie);
 * - "baileys": WhatsApp real con Baileys (ver whatsapp.ts).
 * Cualquier otro valor es un error: no se cae en "log" a propósito, porque "log"
 * marca los avisos como enviados sin mandarlos (un typo en AVISOS_ENVIO haría
 * que los clientes nunca reciban nada). Sin envío válido, los avisos esperan.
 */
export async function elegirEnviador(): Promise<Enviador> {
  const pedido = (process.env.AVISOS_ENVIO ?? "log").trim().toLowerCase();
  if (pedido === "baileys") {
    // Import perezoso: en modo "log" Baileys ni se carga.
    const { crearEnviadorBaileys } = await import("./whatsapp.js");
    return crearEnviadorBaileys();
  }
  if (pedido !== "log") {
    throw new Error(
      `AVISOS_ENVIO="${pedido}" no existe. Opciones: log, baileys.`,
    );
  }
  return enviadorLog;
}
