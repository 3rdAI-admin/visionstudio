import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // jsdom disables localStorage/sessionStorage for opaque origins (its
    // default url, about:blank) — a real http(s) url is required for the
    // app's hooks (useApiKey, useModel) that read localStorage on mount.
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3002',
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
