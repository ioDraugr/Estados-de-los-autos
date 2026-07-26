import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En dev, el front corre en :5173 y el backend en :3000.
// Redirigimos /api y /socket.io al backend para poder desarrollar por separado.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Escucha en toda la red local (no solo en localhost), así se puede probar
    // /display desde el celular o la tablet del taller con la IP de la compu.
    // El proxy de abajo lo resuelve Vite en la compu, así que los otros
    // dispositivos no necesitan saber nada del backend.
    host: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
})
