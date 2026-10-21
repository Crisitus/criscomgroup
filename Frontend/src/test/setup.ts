import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { server } from './msw-handlers';

// window.matchMedia no existe en jsdom — mock requerido por useTheme (zustand persist)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Iniciar servidor MSW antes de todos los tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

afterEach(() => {
  // Resetear handlers MSW a los defaults después de cada test
  server.resetHandlers();
  // Limpiar componentes renderizados
  cleanup();
});

afterAll(() => server.close());

// Preparar estado limpio de window/localStorage antes de cada test
beforeEach(() => {
  localStorage.clear();
  // api.ts declara estas variables globales en window; inicializarlas para el entorno jsdom
  window.failedQueue = [];
  window.processQueue = () => {};
  window.isRefreshing = false;
  window.isRedirecting = false;
  Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });
});
