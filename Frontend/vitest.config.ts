import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Mantener el cliente API alineado con los handlers de MSW también al
    // ejecutar `npm test` fuera de Docker o CI.
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3100/api'),
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      css: true,
    },
  })
);
