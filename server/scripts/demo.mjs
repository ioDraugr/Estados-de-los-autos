// `npm run demo` (desde server/): levanta el tablero en modo presentación.
// 1) Recrea server/data/demo/ (borra SOLO demo.db, demo.db-wal y demo.db-shm).
// 2) Compila el cliente si falta client/dist o si se pasa --build.
// 3) Imprime el cartel con las URLs, el cronograma y las advertencias.
// 4) Arranca el server con MODO_DEMO=1 y una base propia (data/demo/demo.db).
// La base real (data/taller.db) no se toca: el server mismo se niega a usar
// cualquier base de demo que no se llame demo.db (ver src/demo.ts).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const server = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = resolve(server, "..", "client");
const carpetaDemo = join(server, "data", "demo");
const rutaDemoDb = join(carpetaDemo, "demo.db");
const PIN = "1234";
const PIN_REPORTES = "5678";
const PUERTO = Number(process.env.PORT) || 3001;
const esWindows = process.platform === "win32";

function fallar(mensaje) {
  console.error(`\nERROR: ${mensaje}\n`);
  process.exit(1);
}

// --- 1) Recrear la base demo, con guarda: solo dentro de server/data/demo/ ---
function recrearCarpetaDemo() {
  const base = join(server, "data", "demo");
  if (resolve(carpetaDemo) !== base) fallar("la carpeta demo no es server/data/demo.");
  mkdirSync(carpetaDemo, { recursive: true });
  for (const archivo of ["demo.db", "demo.db-wal", "demo.db-shm"]) {
    const ruta = resolve(carpetaDemo, archivo);
    if (!ruta.startsWith(base + sep)) fallar(`no se borra ${ruta}: está fuera de la carpeta demo.`);
    rmSync(ruta, { force: true });
  }
}

// --- 2) Cliente compilado ---
function compilarClienteSiHaceFalta() {
  const forzar = process.argv.includes("--build");
  if (!forzar && existsSync(join(clientDir, "dist", "index.html"))) return;
  console.log("Compilando el cliente (npm --prefix ../client run build)…");
  const r = spawnSync("npm", ["--prefix", clientDir, "run", "build"], {
    cwd: server,
    stdio: "inherit",
    shell: esWindows,
  });
  if (r.status !== 0) fallar("no se pudo compilar el cliente. Revisá los mensajes de arriba.");
}

// --- Puerto libre (error comprensible si no) ---
function puertoLibre(puerto) {
  return new Promise((listo) => {
    const prueba = createServer();
    prueba.once("error", () => listo(false));
    prueba.once("listening", () => prueba.close(() => listo(true)));
    prueba.listen(puerto);
  });
}

function ipLocal() {
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista ?? []) {
      if (i.family === "IPv4" && !i.internal) return i.address;
    }
  }
  return "localhost";
}

function cartel(ip) {
  const envio = process.env.AVISOS_ENVIO ?? "baileys";
  const url = (ruta) => `http://${ip}:${PUERTO}${ruta}`;
  const real = envio === "baileys";
  console.log(`
============================================================
  MODO PRESENTACIÓN — Taller ML Center
============================================================
  Pantallas (desde cualquier dispositivo de la red):
    Admin     ${url("/admin")}     PIN: ${PIN}
    Taller    ${url("/taller")}
    Display   ${url("/display")}
    Reportes  ${url("/reportes")}   PIN: ${PIN_REPORTES}
  /reportes trae ~5 semanas de historial FALSO (autos inventados, ya retirados),
  siempre relativo a hoy. No aparece en Admin, Taller ni Display.

  Cronograma de mensajes al cliente (con celular y WhatsApp activado):
    Ingreso           ~10 s después de crear el auto
    "Ya arrancamos"   ~10 s después de pasar un servicio a en proceso
    "Listo"           ~10 s después de terminar todos los servicios
    Reseña            ~45 s después de retirar el auto
    Mantenimiento     ~105 s después de retirar (solo si tiene vitrificado)
  Los estados y el retiro los cambiás vos, a mano. El server no avanza solo.

  Envío de mensajes: ${real ? "WhatsApp REAL (sesión ya vinculada)" : `"${envio}" (no se le escribe a nadie)`}
  Base de la demo: ${rutaDemoDb}
  (se borra y se vuelve a armar en cada arranque; la base real no se toca)

  ATENCIÓN: el server real (y Docker) NO puede estar corriendo a la vez:
  comparte la sesión de WhatsApp y se pisarían. Apagalo antes de presentar.
  Para ensayar sin escribirle a nadie:  AVISOS_ENVIO=log npm run demo
  Para cortar: Ctrl+C
============================================================
`);
}

recrearCarpetaDemo();
compilarClienteSiHaceFalta();

if (!(await puertoLibre(PUERTO))) {
  fallar(
    `el puerto ${PUERTO} ya está en uso (¿el server real, Docker u otra demo?). ` +
      `Apagá lo que lo use o elegí otro puerto: PORT=3002 npm run demo`,
  );
}

cartel(ipLocal());

const hijo = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
  cwd: server,
  stdio: "inherit",
  env: {
    ...process.env,
    MODO_DEMO: "1",
    DB_PATH: rutaDemoDb,
    PORT: String(PUERTO),
    CARPETA_BACKUPS: join(carpetaDemo, "backups"),
    AVISOS_DEMORA_MIN: "0.17",
    AVISOS_INTERVALO_SEG: "2",
    ADMIN_PIN: PIN,
    AVISOS_ENVIO: process.env.AVISOS_ENVIO ?? "baileys",
  },
});

for (const senal of ["SIGINT", "SIGTERM"]) {
  process.on(senal, () => hijo.kill(senal));
}
hijo.on("exit", (codigo, senal) => process.exit(codigo ?? (senal ? 0 : 1)));
