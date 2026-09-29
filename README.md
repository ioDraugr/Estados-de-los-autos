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
| `TZ` | `America/Montevideo` | Zona horaria de los logs. |
| `ADMIN_PIN`, `HORAS_VISIBLE_TERMINADO`, `AVISOS_*` | | Igual que sin Docker, ver [Configuración](#configuración). |

Después de cambiar el `.env`: `docker compose up -d` (recrea el contenedor con la
configuración nueva; los datos quedan). Ojo que `ADMIN_PIN` solo sirve **la
primera vez** (después el PIN vive en la base).

En Docker, `PORT`, `DB_PATH` y `WHATSAPP_SESION_DIR` **no se configuran**: los
fija el `docker-compose.yml`, para que la base y la sesión de WhatsApp vayan
siempre al volumen de datos.

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

**Vincular WhatsApp en Docker.** Poné `AVISOS_ENVIO=baileys` en el `.env`, corré
`docker compose up -d` y mirá los logs con `docker compose logs -f --no-log-prefix`
(sin el prefijo de cada línea el QR se escanea mejor). El resto es igual que en
[Vincular el celular](#vincular-el-celular-una-sola-vez). La sesión queda en el
volumen, así que sobrevive a reinicios y actualizaciones. En Windows, mirá el QR
en PowerShell o Windows Terminal (el `cmd` viejo puede mostrarlo roto).

### Respaldo de la base

La base (`taller.db`) y la sesión de WhatsApp viven en el volumen `taller-ml_datos`,
que adentro del contenedor está en `/app/server/data`. La base usa el modo WAL de
SQLite: los últimos cambios pueden estar todavía en `taller.db-wal`, así que
**copiar `taller.db` suelto con el server andando puede dejar datos afuera**. Hay
dos formas seguras:

**Solo la base, sin parar nada** (usa el backup de SQLite, que sale consistente
aunque el server esté andando):

```bash
docker compose exec taller node -e "const D=require('better-sqlite3');new D('/app/server/data/taller.db',{readonly:true}).backup('/app/server/data/respaldo.db').then(()=>console.log('Respaldo listo'))"
docker compose cp taller:/app/server/data/respaldo.db ./respaldo-taller.db
docker compose exec taller rm /app/server/data/respaldo.db
```

Queda `respaldo-taller.db` en la carpeta del proyecto; guardalo en otro lado
(pendrive, otra PC).

**Todo (base + sesión de WhatsApp), parando un momento:**

```bash
docker compose stop
docker compose cp taller:/app/server/data ./respaldo-completo
docker compose start
```

> ⚠️ El respaldo completo **incluye la sesión de WhatsApp**, que son las
> credenciales del número (ver [La sesión es secreta](#la-sesión-es-secreta)):
> guardalo en un lugar privado.

**Restaurar** un `respaldo-taller.db` (pisa la base actual):

```bash
docker compose stop
docker compose run --rm --no-deps --user root -v ./respaldo-taller.db:/respaldo.db:ro taller sh -c "cp /respaldo.db /app/server/data/taller.db && rm -f /app/server/data/taller.db-wal /app/server/data/taller.db-shm && chown node:node /app/server/data/taller.db"
docker compose start
```

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

Las columnas nuevas (por ejemplo `vehiculos.telefono`) se agregan **solas** al
arrancar sobre una base que ya existía: no hay que borrar nada ni correr scripts.

La tabla `avisos` es la cola de los [avisos por WhatsApp](#avisos-por-whatsapp):
una fila por aviso y por auto (`ingreso`, `en_proceso`, `listo`), con su estado
(`pendiente`, `enviado`, `cancelado`, `sin_telefono`, `fallido`), cuándo toca
mandarlo (`enviar_en`, en UTC), los intentos y el último error. También se crea
sola al arrancar.

Para probar sin tocar la base real, se puede apuntar a otro archivo con `DB_PATH`
(si la carpeta no existe, se crea):

```bash
cd server && DB_PATH=/tmp/prueba.db PORT=3099 npm run dev
```

## La vista /admin (trabajadores)

En `/admin` los trabajadores dan de alta autos, cambian el estado de cada servicio,
agregan o quitan servicios sobre la marcha y retiran autos cuando el cliente se los
lleva. Se entra con un **PIN** (uno solo, compartido).

- **El PIN se valida en el servidor.** No alcanza con esconder la pantalla: los
  endpoints que modifican datos exigen el PIN en el header `x-pin` (si no, un 401).
- El PIN vive en la base (tabla `config`). El **default es `1234`**. Para fijar
  otro la primera vez, arrancá el server con `ADMIN_PIN=xxxx`; queda guardado en la
  base y después ya no depende de esa variable.
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

- **Los 5 minutos son de seguridad.** Al llegar la hora, el server vuelve a mirar
  cómo está el auto antes de mandar. Si alguien tocó "en proceso" sin querer y lo
  volvió a "esperando", o marcó todo terminado y se arrepintió, el aviso se cancela
  solo y el cliente no recibe nada. Si después vuelve a corresponder, se programa de
  nuevo con 5 minutos contados desde ese momento.
- **Cada aviso sale una sola vez por auto.** Si un auto ya recibió el "listo" y se
  reabre un servicio, cuando se vuelva a terminar no se manda otro.
- **Retirar el auto cancela** los avisos que tenía pendientes.
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

### Cómo salen: `log` o WhatsApp real

Por defecto el envío es `log`: **no le escribe a nadie**, imprime el mensaje en la
consola del server, por ejemplo:

```
[aviso] → +59899123456: ¡Tu Toyota Corolla está listo! Ya podés pasar a buscarlo por ML Center.
```

Para mandarlos **por WhatsApp de verdad** se arranca el server con
`AVISOS_ENVIO=baileys`:

```bash
cd server && AVISOS_ENVIO=baileys npm run dev
```

> ⚠️ **Desde ese momento le llegan los mensajes a TODOS los autos que tengan
> celular cargado**, sin excepción. Para probar, usá autos con un celular tuyo (o
> de alguien que sepa que es una prueba).

> ⚠️ **Baileys es una librería NO oficial.** Se hace pasar por WhatsApp Web. Va
> contra las condiciones de WhatsApp y **WhatsApp puede bloquear el número** que
> uses (más si manda muchos mensajes o a gente que no lo tiene agendado). Sirve
> para probar. Para escribirles a clientes reales lo recomendado es la **API
> oficial de WhatsApp Business** (Cloud API).

#### Vincular el celular (una sola vez)

1. Arrancá el server con `AVISOS_ENVIO=baileys`.
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

`/display`, `/admin` y `/taller` comparten la misma cara: una sección oscura con
una curva amplia hacia un fondo crema, el logo ML (rombo amarillo), el amarillo
dorado de la marca y tarjetas claras con esquinas redondeadas. La referencia es
`Ejemplo.png`, en la raíz del repo.

Todo el tema está centralizado en cuatro lugares; **no hay colores sueltos por
componente**:

| Dónde | Qué define |
| --- | --- |
| `client/src/index.css` | Los colores (`@theme`: `tinta`, `crema`, `crema-alta`, `linea`, `marca`, `listo`), la tipografía y las clases `.curva` / `.curva-baja` de la cabecera. |
| `client/src/tema.ts` | Las clases que se repiten: tarjetas, botones, pastillas y franjas de aviso. |
| `client/src/components/CabeceraCurva.tsx` | La parte oscura con la curva, en dos altos: `hero` (bienvenida) y `compacta` (vistas con lista). |
| `client/src/dominio.ts` | Lo que **no** es estética: colores de los conos por área y estilos de las pastillas de estado. |

Para cambiar el amarillo de la marca en toda la app, se toca `--color-marca` en
`index.css` y listo.

La tipografía es **Nunito Variable**, instalada como dependencia
(`@fontsource-variable/nunito`) y empaquetada dentro del build: el taller no tiene
internet, así que no se puede depender de Google Fonts. Solo se empaqueta el
subset latino (~39 KB).

## Configuración

| Variable | Default | Para qué sirve |
| --- | --- | --- |
| `PORT` | `3000` | Puerto del servidor. |
| `HORAS_VISIBLE_TERMINADO` | `4` | Cuántas horas sigue en pantalla un auto con **todos** sus servicios terminados antes de ocultarse solo. |
| `ADMIN_PIN` | `1234` | PIN inicial de `/admin`. Solo se usa la primera vez, para sembrarlo en la base; después el PIN vive en `config`. |
| `DB_PATH` | `server/data/taller.db` | Archivo de la base SQLite. Útil para probar contra una base descartable; si la carpeta no existe, se crea. |
| `AVISOS_DEMORA_MIN` | `5` | Minutos de seguridad entre el cambio y el aviso por WhatsApp. Acepta decimales (`0.1` = 6 s, para probar). |
| `AVISOS_INTERVALO_SEG` | `30` | Cada cuántos segundos el server revisa si hay avisos para mandar. |
| `AVISOS_ENVIO` | `log` | Cómo salen los avisos: `log` (los imprime en la consola del server, no le escribe a nadie) o `baileys` (WhatsApp real, ver [Avisos por WhatsApp](#avisos-por-whatsapp); necesita internet). Cualquier otro valor es un error: el server arranca igual pero no manda avisos (quedan pendientes) hasta que se corrija. |
| `WHATSAPP_SESION_DIR` | `server/data/whatsapp-sesion` | Carpeta donde queda la sesión de WhatsApp (con `AVISOS_ENVIO=baileys`). Son **credenciales**: nunca se comparte ni se sube a git. Borrarla = desvincular. |

## API

Los endpoints que **escriben** exigen el header `x-pin` con el PIN (si no, `401`).

| Endpoint | Qué hace |
| --- | --- |
| `GET /api/health` | `{ ok: true }`, para saber si el server está vivo. |
| `GET /api/vehiculos` | Autos de `/display`: con servicios anidados, del que hace más tiempo que entró al más nuevo, sin los terminados hace más de `HORAS_VISIBLE_TERMINADO` ni los retirados. No pide PIN; **solo con `x-pin` válido** incluye `telefono` (si no, la clave no aparece). |
| `GET /api/vehiculos?todos=1` | Igual, pero para `/admin`: incluye también los terminados hace rato (sigue sin los retirados). Mismo criterio con `telefono`. |
| `POST /api/login` | Valida el PIN (body `{ pin }`). `{ ok: true }` o `401`. |
| `POST /api/vehiculos` | Alta de un auto con sus servicios iniciales (todos en `esperando`). `telefono` es opcional (celular uruguayo; `400` si no es válido). |
| `PATCH /api/vehiculos/:id` | Edita marca/modelo/color/matrícula y `telefono` (no toca fecha ni servicios). `telefono: ""` lo borra; si no se manda, queda el que estaba. |
| `POST /api/vehiculos/:id/retirar` | Retira el auto (soft delete). |
| `POST /api/vehiculos/:id/servicios` | Agrega un servicio (body `{ tipo }`). |
| `PATCH /api/servicios/:id` | Cambia el estado de un servicio (body `{ estado }`). |
| `DELETE /api/servicios/:id` | Quita un servicio (soft delete; `400` si es el último activo del auto). |

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
  de estado por servicio, agregar/quitar servicios y retirar autos.
- ✅ Tablas + datos de ejemplo que se crean solos la primera vez; migración
  automática de las columnas nuevas sobre bases ya existentes.
- ✅ Los autos con todos los servicios terminados se ocultan solos a las 4 horas
  (vía el poll de 30 s, como red de seguridad).
- ✅ Tiempo real con Socket.IO: el server emite en cada escritura y `/display`
  refetchea al recibir el evento.

App completa: las cuatro fases de funcionalidad están terminadas.
