import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '../mocks/server.js';
import { resetStore } from '../mocks/handlers.js';

// Esta versão do jsdom não expõe localStorage; instala um mock em memória.
class LocalStorageMock {
  #store = new Map();

  get length() {
    return this.#store.size;
  }

  clear() {
    this.#store.clear();
  }

  getItem(key) {
    return this.#store.has(String(key)) ? this.#store.get(String(key)) : null;
  }

  setItem(key, value) {
    this.#store.set(String(key), String(value));
  }

  removeItem(key) {
    this.#store.delete(String(key));
  }

  key(index) {
    return [...this.#store.keys()][index] ?? null;
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new LocalStorageMock(),
  writable: true,
  configurable: true,
});

// Sobe o servidor MSW para toda a suíte; erra se alguma request não for tratada.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  server.resetHandlers();
  resetStore();
});

afterAll(() => server.close());
