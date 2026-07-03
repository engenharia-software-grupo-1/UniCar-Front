const IS_JSDOM =
  typeof navigator !== 'undefined' &&
  /jsdom/i.test(navigator.userAgent || '');

const USE_DEV_PROXY = Boolean(import.meta.hot) && !IS_JSDOM;
const USE_DEV_DATA_MOCKS = import.meta.env.DEV && !IS_JSDOM;

export const API_BASE_URL = USE_DEV_PROXY
  ? ''
  : import.meta.env.VITE_API_URL || '';

export function shouldUseMocks() {
  return import.meta.env.VITE_ENABLE_MOCKS === 'true';
}

export function shouldUseLocalDataMocks() {
  return shouldUseMocks() || USE_DEV_DATA_MOCKS;
}
