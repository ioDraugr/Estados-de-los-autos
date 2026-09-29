// Envío real de los avisos por WhatsApp con Baileys. Baileys es una librería NO
// oficial: se conecta como WhatsApp Web, o sea como un "dispositivo vinculado"
// del celular del taller (se vincula una vez escaneando un QR). Se carga por
// defecto (AVISOS_ENVIO=baileys, ver enviadores.ts); con AVISOS_ENVIO=log nada
// de esto corre.
// Necesita internet en la máquina del server; el resto de la app no.
import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeWASocket,
  useMultiFileAuthState,
  type proto,
  type WASocket,
} from "baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { ErrorDefinitivo, type Enviador } from "./enviadores.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carpeta con la sesión de WhatsApp: son las CREDENCIALES del dispositivo
// vinculado (con esos archivos cualquiera manda mensajes como ese número). Está
// en .gitignore. Por defecto server/data/whatsapp-sesion; se cambia con la env
// var WHATSAPP_SESION_DIR. Borrarla = desvincular.
const CARPETA_SESION = process.env.WHATSAPP_SESION_DIR?.trim()
  ? resolve(process.env.WHATSAPP_SESION_DIR)
  : join(__dirname, "..", "data", "whatsapp-sesion");

// Pausa mínima entre dos mensajes. Mandar muchos seguidos, como ametralladora,
// es de lo que más dispara los bloqueos de WhatsApp a números no oficiales.
const PAUSA_ENTRE_MENSAJES_MS = 3_000;

// Espera antes de reconectar: arranca en 5 s y se duplica con cada corte
// seguido, hasta 5 min. Así, sin internet, no se queda reintentando sin parar.
const RECONEXION_MIN_MS = 5_000;
const RECONEXION_MAX_MS = 5 * 60_000;
// Justo después de escanear el QR, WhatsApp pide reconectar: eso va rápido.
const RECONEXION_TRAS_VINCULAR_MS = 1_000;

// Cuántos mensajes enviados se recuerdan (ver getMessage más abajo).
const MAX_ENVIADOS_RECORDADOS = 50;

// Baileys loguea muchísimo (en JSON). Lo callamos: lo importante (QR, conectado,
// cortes) lo contamos nosotros en la consola, en castellano.
const logger = pino({ level: "silent" });

/**
 * Crea el envío por WhatsApp y arranca la conexión en segundo plano. Si hay una
 * sesión guardada se conecta solo; si no, muestra el QR en la consola. Mientras
 * no esté conectado, `listo()` da false y el despachador espera.
 */
export function crearEnviadorBaileys(): Enviador {
  let socket: WASocket | null = null;
  let conectado = false;
  let cortesSeguidos = 0;
  let ultimoEnvio = 0;
  // Si esta conexión mostró un QR (todavía no hay celular vinculado).
  let mostroQr = false;
  // Si el celular del cliente no pudo descifrar un mensaje, pide que se lo
  // reenviemos; Baileys lo busca acá (getMessage). Solo los últimos.
  const enviados = new Map<string, proto.IMessage>();

  async function conectar(): Promise<void> {
    mostroQr = false;
    // 0o700: la carpeta de las credenciales solo la lee el usuario del server.
    await mkdir(CARPETA_SESION, { recursive: true, mode: 0o700 });
    const { state, saveCreds } = await useMultiFileAuthState(CARPETA_SESION);
    // Versión de WhatsApp Web a usar. Si no se puede averiguar, Baileys trae una.
    const { version } = await fetchLatestBaileysVersion();

    const nuevo = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      // No aparecer "en línea": así el celular sigue recibiendo sus notificaciones.
      markOnlineOnConnect: false,
      // No bajar el historial de chats: para mandar avisos no hace falta.
      shouldSyncHistoryMessage: () => false,
      getMessage: async (clave) => (clave.id ? enviados.get(clave.id) : undefined),
    });
    socket = nuevo;

    // Cada vez que cambian las credenciales hay que guardarlas (si no, los
    // mensajes pueden no llegar).
    nuevo.ev.on("creds.update", saveCreds);

    nuevo.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
      // Eventos de una conexión vieja (ya reemplazada) no cuentan.
      if (socket !== nuevo) return;

      if (qr) {
        mostroQr = true;
        mostrarQr(qr);
      }

      if (connection === "open") {
        conectado = true;
        cortesSeguidos = 0;
        console.log("[whatsapp] WhatsApp conectado: los avisos salen por WhatsApp.");
      }

      if (connection === "close") {
        conectado = false;
        alCerrarse(codigoDeCierre(lastDisconnect?.error), lastDisconnect?.error);
      }
    });
  }

  // Qué hacer cuando se corta la conexión, según el motivo.
  function alCerrarse(codigo: number | undefined, error: unknown): void {
    if (codigo === DisconnectReason.loggedOut) {
      // Desvincularon el dispositivo desde el celular (o WhatsApp cerró la
      // sesión). La sesión guardada ya no sirve: se borra y se arranca de cero,
      // mostrando un QR nuevo para volver a vincular.
      console.error(
        "[whatsapp] WhatsApp cerró la sesión (se desvinculó el dispositivo desde el celular). " +
          "Se borra la sesión guardada y aparece un QR nuevo: escanealo para volver a vincular. " +
          "Mientras tanto, los avisos esperan.",
      );
      rm(CARPETA_SESION, { recursive: true, force: true })
        .catch((falla) =>
          console.error(`[whatsapp] No se pudo borrar la sesión (${CARPETA_SESION}):`, falla),
        )
        .finally(() => programarConexion(RECONEXION_MIN_MS));
      return;
    }

    if (codigo === DisconnectReason.connectionReplaced) {
      // Otro programa se conectó con la MISMA sesión. Si reconectáramos, se
      // pelearían entre los dos para siempre: este server deja de intentar.
      console.error(
        "[whatsapp] Otra conexión con la misma sesión tomó el control (¿hay otro server corriendo con AVISOS_ENVIO=baileys?). " +
          "Este server deja de mandar avisos; cerrá el otro y reiniciá este. Los avisos esperan.",
      );
      return;
    }

    if (codigo === DisconnectReason.restartRequired) {
      // Normal justo después de escanear el QR.
      programarConexion(RECONEXION_TRAS_VINCULAR_MS);
      return;
    }

    cortesSeguidos += 1;
    const espera = Math.min(RECONEXION_MIN_MS * 2 ** (cortesSeguidos - 1), RECONEXION_MAX_MS);
    const segundos = Math.round(espera / 1000);
    console.warn(
      mostroQr
        ? `[whatsapp] Nadie escaneó el QR a tiempo. En ${segundos} s aparece uno nuevo; mientras tanto los avisos esperan.`
        : `[whatsapp] Se cortó la conexión con WhatsApp (${describir(codigo, error)}). ` +
            `Se reintenta en ${segundos} s; mientras tanto los avisos esperan.`,
    );
    programarConexion(espera);
  }

  function programarConexion(esperaMs: number): void {
    setTimeout(() => {
      conectar().catch((falla) => {
        // No llegó ni a abrir el socket (por ejemplo, sin permiso en la carpeta).
        console.error("[whatsapp] No se pudo iniciar la conexión con WhatsApp:", falla);
        alCerrarse(undefined, falla);
      });
    }, esperaMs);
  }

  programarConexion(0);

  return {
    nombre: "baileys",

    listo: () => conectado,

    async enviar(telefono, texto) {
      if (!socket || !conectado) throw new Error("WhatsApp no está conectado");
      const actual = socket;

      // Respeta la pausa desde el mensaje anterior (se espera antes y no después,
      // así el aviso queda marcado "enviado" apenas sale).
      const falta = ultimoEnvio + PAUSA_ENTRE_MENSAJES_MS - Date.now();
      if (falta > 0) await esperar(falta);

      // "+59899123456" => "59899123456@s.whatsapp.net". Antes de mandar se
      // pregunta si el número tiene WhatsApp; si no tiene, no tiene sentido
      // reintentar.
      const jid = `${telefono.replace(/\D/g, "")}@s.whatsapp.net`;
      const consulta = await actual.onWhatsApp(jid);
      if (!consulta) throw new Error("WhatsApp no respondió si el número tiene cuenta");
      const cuenta = consulta.find((c) => c.exists);
      if (!cuenta) throw new ErrorDefinitivo(`el ${telefono} no tiene WhatsApp`);

      const mensaje = await actual.sendMessage(cuenta.jid, { text: texto });
      ultimoEnvio = Date.now();
      console.log(`[whatsapp] Aviso enviado a ${telefono}.`);

      if (mensaje?.key.id && mensaje.message) {
        enviados.set(mensaje.key.id, mensaje.message);
        // El Map recuerda el orden de inserción: el primero es el más viejo.
        if (enviados.size > MAX_ENVIADOS_RECORDADOS) {
          enviados.delete(enviados.keys().next().value!);
        }
      }
    },
  };
}

// --- Auxiliares ---

function mostrarQr(qr: string): void {
  console.log(
    "\n[whatsapp] Falta vincular el celular. Abrí WhatsApp en tu celular → " +
      "Dispositivos vinculados → Vincular un dispositivo y escaneá este código:\n",
  );
  qrcode.generate(qr, { small: true });
  console.log(
    "[whatsapp] El código se renueva cada unos segundos: si no llegás, escaneá el último que aparezca.\n",
  );
}

// Baileys cierra con errores de @hapi/boom: el motivo va en output.statusCode.
function codigoDeCierre(error: unknown): number | undefined {
  return (error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
}

function describir(codigo: number | undefined, error: unknown): string {
  const mensaje = error instanceof Error ? error.message : "sin detalle";
  return codigo === undefined ? mensaje : `${mensaje}, código ${codigo}`;
}

function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms));
}
