import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The API runs on a small Express server during development; Vite proxies
// /api and /uploads to it so the front-end can use same-origin paths.
const API_PORT = process.env.API_PORT || 8787

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
      '/media': `http://localhost:${API_PORT}`,
      // The OG image is served by the API (uploaded via the admin System tab).
      '/og.png': `http://localhost:${API_PORT}`,
    },
  },
  build: {
    outDir: 'dist',
  },
})
