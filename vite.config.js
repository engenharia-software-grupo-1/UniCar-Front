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
    // dos services OFF, independente do que estiver no .env de dev.
    // VITE_MOCK_FALTANTES também precisa ser fixado: sem isso o .env local
    // vaza para cá e os fallbacks de mock engolem os erros que os testes
    // esperam ver propagados (ex.: caronaService.listarMinhasCaronas).
    env: {
      VITE_ENABLE_MOCKS: 'false',
      VITE_MOCK_FALTANTES: 'false',
      VITE_API_URL: 'http://localhost:8080',
    },
    coverage: {
      provider: 'v8',
      // `all: true` conta também os arquivos que NENHUM teste importou — sem
      // isto o número fica inflado (arquivos sem teste somem da conta em vez
      // de entrar como 0%). `include` restringe à fonte de produção.
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/mocks/**',
        'src/test/**',
        'src/data/**',
        'src/main.jsx',
        // Markup estático / re-exports sem lógica testável — deliberadamente
        // fora da conta para o número refletir só o que vale cobrir.
        'src/pages/Home/**',
        'src/pages/NaoEncontrada/**',
        'src/routes/**',
      ],
      reporter: ['text', 'html', 'json-summary'],
      // Sem isto, um único teste vermelho deixa `test:coverage` MUDO (nenhum
      // relatório, nem terminal nem HTML).
      reportOnFailure: true,
    },
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:8080',
      '/usuarios': 'http://localhost:8080',
      '/caronas': 'http://localhost:8080',
      '/reservas': 'http://localhost:8080',
      '/trajetos-recorrentes': 'http://localhost:8080',
      '/veiculos': 'http://localhost:8080',
      '/avaliacoes': 'http://localhost:8080',
    },
  },
})
