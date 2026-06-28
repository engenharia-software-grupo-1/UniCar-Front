import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

// Worker MSW para o navegador (modo dev, atrás da flag VITE_ENABLE_MOCKS).
export const worker = setupWorker(...handlers);
