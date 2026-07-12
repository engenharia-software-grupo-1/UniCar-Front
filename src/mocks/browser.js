import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';
import { handlersFaltantes } from './handlersFaltantes.js';

// Worker MSW para o navegador (modo dev, atrás da flag VITE_ENABLE_MOCKS).
export const worker = setupWorker(...handlers);

// Modo híbrido (VITE_MOCK_FALTANTES): mocka só os endpoints que a API ainda não
// tem; o resto atravessa e chega no backend real.
export const workerFaltantes = setupWorker(...handlersFaltantes);
