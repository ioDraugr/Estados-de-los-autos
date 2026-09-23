// Formas de mandar los avisos por WhatsApp. El despachador (avisos.ts) no sabe
// cómo sale el mensaje: solo llama a `enviar`. Así se puede cambiar el envío
// (consola, WhatsApp real, más adelante la API oficial) sin tocar la cola.

export interface Enviador {
  nombre: string;
  // Manda `texto` al celular (formato "+5989XXXXXXX"). Si no pudo, tira un
  // error: el despachador lo cuenta como intento fallido y reintenta más tarde.
  enviar(telefono: string, texto: string): Promise<void>;
}

// No manda nada: imprime el mensaje en la consola del server. Sirve para probar
// la cola de avisos sin escribirle a nadie.
export const enviadorLog: Enviador = {
  nombre: "log",
  async enviar(telefono, texto) {
    console.log(`[aviso] → ${telefono}: ${texto}`);
  },
};

/**
 * Elige el envío según la env var AVISOS_ENVIO (default "log"). Por ahora es el
 * único que hay; cualquier otro valor avisa y cae en "log".
 */
export function elegirEnviador(): Enviador {
  const pedido = (process.env.AVISOS_ENVIO ?? "log").trim().toLowerCase();
  if (pedido !== "log") {
    console.warn(
      `AVISOS_ENVIO="${pedido}" no existe todavía; se usa "log" (los avisos solo se imprimen en la consola).`,
    );
  }
  return enviadorLog;
}
