# Tablero de estados — Taller ML Center

Web app **local** (sin internet) para mostrar en la pantalla táctil del showroom
el estado de los autos que están en el taller. Corre en la red del taller: una
máquina hace de servidor y el resto de los dispositivos se conectan por su IP.

Ver [CLAUDE.md](./CLAUDE.md) para el detalle del proyecto y las reglas.

## Estructura

```
proyectoML2/
├── client/              → Front: Vite + React + TypeScript + Tailwind
├── server/              → Back: Node + Express + better-sqlite3 + Socket.IO
├── Dockerfile           → Imagen con todo adentro (ver "Desplegar en una PC nueva")
├── docker-compose.yml   → Cómo se levanta: puerto, volumen de datos, reinicio solo
├── .env.example         → Modelo de la configuración del taller
├── iniciar.bat / .sh    → Arrancar con doble clic (Windows) o ./iniciar.sh (Linux)
└── CLAUDE.md
```

## Requisitos

- **Para dejarlo andando en el taller (recomendado): solo Docker.** No hace falta
  Node, npm ni compiladores. Ver
  [Desplegar en una PC nueva (Docker)](#desplegar-en-una-pc-nueva-docker).
- Para desarrollar (o correrlo sin Docker): Node.js 20 o superior (probado con
  Node 24).

## Desplegar en una PC nueva (Docker)

Es la forma recomendada de instalarlo en la PC que hace de servidor. Todo lo que
necesita la app (Node, las dependencias, el binario de `better-sqlite3`) queda
adentro de una imagen de Docker, así que en la PC solo se instala Docker. El
server **arranca solo al prender la PC** y la base queda guardada aparte (en un
volumen de Docker), así que no se pierde al reiniciar ni al actualizar.

> ⚠️ **La primera vez (y en cada actualización) hace falta internet**: el build
> baja la imagen de Node y las dependencias. Después la app anda sin internet,
> como siempre (salvo los [avisos reales por WhatsApp](#avisos-por-whatsapp)).

### 1. Instalar Docker (una sola vez)

**Windows 10/11**

1. Instalá [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/).
   Usa **WSL 2**: si el instalador lo pide, aceptá y reiniciá (si no está, se
   instala con `wsl --install` en una PowerShell como administrador).
2. Abrí Docker Desktop → **Settings → General** → tildá **"Start Docker Desktop
   when you sign in to your computer"**. Así, al prender la PC, Docker arranca y
   levanta el tablero solo.
3. Docker Desktop arranca cuando alguien **inicia sesión** en Windows. Si la PC
   se reinicia (un corte de luz, una actualización) y nadie entra, el tablero no
   vuelve. Para que quede solo, activá el **inicio de sesión automático** (ver
   abajo).
4. La primera vez que arranque el tablero, Windows puede preguntar por el
   **firewall**: permití el acceso en **redes privadas**, si no, la pantalla y la
   tablet no llegan al server.

**Windows: inicio de sesión automático**

> ⚠️ Con esto, **cualquiera que prenda la PC queda adentro** de ese usuario sin
> poner contraseña. Usá un usuario **local y estándar** (sin permisos de
> administrador), dedicado al tablero, y no dejes en él nada personal.

1. Creá (o elegí) ese usuario en **Configuración → Cuentas → Otros usuarios**.
   Tiene que estar en el grupo **`docker-users`** para poder usar Docker Desktop
   (el instalador solo agrega al usuario que instaló). Se agrega desde una
   PowerShell como administrador:
   ```powershell
   net localgroup docker-users NOMBRE_DEL_USUARIO /add
   ```
   Entrá una vez con ese usuario y hacé el paso 2 de arriba (que Docker arranque
   al iniciar sesión).
2. En **Windows 11**, primero desactivá **Configuración → Cuentas → Opciones de
   inicio de sesión → "Para mayor seguridad, permitir solo el inicio de sesión
   con Windows Hello…"** (si no, el paso 3 no muestra la casilla).
3. Apretá `Win + R`, escribí `netplwiz` y Enter. Elegí el usuario, destildá
   **"Los usuarios deben escribir su nombre y contraseña para usar el equipo"**,
   Aceptar, y poné la contraseña de ese usuario cuando la pida.
4. Reiniciá la PC para probar: tiene que entrar sola, arrancar Docker Desktop y a
   los pocos segundos el tablero responde en la pantalla del showroom.

Si la casilla de `netplwiz` no aparece igual, la herramienta oficial
[Autologon](https://learn.microsoft.com/sysinternals/downloads/autologon) de
Microsoft hace lo mismo (y guarda la contraseña cifrada).

**Linux (Ubuntu, Debian, etc.)**

1. Instalá [Docker Engine](https://docs.docker.com/engine/install/) con el plugin
   `docker compose` (viene en los paquetes oficiales).
2. Que arranque ahora y en cada inicio:
   ```bash
   sudo systemctl enable --now docker
   ```
3. Para usar Docker sin `sudo`, agregá tu usuario al grupo `docker` y **cerrá la
   sesión y volvé a entrar**:
   ```bash
   sudo usermod -aG docker "$USER"
   ```

### 2. Bajar el proyecto y arrancar

```bash
git clone <url-del-repo> tablero-taller
cd tablero-taller
```

(En Windows, `git` viene con [Git for Windows](https://git-scm.com/download/win).)

Y después, **una de estas**:

- **Windows:** doble clic en `iniciar.bat`.
- **Linux:** `./iniciar.sh`
- **A mano (cualquiera):** `docker compose up -d --build`

Los scripts chequean que Docker esté instalado y andando, crean el `.env` si no
existe (copiando `.env.example`), levantan todo, esperan a que el server responda
y muestran las direcciones para abrir desde los otros dispositivos, por ejemplo:

```
  Pantalla del showroom: http://192.168.1.50:3000/display
  Vendedores (admin):    http://192.168.1.50:3000/admin
  Taller:                http://192.168.1.50:3000/taller
```

Si algo falla, muestran los últimos logs del server. La primera vez tarda unos
minutos (el build); las siguientes, segundos.

A partir de ahí el contenedor queda con `restart: unless-stopped`: si se cae o se
reinicia la PC, **vuelve a arrancar solo**. Solo queda parado si alguien lo para
a mano.

### 3. Configurar (`.env`)

La configuración del taller va en un archivo `.env`, en la carpeta del proyecto.
Es opcional (sin `.env` se usan los defaults) y **no se sube a git**. El modelo es
`.env.example`, con cada variable explicada:

| Variable | Default | Para qué sirve |
| --- | --- | --- |
| `PUERTO` | `3000` | Puerto de la PC donde queda la app (`http://<ip>:PUERTO`). |
| `TZ` | `America/Montevideo` | Zona horaria de los logs y del horario de los mensajes de [post-venta](#post-venta-por-whatsapp). |
| `ADMIN_PIN`, `HORAS_VISIBLE_TERMINADO`, `AVISOS_*` | | Igual que sin Docker, ver [Configuración](#configuración). |

Después de cambiar el `.env`: `docker compose up -d` (recrea el contenedor con la
configuración nueva; los datos quedan). Ojo que `ADMIN_PIN` solo sirve **la
primera vez** (después el PIN vive en la base).

En Docker, `PORT`, `DB_PATH`, `WHATSAPP_SESION_DIR` y `CARPETA_BACKUPS` **no se
configuran**: los fija el `docker-compose.yml`, para que la base y la sesión de
WhatsApp vayan siempre al volumen de datos y los backups a `server/data/backups`
de la PC (ver [Respaldo de la base](#respaldo-de-la-base)).

### El día a día

Todos los comandos se corren **en la carpeta del proyecto** (en Windows, en una
PowerShell o Windows Terminal abierta ahí).

| Para | Comando |
| --- | --- |
| Ver los logs en vivo (y el QR de WhatsApp) | `docker compose logs -f` (Ctrl+C para salir; el server sigue andando) |
| Ver si está andando | `docker compose ps` (tiene que decir `healthy`) |
| Reiniciar el server | `docker compose restart` |
| Parar el tablero | `docker compose down` (no vuelve a arrancar hasta el próximo `up`) |
| Actualizar a la última versión | `git pull` y después `docker compose up -d --build` (o `iniciar.bat` / `./iniciar.sh`) |

Actualizar **no toca los datos**: se rearma la imagen y el contenedor nuevo usa el
mismo volumen.

> ⚠️ **Nunca uses `docker compose down -v`.** La `-v` borra el volumen, o sea **la
> base con todos los autos y la sesión de WhatsApp**. Para parar, `docker compose
> down` a secas.

**Vincular WhatsApp en Docker.** Los avisos por WhatsApp vienen activados por
defecto. La primera vez, después de `docker compose up -d`, mirá los logs con
`docker compose logs -f --no-log-prefix`
(sin el prefijo de cada línea el QR se escanea mejor). El resto es igual que en
[Vincular el celular](#vincular-el-celular-una-sola-vez). La sesión queda en el
volumen, así que sobrevive a reinicios y actualizaciones. En Windows, mirá el QR
en PowerShell o Windows Terminal (el `cmd` viejo puede mostrarlo roto).

### Respaldo de la base

**El server hace backups solo**: uno cada vez que arranca y uno por día (revisa
cada hora si ya hay uno de hoy). Van a la carpeta **`server/data/backups`** del
proyecto, en esta PC (no adentro del volumen: se ven con el explorador de
archivos y `docker compose down -v` no los borra). Se guardan **los últimos 30
archivos**; los más viejos se borran solos.

Cada backup es un archivo SQLite completo, con la fecha y la hora en el nombre:

```
taller-2026-09-29_08-00-00-arranque.db
taller-2026-09-30_09-12-40-diario.db
```

Se hacen con el backup de SQLite, que sale consistente aunque el server esté
escribiendo (copiar `taller.db` a mano con el server andando **no** es seguro:
los últimos cambios pueden estar todavía en `taller.db-wal`).

> ⚠️ Los backups tienen los datos de los clientes (matrículas, celulares):
> guardalos en un lugar privado. **No** incluyen la sesión de WhatsApp.

**Ver el último o hacer uno ya:** desde `/admin` → **Configuración** (ver
[La vista /admin](#la-vista-admin-trabajadores)).

**Llevarlos a un pendrive u otra PC:** copiá a mano uno o varios archivos de
`server/data/backups` (el último por nombre es el más nuevo). Se pueden copiar
con el server andando.

**Restaurar** uno (pisa la base actual; cambiá el nombre por el del backup):

```bash
docker compose stop
docker compose run --rm --no-deps --user root taller sh -c "cp /app/server/data/backups/taller-2026-09-29_08-00-00-arranque.db /app/server/data/taller.db && rm -f /app/server/data/taller.db-wal /app/server/data/taller.db-shm && chown node:node /app/server/data/taller.db"
docker compose start
```

Si el backup viene de un pendrive, copialo primero a `server/data/backups`. Sin
Docker es lo mismo con el server parado: copiar el backup encima de
`server/data/taller.db` y borrar `taller.db-wal` y `taller.db-shm` si están.

Si la carpeta la creó Docker (por ejemplo, levantando con `docker compose up` sin
los scripts en un clon viejo), puede quedar de `root` y los backups fallan: el log
dice `[backup] No se pudo hacer el backup`. Se arregla con
`sudo chown 1000:1000 server/data/backups` (el usuario del server adentro del
contenedor es el 1000) y `docker compose restart`.

**La sesión de WhatsApp** no entra en los backups. Para guardarla también (por
ejemplo, antes de mudar el tablero a otra PC), parando un momento:

```bash
docker compose stop
docker compose cp taller:/app/server/data ./respaldo-completo
docker compose start
```

> ⚠️ Ese respaldo **incluye la sesión de WhatsApp**, que son las credenciales del
> número (ver [La sesión es secreta](#la-sesión-es-secreta)): guardalo en un lugar
> privado.

## Instalar

```bash
# Front
cd client && npm install

# Back
cd ../server && npm install
```

> El backend usa `better-sqlite3`, que compila un binario nativo al instalar.
> Con npm 11+ puede pedir aprobar los scripts de instalación:
> `npm approve-scripts better-sqlite3 esbuild`.
>
> `npm install` en `server/` también instala lo de los [avisos por WhatsApp](#avisos-por-whatsapp)
> (`baileys`, `pino`, `qrcode-terminal`). npm puede avisar que `baileys` y
> `protobufjs` tienen scripts de instalación sin aprobar: no hace falta aprobarlos
> (uno solo chequea la versión de Node y el otro imprime avisos).

## Correr en desarrollo

Necesitás **dos terminales** (front y back por separado):

```bash
# Terminal 1 — backend en http://localhost:3000
cd server && npm run dev

# Terminal 2 — front en http://localhost:5173
cd client && npm run dev
```

Abrí **http://localhost:5173** en el navegador. La raíz redirige a `/display`
(la pantalla del showroom). Hay tres vistas:

- **/display** — clientes (solo lectura, con pantalla de bienvenida).
- **/admin** — vendedores: administran los autos (alta, editar, agregar/quitar
  servicios, retirar, cambiar estados).
- **/taller** — trabajadores del taller: **solo** cambian el estado de cada
  trabajo (esperando / en proceso / terminado). Usa el mismo PIN que `/admin` y se
  actualiza en vivo por Socket.IO, igual que `/display`.

En dev, el front hace proxy de `/api` y `/socket.io` hacia el backend, así que no
hace falta configurar nada más.

## Correr en producción (una sola máquina en el taller)

> Lo recomendado es [con Docker](#desplegar-en-una-pc-nueva-docker). Esto es para
> correrlo a mano, con Node instalado.

```bash
# 1. Buildear el front
cd client && npm run build

# 2. Buildear y arrancar el backend (sirve el front y la API en un solo puerto)
cd ../server && npm run build && npm start
```

El servidor queda en **http://localhost:3000** sirviendo todo. Desde los otros
dispositivos del taller (pantalla, tablet, PC) se accede por la IP local del
servidor, por ejemplo `http://192.168.1.50:3000`.

## Tests

El backend tiene tests automáticos (con el runner que ya trae Node, sin
dependencias extra; necesita Node 22 o superior, probado con Node 26):

```bash
cd server && npm test
```

Corren contra una **base descartable** en una carpeta temporal (se borra al
terminar): **nunca tocan `server/data/taller.db`** ni se conectan a WhatsApp (los
envíos son de mentira). Se pueden correr con el server de desarrollo andando.
Están en `server/test/`, fuera de `src/`, así que no terminan en el build.

## La base de datos

Es un solo archivo: `server/data/taller.db`. **No hay ningún paso manual de
instalación de base**: al arrancar el backend se crean las tablas si no existen
y, si la base está vacía, se cargan 8 autos de ejemplo (*seed*) para poder ver
el tablero funcionando mientras no exista `/admin`.

El seed corre una sola vez. Si la base ya tiene autos, el server lo dice en el
log y no toca nada:

```
La base ya tiene datos (8 vehículos), no se siembra.
```

Para **empezar de cero** (borra todos los datos y vuelve a sembrar):

```bash
rm server/data/taller.db*
```

Las columnas nuevas (por ejemplo `vehiculos.telefono` o `vehiculos.acepta_whatsapp`)
se agregan **solas** al arrancar sobre una base que ya existía: no hay que borrar
nada ni correr scripts. Lo mismo con la tabla `avisos` de antes de la post-venta:
el server la rearma sola (en una transacción, con todas sus filas y sus ids) para
que acepte los tipos nuevos, y lo dice una vez en el log.

La tabla `avisos` es la cola de los [avisos por WhatsApp](#avisos-por-whatsapp):
una fila por aviso y por auto (`ingreso`, `en_proceso`, `listo` y los de
post-venta, `resena` y `mantenimiento`), con su estado
(`pendiente`, `enviado`, `cancelado`, `sin_telefono`, `fallido`), cuándo toca
mandarlo (`enviar_en`, en UTC), los intentos y el último error. También se crea
sola al arrancar.

La tabla `historial` guarda, para los **reportes** que vienen más adelante, cada
cosa que pasa en el taller: el alta del auto (`ingreso`), cada cambio de estado de
un servicio (`cambio_estado`, con el estado anterior y el nuevo), servicios
agregados o quitados sobre la marcha (`servicio_agregado` / `servicio_quitado`) y
el `retiro`, cada uno con su fecha y hora (en UTC). Solo se agregan filas: nunca se
editan ni se borran. Cambiar un servicio al mismo estado que ya tenía no anota
nada. Por ahora no se ve en ninguna pantalla, y el precio de cada servicio se va a
sumar recién con los reportes. Los autos de ejemplo del *seed* no tienen
historial. También se crea sola al arrancar.

Al arrancar y una vez por día el server deja un **backup** en
`server/data/backups` (quedan los últimos 30; ver
[Respaldo de la base](#respaldo-de-la-base)).

Para probar sin tocar la base real, se puede apuntar a otro archivo con `DB_PATH`
(si la carpeta no existe, se crea; los backups van a `backups` al lado de ese
archivo, salvo que se indique otra carpeta con `CARPETA_BACKUPS`):

```bash
cd server && DB_PATH=/tmp/prueba.db PORT=3099 npm run dev
```

## La bienvenida del showroom (/display)

`/display` arranca en un cartel de bienvenida a pantalla completa (emblema ML,
"¿Cómo va tu auto?", "Tocá para ver el estado"). Tocando en cualquier parte se
abre la lista de autos; tras un minuto sin que nadie toque, vuelve sola al
cartel. Mientras tanto los datos se siguen actualizando de fondo, así que el
cartel también está vivo:

- **Cápsula con el taller en vivo.** Abajo, sobre el horizonte dorado: cuántos
  autos hay, cuántos están listos para retirar y, por cono (instalación,
  polarizado, vitrificado), cuántos trabajos quedan sin terminar en esa área. Sale
  de la misma lista de `/display` (Socket.IO + poll), sin pedidos extra.
- **Anuncio dorado de "listo".** Cuando un auto pasa a tener **todos** sus
  servicios terminados, la cápsula se cambia unos **10 segundos** por un cartel
  dorado: "Toyota Corolla ••A427 está listo para retirar — ¡Ya podés pasar a
  retirarlo!". Como en la lista, solo marca, modelo y los **últimos 4
  caracteres** de la matrícula, **nunca la entera**. Si quedan listos varios a la
  vez, salen de a uno, en fila; después vuelve la cápsula. Detalles:
  - Se detecta comparando cada lista nueva con la anterior, en la pantalla. La
    primera carga no anuncia nada (no hay con qué comparar): si la pantalla se
    reinicia justo en ese momento, ese anuncio se pierde. Un auto que aparece ya
    terminado tampoco se anuncia.
  - Solo se anuncia mientras se ve el cartel: si alguien está mirando la lista,
    no se junta una cola de avisos para después.
  - Si un auto de la fila vuelve a tener algo pendiente (o lo retiran) antes de
    su turno, se saca de la fila.
- **Frases que van rotando.** Debajo de "Tocá para ver el estado", una frase en
  oro claro que cambia cada ~7 segundos con un fundido (ej. "Polarizado con
  garantía de 5 años"). Se editan en `/admin` →
  [Configuración](#pantalla-de-configuración); sin frases no se muestra nada.
- **Reducir movimiento.** Si el sistema tiene activado "reducir movimiento", no
  hay fundidos, escalas ni barrita del tiempo: la frase y el anuncio cambian de
  golpe (el anuncio igual dura sus 10 segundos).

## La vista /admin (trabajadores)

En `/admin` los trabajadores dan de alta autos, cambian el estado de cada servicio,
agregan o quitan servicios sobre la marcha y retiran autos cuando el cliente se los
lleva. Se entra con un **PIN** (uno solo, compartido).

- **El PIN se valida en el servidor.** No alcanza con esconder la pantalla: los
  endpoints que modifican datos exigen el PIN en el header `x-pin` (si no, un 401).
- **Límite de intentos.** 5 PIN mal seguidos desde un mismo dispositivo (misma IP)
  lo bloquean **5 minutos**: mientras tanto se rechaza todo intento con PIN, aunque
  sea el correcto (`429`, "Demasiados intentos. Probá de nuevo en N min."). Los
  demás dispositivos siguen entrando. Entrar bien (login) vuelve la cuenta a cero. El
  bloqueo vive en memoria: reiniciar el server lo borra. Ojo: con **Docker
  Desktop (Windows)** el server puede no ver la IP real de cada dispositivo, y
  entonces el bloqueo alcanza a todos a la vez.
- Si el PIN cambia, las tablets que tenían el viejo vuelven solas a la pantalla del
  PIN en su próximo pedido.
- El PIN vive en la base (tabla `config`). El **default es `1234`**. Se cambia
  desde **Configuración** (abajo). Para fijar otro la primera vez, también se
  puede arrancar el server con `ADMIN_PIN=xxxx`; queda guardado en la base y
  después ya no depende de esa variable.
- La tablet **queda logueada** (el PIN se guarda en el navegador). Hay botón
  "Salir" para cerrar sesión a mano.
- **Retirar** un auto y **quitar** un servicio son *soft delete*: no se borran, se
  marcan con fecha (`retirado_en` / `eliminado_en`) y desaparecen de las vistas,
  pero quedan como historial. Un auto no puede quedar sin servicios: si es el
  último, hay que retirar el auto.
- Editar los datos de un auto o agregar/quitar servicios **no** cambia su fecha de
  ingreso ni el estado de los otros servicios.
- **Celular del cliente (opcional).** Al dar de alta o editar un auto se puede
  cargar un celular uruguayo ("Celular para avisos por WhatsApp"). Se acepta como
  se escriba (`099 123 456`, `99123456`, `+598 99 123 456`…) y se guarda siempre
  como `+59899123456`; si no es un celular uruguayo, el server lo rechaza con un
  mensaje. Dejarlo vacío al editar lo borra. Se muestra chico en la tarjeta de
  `/admin`. Se usa para los [avisos automáticos por WhatsApp](#avisos-por-whatsapp).
- **El celular es privado.** La API solo lo manda si el pedido trae un PIN válido
  en `x-pin` (`/admin` y `/taller`). **Nunca** llega a `/display` ni a quien pida
  la lista sin PIN, y `/taller` no lo muestra.
- **"Acepta recibir mensajes por WhatsApp".** Interruptor del formulario de alta
  y edición (`vehiculos.acepta_whatsapp`): solo decide los mensajes de
  **post-venta** (pedido de reseña y recordatorio de mantenimiento); los avisos de
  "entró", "arrancamos" y "listo" salen igual. En el alta arranca **prendido**; al
  editar muestra lo guardado. Los autos cargados antes de que existiera quedan en
  "no". Es privado como el celular: solo viaja con PIN.

### Pantalla de Configuración

El botón **Configuración** de la cabecera (en el celular, solo el ícono) cambia la
lista de autos por tarjetas; se vuelve con "← Volver a los autos":

- **PIN de acceso.** PIN actual, PIN nuevo (de 4 a 8 números) y repetirlo. Vale
  para `/admin` **y** `/taller`. El dispositivo desde el que se cambia sigue
  adentro; las demás tablets y PCs vuelven a pedir el PIN (el nuevo) en su próximo
  pedido. Un PIN actual mal cuenta como intento fallido.
- **Backups.** Cuándo fue el último, cuánto pesa, cuántos hay guardados (de 30),
  la carpeta en la PC servidor y, si el último intento falló, el motivo. Con
  **"Hacer backup ahora"** se hace uno en el momento (por ejemplo, antes de tocar
  algo). Ver [Respaldo de la base](#respaldo-de-la-base).
- **Pantalla del showroom.** Cuántas horas sigue visible un auto terminado (de 1
  a 72), con "−" / "+" y "Guardar". El showroom se actualiza al instante.
  También las **frases de la bienvenida** (hasta 10, de hasta 80 caracteres):
  agregar, quitar y "Guardar"; llegan al showroom sin recargar.
- **Cuidados en el aviso de listo.** Un texto por servicio (instalación,
  polarizado, vitrificado), de hasta 800 caracteres, con "Guardar" y "Usar el de
  fábrica". Van al final del WhatsApp de "listo" (ver
  [Avisos por WhatsApp](#avisos-por-whatsapp)); vacío = ese servicio no lleva
  cuidados.
- **Post-venta por WhatsApp.** Prender o apagar el pedido de reseña y el
  recordatorio de mantenimiento (interruptores: se guardan al tocarlos), cuántos
  días / meses después del retiro, los dos textos (con "Usar el de fábrica"), el
  link de reseñas, el horario, si se manda los domingos y los minutos entre un
  mensaje y otro. Los textos y el link se escriben y se guardan con "Guardar".
  Ver [Post-venta por WhatsApp](#post-venta-por-whatsapp).

Los ajustes salen de la lista del server (`server/src/ajustes.ts`), cada uno con
su tipo (número entero, sí/no o texto) y su grupo (la tarjeta donde aparece): uno
nuevo aparece solo en su tarjeta.

## Avisos por WhatsApp

Si el auto tiene celular cargado, el server le manda al cliente hasta tres
mensajes automáticos:

| Aviso | Cuándo sale | Mensaje (ejemplo) |
| --- | --- | --- |
| Entró | 5 min después del alta, si el auto no se retiró antes. | "¡Hola! Tu Toyota Corolla ya ingresó al taller de ML Center. Te vamos a ir avisando por acá cómo va." |
| Arrancamos | 5 min después de que **algún** servicio pasa a `en_proceso`, si en ese momento sigue habiendo alguno en proceso. | "¡Buenas! Ya arrancamos a trabajar en tu Toyota Corolla. Te avisamos cuando esté listo." |
| Listo | 5 min después de que **todos** los servicios quedan `terminado`, si en ese momento siguen todos terminados. | "¡Tu Toyota Corolla está listo! Ya podés pasar a buscarlo por ML Center." |

Los mensajes solo llevan marca y modelo (nunca la matrícula). Los textos están
todos juntos en `MENSAJES`, en `server/src/avisos.ts`, para cambiarlos fácil.

El de **"listo"** suma, en el mismo mensaje, los **cuidados** de cada servicio que
se le hizo al auto (instalación, polarizado y vitrificado, en ese orden), cada uno
en su párrafo ("Cuidados del polarizado:" y el texto). Esos textos se editan desde
`/admin` → **Configuración** → "Cuidados en el aviso de listo", sin tocar código; se
leen al momento de mandar, así que un cambio vale también para los avisos que ya
estaban esperando. Si un texto está vacío, ese servicio no lleva cuidados.

- **Los 5 minutos son de seguridad.** Al llegar la hora, el server vuelve a mirar
  cómo está el auto antes de mandar. Si alguien tocó "en proceso" sin querer y lo
  volvió a "esperando", o marcó todo terminado y se arrepintió, el aviso se cancela
  solo y el cliente no recibe nada. Si después vuelve a corresponder, se programa de
  nuevo con 5 minutos contados desde ese momento.
- **Cada aviso sale una sola vez por auto.** Si un auto ya recibió el "listo" y se
  reabre un servicio, cuando se vuelva a terminar no se manda otro.
- **Retirar el auto cancela** los avisos que tenía pendientes (y programa los de
  [post-venta](#post-venta-por-whatsapp)).
- **Sin celular, no sale.** El aviso queda como `sin_telefono`. Si después se le carga
  el celular, los avisos de "arrancamos" y "listo" se vuelven a programar en el
  próximo cambio de servicios; el de "entró" ya no.
- **Aguantan reinicios.** Los pendientes viven en la base (tabla `avisos`): si el
  server se apaga, al volver a arrancar manda los que ya vencieron.
- **Reintentos.** Si un envío falla, se reintenta a los 1, 2, 4 y 8 minutos. Al
  quinto intento fallido queda como `fallido` y no se reintenta solo. Las fallas se
  ven en la consola del server.
- **Número sin WhatsApp.** Con el envío real, si el celular cargado no tiene
  WhatsApp, el aviso queda `fallido` de una, sin reintentos.
- **Un `fallido` no queda trabado.** Los de "arrancamos" y "listo" se vuelven a
  programar (5 minutos, intentos de cero) en el próximo cambio de servicios en que
  sigan correspondiendo; el de "entró" ya no.
- El server revisa la cola cada 30 segundos (`AVISOS_INTERVALO_SEG`), así que un
  aviso puede salir hasta medio minuto después de su hora.

### Post-venta por WhatsApp

Después de que el cliente **retira** el auto, el server le manda hasta dos
mensajes más, por la misma cola y el mismo WhatsApp:

| Mensaje | Cuándo sale | Texto por defecto |
| --- | --- | --- |
| Pedido de reseña | 3 días después del retiro (de 1 a 60). | "¡Hola! Gracias por confiar en ML Center con tu {marca} {modelo}. Si te gustó el trabajo, nos ayudás mucho dejándonos una reseña acá: {link}" |
| Mantenimiento | 6 meses después del retiro (de 1 a 36), **solo si el auto tuvo vitrificado**. | "¡Hola! Ya pasaron unos meses desde el vitrificado de tu {marca} {modelo}. Es un buen momento para hacerle el mantenimiento y que siga protegido. Escribinos por acá y coordinamos un día." |

Todo se ajusta desde `/admin` → [Configuración](#pantalla-de-configuración) →
**Post-venta por WhatsApp**:

| Ajuste | Por defecto | Qué hace |
| --- | --- | --- |
| Pedir reseña / Recordar el mantenimiento | prendidos | Apagado, el mensaje no sale (queda `cancelado`). |
| Días (reseña) / Meses (mantenimiento) | 3 días / 6 meses | Se cuentan desde el retiro. La fecha se fija **al retirar**: cambiarlos vale para los próximos retiros. |
| Textos | los de la tabla | `{marca}` y `{modelo}` se cambian por los del auto y `{link}` por el link de reseñas. Hasta 600 letras. **Nunca** se manda la matrícula. |
| Link para dejar la reseña | vacío | El link de reseñas de Google (`https://…`). **Sin link, la reseña no sale.** |
| Horario | de 10 a 19 h | Solo se manda dentro de ese horario (hora de la PC servidor; "hasta" no incluido). Lo que vence fuera de hora espera, sin gastar intentos. |
| Domingos | no | Apagado, lo que vence un domingo sale el lunes. |
| Minutos entre mensajes | 3 (de 0 a 120) | Entre dos mensajes de post-venta pasan al menos esos minutos, para no mandar muchos de golpe. Los avisos del taller no esperan. |

- **Solo a quien aceptó.** El interruptor "Acepta recibir mensajes por WhatsApp"
  del formulario del auto (prendido por defecto en el alta) decide **solo** la
  post-venta. Los autos cargados antes de que existiera quedan en "no".
- **Se decide al mandar.** Al retirar se programan siempre; cuando llega la fecha
  (y estamos en horario), el server mira si el mensaje está prendido, si el
  cliente aceptó, si hay link (para la reseña) y si hay celular. Si algo falta, no
  sale y queda anotado por qué (`cancelado` con el motivo en `ultimo_error`, o
  `sin_telefono`), además de la línea `[aviso]` en la consola. Prender, apagar,
  cambiar textos, link, horario o espaciado vale al instante, también para los
  ya programados.
- Los reintentos ante fallas son los mismos que los de los avisos del taller.

### Cómo salen: WhatsApp real (por defecto) o `log`

**Por defecto los avisos salen por WhatsApp de verdad** (`AVISOS_ENVIO=baileys`):
alcanza con arrancar el server como siempre, sin agregar nada al comando:

```bash
cd server && npm run dev      # o npm start, o docker compose up -d
```

> ⚠️ **Le llegan los mensajes a TODOS los autos que tengan celular cargado**, sin
> excepción (los de [post-venta](#post-venta-por-whatsapp), a los que además
> aceptaron recibirlos). Para probar, usá autos con un celular tuyo (o de alguien que sepa que
> es una prueba). Si no hay internet, la app anda igual y los avisos esperan.

Para probar **sin escribirle a nadie** se arranca con `AVISOS_ENVIO=log`: imprime
el mensaje en la consola del server, por ejemplo:

```bash
cd server && AVISOS_ENVIO=log npm run dev
```

```
[aviso] → +59899123456: ¡Tu Toyota Corolla está listo! Ya podés pasar a buscarlo por ML Center.
```

> ⚠️ **Baileys es una librería NO oficial.** Se hace pasar por WhatsApp Web. Va
> contra las condiciones de WhatsApp y **WhatsApp puede bloquear el número** que
> uses (más si manda muchos mensajes o a gente que no lo tiene agendado). Sirve
> para probar. Para escribirles a clientes reales lo recomendado es la **API
> oficial de WhatsApp Business** (Cloud API).

#### Vincular el celular (una sola vez)

1. Arrancá el server (con WhatsApp, que es el default).
2. En la **consola del server** aparece un código QR con el texto
   *"Abrí WhatsApp en tu celular → Dispositivos vinculados → Vincular un dispositivo
   y escaneá este código"*.
3. En el celular: WhatsApp → **Dispositivos vinculados** → **Vincular un
   dispositivo** → escaneá el QR. El código se renueva cada unos segundos: si no
   llegás, escaneá el último que aparezca. Si nadie lo escanea, al rato aparece otro.
4. Cuando la consola dice `[whatsapp] WhatsApp conectado`, listo: los avisos salen
   por WhatsApp.

La próxima vez que arranque el server se conecta solo, sin QR. Si se corta (wifi,
internet), reconecta solo: primero a los 5 s y cada vez más espaciado, hasta 5 min.
**Mientras WhatsApp no está conectado, los avisos esperan en la cola sin gastar
intentos** y salen cuando vuelve.

Entre un mensaje y otro el server deja al menos 3 segundos: mandar muchos de golpe
es de lo que más dispara los bloqueos.

#### La sesión es secreta

El vínculo queda guardado en la carpeta `server/data/whatsapp-sesion/` (se cambia
con `WHATSAPP_SESION_DIR`). **Esos archivos son las credenciales del número:** con
ellos cualquiera puede mandar mensajes como si fuera ese WhatsApp. Por eso:

- está en `.gitignore`: **nunca** la subas a git ni la compartas ni la copies a otra
  máquina;
- **borrar la carpeta = desvincular** (después conviene borrar también el
  dispositivo en el celular, en "Dispositivos vinculados").

**Si se cierra la sesión** (alguien desvinculó el dispositivo desde el celular, o
WhatsApp la dio de baja), el server lo dice en la consola, **borra solo la sesión
vieja y muestra un QR nuevo**: se vuelve a vincular escaneándolo, igual que la
primera vez.

Si en la consola aparece que *otra conexión con la misma sesión tomó el control*, es
que hay dos servers usando la misma carpeta de sesión: cerrá uno y reiniciá el otro.

#### Qué hace falta para que funcione

- **La máquina del server necesita internet** para los avisos reales. El resto de
  la app (display, admin, taller) sigue andando sin internet; si se corta, los
  avisos quedan esperando y salen cuando vuelve.
- **El celular vinculado tiene que tener internet** de vez en cuando. Si pasa unos
  **14 días sin conectarse**, WhatsApp desvincula los dispositivos y hay que volver a
  escanear el QR.
- **Mensajes a tu propio número:** si cargás un auto con el mismo número que
  vinculaste, el aviso te llega al chat **"Mensaje a vos mismo"** (tu propio chat)
  **sin sonar ni notificar**. Para ver cómo le llega de verdad a un cliente
  (notificación incluida), probá con un auto que tenga **otro celular**.

## La estética (las tres vistas, una sola identidad)

`/display`, `/admin` y `/taller` comparten la misma cara, estilo **"Vidrio
cálido"**: capas translúcidas que desenfocan lo que tienen detrás, luz dorada, el
logo ML (rombo amarillo), el amarillo dorado de la marca y botones en forma de
cápsula. El showroom (`/display`) es oscuro, con una cúpula de filo dorado arriba;
`/admin` y `/taller` son claros, con tarjetas de vidrio sobre un fondo marfil.

Todo el tema está centralizado en pocos lugares; **no hay colores sueltos por
componente**:

| Dónde | Qué define |
| --- | --- |
| `client/src/index.css` | La paleta (`@theme`: `tinta`, `crema`, `crema-alta`, `linea`, `marca`, `listo`, `tabaco`, `arena`, `peligro`…), la tipografía Geist, los materiales de vidrio (`vidrio-claro`, `vidrio-oscuro`, `vidrio-hoja-clara`, `vidrio-hoja-oscura`), los fondos con manchas de luz (`fondo-claro`, `fondo-oscuro`), `texto-degrade` para los títulos sobre oscuro, la cúpula y el horizonte de la cabecera, las animaciones del emblema y de las vistas, y el respeto de `prefers-reduced-motion` (con "reducir movimiento" se apagan todas). |
| `client/src/tema.ts` | Las clases que se repiten: tarjetas, botones, pastillas, cápsulas de matrícula y avisos. |
| `client/src/components/CabeceraCurva.tsx` | La parte oscura con la curva, en dos altos: `hero` (bienvenida) y `compacta` (vistas con lista); con `tono="claro"`, solo la barra de vidrio claro de `/admin` y `/taller`. |
| `client/src/components/EmblemaML.tsx` | El rombo ML en 3D de la bienvenida (giro, órbitas, ondas y destellos), hecho solo con CSS. |
| `client/src/components/ConoCirculo.tsx` | El cono de un servicio dentro de un círculo, compartido por las tarjetas, la ficha y el formulario. |
| `client/src/components/PastillaListo.tsx` | La pastilla verde "Listo" de las tarjetas de `/admin` y `/taller`. |
| `client/src/dominio.ts` | Lo que **no** es estética: colores de los conos por área (para fondo claro y para fondo oscuro). |

Para cambiar el amarillo de la marca en toda la app, se toca `--color-marca` en
`index.css` y listo.

La tipografía es **Geist Variable**, instalada como dependencia
(`@fontsource-variable/geist`) y empaquetada dentro del build: el taller no tiene
internet, así que no se puede depender de Google Fonts. Solo se empaqueta el
subset latino (~29 KB).

> **Para la pantalla del showroom:** el efecto vidrio usa `backdrop-filter`. Se
> recomienda un navegador basado en Chromium (Chrome, Edge) actualizado y con la
> **aceleración por hardware activada**, para que el desenfoque y las animaciones
> anden fluidos. Si el navegador no soporta el desenfoque, la app cae sola a fondos
> opacos y todo se sigue leyendo. Si el sistema tiene activado **"reducir
> movimiento"**, las animaciones se apagan.

## Configuración

| Variable | Default | Para qué sirve |
| --- | --- | --- |
| `PORT` | `3000` | Puerto del servidor. |
| `HORAS_VISIBLE_TERMINADO` | `4` | Cuántas horas sigue en pantalla un auto con **todos** sus servicios terminados antes de ocultarse solo (entero de 1 a 72). Es solo el **valor inicial**: se cambia desde `/admin` → [Configuración](#pantalla-de-configuración) (o `PATCH /api/config`) y lo guardado en la base manda sobre la variable. |
| `ADMIN_PIN` | `1234` | PIN inicial de `/admin`. Solo se usa la primera vez, para sembrarlo en la base; después el PIN vive en `config` y se cambia desde `/admin` → Configuración. |
| `DB_PATH` | `server/data/taller.db` | Archivo de la base SQLite. Útil para probar contra una base descartable; si la carpeta no existe, se crea. |
| `CARPETA_BACKUPS` | `backups` al lado de la base (`server/data/backups`) | Dónde van los [backups automáticos](#respaldo-de-la-base) (al arrancar y uno por día; quedan los últimos 30). Si la carpeta no existe, se crea. En Docker la fija el `docker-compose.yml`. |
| `AVISOS_DEMORA_MIN` | `5` | Minutos de seguridad entre el cambio y el aviso por WhatsApp. Acepta decimales (`0.1` = 6 s, para probar). |
| `AVISOS_INTERVALO_SEG` | `30` | Cada cuántos segundos el server revisa si hay avisos para mandar. |
| `AVISOS_ENVIO` | `baileys` | Cómo salen los avisos: `baileys` (WhatsApp real, ver [Avisos por WhatsApp](#avisos-por-whatsapp); necesita internet) o `log` (los imprime en la consola del server, no le escribe a nadie; para probar). Cualquier otro valor es un error: el server arranca igual pero no manda avisos (quedan pendientes) hasta que se corrija. |
| `WHATSAPP_SESION_DIR` | `server/data/whatsapp-sesion` | Carpeta donde queda la sesión de WhatsApp. Son **credenciales**: nunca se comparte ni se sube a git. Borrarla = desvincular. |

## API

Los endpoints que **escriben** exigen el header `x-pin` con el PIN (si no, `401`).
Todo intento con PIN (incluido el login y `GET /api/vehiculos` con `x-pin`) cuenta
para el [límite de intentos](#la-vista-admin-trabajadores): bloqueado =>
`429 { error, minutosRestantes }`.

| Endpoint | Qué hace |
| --- | --- |
| `GET /api/health` | `{ ok: true }`, para saber si el server está vivo. |
| `GET /api/vehiculos` | Autos de `/display`: con servicios anidados, del que hace más tiempo que entró al más nuevo, sin los terminados hace más de las horas configuradas (`horas_visible_terminado`) ni los retirados. Sin `x-pin` es pública y sin `telefono` (la clave no aparece); **con `x-pin`** el PIN se valida: bien => incluye `telefono` y `acepta_whatsapp`, mal => `401`. |
| `GET /api/vehiculos?todos=1` | Igual, pero para `/admin`: incluye también los terminados hace rato (sigue sin los retirados). Mismo criterio con `telefono` y `acepta_whatsapp`. |
| `GET /api/frases` | `{ frases }`: las frases de la bienvenida del showroom. Pública (sin PIN): es lo único de la configuración que ve `/display`. |
| `POST /api/login` | Valida el PIN (body `{ pin }`). `{ ok: true }`, `401` o `429` (bloqueado). |
| `POST /api/vehiculos` | Alta de un auto con sus servicios iniciales (todos en `esperando`). `telefono` es opcional (celular uruguayo; `400` si no es válido). `acepta_whatsapp` (`true`/`false`): si no viene, queda en `false`. |
| `PATCH /api/vehiculos/:id` | Edita marca/modelo/color/matrícula y `telefono` (no toca fecha ni servicios). `telefono: ""` lo borra; si no se manda, queda el que estaba. Lo mismo con `acepta_whatsapp` (`true`/`false`): si no viene, no se toca. |
| `POST /api/vehiculos/:id/retirar` | Retira el auto (soft delete). |
| `POST /api/vehiculos/:id/servicios` | Agrega un servicio (body `{ tipo }`). |
| `PATCH /api/servicios/:id` | Cambia el estado de un servicio (body `{ estado }`). |
| `DELETE /api/servicios/:id` | Quita un servicio (soft delete; `400` si es el último activo del auto). |
| `GET /api/config` | `{ ajustes, backups }`: cada ajuste editable con su definición (`clave`, `grupo`, `etiqueta`, `ayuda`, `tipo` y `porDefecto`; los enteros traen `min`/`max` y los textos `maxLargo`, `permiteVacio`, `multilinea` y `formato`) y su `valor` (número, `true`/`false` o texto), y el estado de los backups (`carpeta`, `ultimo`, `ultimoError`, `cantidad`). |
| `PATCH /api/config` | Guarda ajustes (body `{ clave: valor }`, ej. `{ "horas_visible_terminado": 6, "postventa_domingos": false }`). Todos o ninguno (`400` si alguno no sirve: fuera de rango, texto vacío o muy largo, link que no es `http(s)`, horario con "desde" ≥ "hasta"). Avisa a las pantallas para que se actualicen ya. Devuelve lo mismo que el `GET`. |
| `POST /api/config/pin` | Cambia el PIN (body `{ actual, nuevo }`; el nuevo, de 4 a 8 números). `actual` mal => `401` y cuenta para el bloqueo. |
| `POST /api/backups` | Hace un backup ya ("manual") y devuelve el estado de los backups; `500` con el motivo si falla. |

## Tiempo real (Socket.IO)

Cuando en `/admin` pasa algo que cambia lo que se ve (crear/editar/retirar un auto,
agregar/quitar un servicio, cambiar un estado), el server emite un evento
`vehiculos:cambio` y **`/display` se actualiza al instante**, sin esperar el
refresco. `/display` reconecta solo si se corta el wifi y, al volver, se pone al
día.

El **poll de 30 s se mantiene** a propósito: es la red de seguridad para el paso
del tiempo. Ocultar un auto terminado al cruzar `HORAS_VISIBLE_TERMINADO` no lo
dispara ningún evento (nadie "toca" nada cuando el auto envejece), así que de eso
se encarga el poll. Socket.IO cubre los cambios; el poll, el tiempo.

## Estado actual (Fase 4)

- ✅ Vista `/display` leyendo los autos **reales** de SQLite. Se actualiza al
  instante por Socket.IO ante cambios de `/admin`; si se cae el server mantiene los
  últimos datos, avisa "Sin conexión" y reconecta sola.
- ✅ Vista `/admin` con login por PIN (validado en el server), alta de autos, cambio
  de estado por servicio, agregar/quitar servicios y retirar autos. Pantalla de
  Configuración: cambiar el PIN, ver/hacer backups, las horas visibles y la
  post-venta.
- ✅ Avisos automáticos por WhatsApp (entró, arrancamos, listo) y post-venta
  (pedido de reseña y recordatorio de mantenimiento del vitrificado), con horario,
  espaciado y consentimiento del cliente.
- ✅ Backups automáticos de la base (al arrancar y uno por día, quedan 30) y
  límite de intentos de PIN (5 mal = 5 minutos de bloqueo).
- ✅ Tablas + datos de ejemplo que se crean solos la primera vez; migración
  automática de las columnas nuevas sobre bases ya existentes.
- ✅ Los autos con todos los servicios terminados se ocultan solos a las 4 horas
  (vía el poll de 30 s, como red de seguridad).
- ✅ Tiempo real con Socket.IO: el server emite en cada escritura y `/display`
  refetchea al recibir el evento.

App completa: las cuatro fases de funcionalidad están terminadas.
