# Tablero de estados — Taller ML Center

## Qué es
Web app para mostrar en una pantalla táctil del showroom el estado de los
autos que están en el taller. Los clientes tocan su auto y ven en qué anda.
Los trabajadores/encargado actualizan el estado desde una tablet o PC.

## Cómo corre
Todo local, en la red del taller, SIN internet. Una sola máquina hace de
servidor (queda prendida). Los demás dispositivos (pantalla del showroom,
tablet, PC) se conectan por la IP local del servidor.

## Vistas (con React Router)
- /display : para clientes. Solo lectura, sin login. Modo kiosko, pantalla
  táctil vista de lejos: textos y botones GRANDES, alto contraste.
- /admin   : para trabajadores. Login por PIN. Alta de autos y cambio de
  estados con botones grandes.

## Áreas de trabajo (con su color de cono)
- instalacion = rojo
- polarizado  = azul
- vitrificado = amarillo

## Estados (POR SERVICIO, no por auto)
esperando -> en_proceso -> terminado
Un auto está "terminado" solo cuando TODOS sus servicios están terminados.

## Stack
- Front: Vite + React + TypeScript + Tailwind.
- Back: Node + Express (sirve el build del front y una API REST).
- DB: SQLite con better-sqlite3 (un solo archivo local).
- Tiempo real: Socket.IO (el server avisa a las pantallas cuando algo cambia,
  con reconexión automática si se cae el wifi).

## Modelo de datos
- vehiculos(id, marca, modelo, color, matricula, fecha_ingreso)
- servicios(id, vehiculo_id, tipo, estado)
En /display cada auto se muestra como "marca modelo color" + los últimos 3-4
dígitos de la matrícula. NUNCA mostrar la matrícula entera (privacidad).

## Reglas de trabajo
- Todo en español (interfaz y textos).
- Mobile / touch-first: pensado para dedos, no para mouse.
- Nada de <form> con submit raro: usar onClick/onChange.
- Construir POR FASES. No hagas todo de una.
- Antes de cada fase, proponeme un plan corto y esperá mi OK.
- Preguntá antes de cualquier decisión de arquitectura.
- Hacé un commit de git al terminar cada fase, con un mensaje claro.
- Dejá un README con las instrucciones para correr el proyecto.
