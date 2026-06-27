import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

// Servidor MSW para o ambiente Node (Vitest).
export const server = setupServer(...handlers);
