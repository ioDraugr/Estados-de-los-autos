@echo off
rem Levanta (o actualiza) el tablero del taller con Docker Desktop y muestra
rem las direcciones para abrir desde la pantalla, la tablet y la PC.
rem Uso: doble clic en este archivo (ver README).
setlocal EnableExtensions EnableDelayedExpansion
rem UTF-8 para que se vean bien las tildes.
chcp 65001 >nul
title Tablero del taller

rem Todo se corre desde la carpeta del script (donde está docker-compose.yml).
cd /d "%~dp0"

rem --- ¿Está Docker? ---
where docker >nul 2>&1
if errorlevel 1 goto :sin_docker

docker info >nul 2>&1
if errorlevel 1 goto :docker_apagado

docker compose version >nul 2>&1
if errorlevel 1 goto :sin_compose

rem --- Configuración ---
rem Si no hay .env, se crea uno a partir del modelo, así queda a mano para
rem cambiar el PIN inicial, los avisos, etc.
if not exist ".env" if exist ".env.example" (
  copy /y ".env.example" ".env" >nul
  echo Se creó .env a partir de .env.example, ahí se cambia la configuración.
)

rem Carpeta de los backups automáticos (ver docker-compose.yml): tiene que
rem existir antes de levantar.
if not exist "server\data\backups" mkdir "server\data\backups"

rem --- Levantar ---
echo Levantando el tablero. La primera vez tarda unos minutos y necesita internet...
docker compose up -d --build
if errorlevel 1 goto :fallo_up

rem --- Esperar a que responda ---
rem Docker marca el contenedor como "healthy" cuando /api/health contesta.
rem Se prueba cada 2 segundos, hasta 60 segundos.
echo Esperando a que el server responda...
set "CONTENEDOR="
for /f "delims=" %%i in ('docker compose ps -q taller') do set "CONTENEDOR=%%i"
set /a INTENTOS=0
:esperar
set "ESTADO="
if defined CONTENEDOR (
  for /f "delims=" %%s in ('docker inspect -f "{{.State.Health.Status}}" !CONTENEDOR! 2^>nul') do set "ESTADO=%%s"
)
if "!ESTADO!"=="healthy" goto :listo
set /a INTENTOS+=1
if !INTENTOS! geq 30 goto :fallo_salud
rem Pausa de 2 segundos (ping anda aunque la ventana no tenga teclado).
ping -n 3 127.0.0.1 >nul
goto :esperar

:listo
rem --- Direcciones ---
rem Puerto real de la PC (sale del .env), por ej. "0.0.0.0:3000": se queda
rem con lo que está después del último ":".
set "PUERTO_WEB="
for /f "delims=" %%p in ('docker compose port taller 3000') do if not defined PUERTO_WEB set "PUERTO_WEB=%%p"
if not defined PUERTO_WEB set "PUERTO_WEB=3000"
:recortar
if not "!PUERTO_WEB!"=="!PUERTO_WEB:*:=!" (
  set "PUERTO_WEB=!PUERTO_WEB:*:=!"
  goto :recortar
)

rem IP de esta PC en la red del taller: la de la placa que tiene salida por
rem defecto (wifi o cable).
set "IP="
for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1).IPv4Address.IPAddress"`) do if not defined IP set "IP=%%a"
if not defined IP set "IP=localhost"

echo.
echo Listo, el tablero está andando. Abrí desde cualquier dispositivo del taller:
echo   Pantalla del showroom: http://!IP!:!PUERTO_WEB!/display
echo   Vendedores, admin:     http://!IP!:!PUERTO_WEB!/admin
echo   Taller:                http://!IP!:!PUERTO_WEB!/taller
echo.
echo Logs, y el QR de WhatsApp: docker compose logs -f
echo Si Windows pregunta por el firewall, permití el acceso en redes privadas.
goto :fin

:sin_docker
echo No se encontró Docker en esta PC.
echo Instalá Docker Desktop: https://docs.docker.com/desktop/setup/install/windows-install/
goto :fin_error

:docker_apagado
echo Docker está instalado pero no está corriendo.
echo Abrí Docker Desktop, esperá a que diga "Engine running" y volvé a correr este archivo.
echo Para que arranque solo: Docker Desktop, Settings, General,
echo "Start Docker Desktop when you sign in to your computer".
goto :fin_error

:sin_compose
echo Falta "docker compose". Actualizá Docker Desktop:
echo https://docs.docker.com/desktop/setup/install/windows-install/
goto :fin_error

:fallo_up
echo No se pudo levantar el tablero.
echo Si arriba dice "address already in use", el puerto está ocupado: cambiá PUERTO en el .env.
goto :logs

:fallo_salud
echo El server no respondió en 60 segundos, estado: !ESTADO!
goto :logs

:logs
echo.
echo Últimos logs del server:
docker compose logs --tail 50

:fin_error
echo.
pause
endlocal
exit /b 1

:fin
echo.
pause
endlocal
exit /b 0
