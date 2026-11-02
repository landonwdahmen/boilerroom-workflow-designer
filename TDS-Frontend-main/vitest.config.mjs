import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Unit tests use the same React transform, without starting a server or reading TLS keys.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.test.{js,jsx}'],
    clearMocks: true,
    mockReset: true,
    environmentOptions: { jsdom: { url: 'https://localhost:3000' } },
  },
});
