import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Production builds are served by Django/WhiteNoise under /static/
  base: command === 'build' ? '/static/' : '/',
  server: {
    port: 5176,
  },
}))
