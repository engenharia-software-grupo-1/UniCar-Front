/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    // A suíte exercita o caminho real de fetch/MSW; força os mocks internos
    // dos services OFF, independente do VITE_ENABLE_MOCKS do .env de dev.
    env: {
      VITE_ENABLE_MOCKS: 'false',
      VITE_API_URL: 'http://localhost:8080',
    },
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:8080',
      '/usuarios': 'http://localhost:8080',
      '/caronas': 'http://localhost:8080',
      '/veiculos': 'http://localhost:8080',
      '/avaliacoes': 'http://localhost:8080',
    },
  },
})
