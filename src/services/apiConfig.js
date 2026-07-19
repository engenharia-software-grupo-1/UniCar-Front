const IS_JSDOM =
  typeof navigator !== 'undefined' &&
  /jsdom/i.test(navigator.userAgent || '');

const USE_DEV_PROXY = Boolean(import.meta.hot) && !IS_JSDOM;

export const API_BASE_URL = USE_DEV_PROXY
  ? ''
  : import.meta.env.VITE_API_URL || '';

export function shouldUseMocks() {
  return (
    (import.meta.env.DEV || import.meta.env.MODE === 'test') &&
    import.meta.env.VITE_ENABLE_MOCKS === 'true'
  );
}

export function shouldUseLocalDataMocks() {
  return shouldUseMocks();
}

export function shouldUseDevelopmentFallbacks() {
  return false;
}
