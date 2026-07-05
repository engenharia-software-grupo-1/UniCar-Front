const IS_JSDOM =
  typeof navigator !== 'undefined' &&
  /jsdom/i.test(navigator.userAgent || '');

const USE_DEV_PROXY = Boolean(import.meta.hot) && !IS_JSDOM;

export const API_BASE_URL = USE_DEV_PROXY
  ? ''
  : import.meta.env.VITE_API_URL || '';

export function shouldUseMocks() {
  return import.meta.env.VITE_ENABLE_MOCKS === 'true';
}

// Os mocks de dados (localStorage) dos serviços dependem SÓ da flag: com
// VITE_ENABLE_MOCKS=false, mesmo em `npm run dev`, os serviços batem no backend
// real (via proxy). Assim dá para alternar offline/backend só pelo .env.
export function shouldUseLocalDataMocks() {
  return shouldUseMocks();
}
