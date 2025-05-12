import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/MineriaDatos-BUAP/',
  server: {
    open: true,
    host: true,
  },
})
