import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('.', import.meta.url));
// Private TLS files are read only by Node, never through a VITE_* variable.
function localhostHttps() {
  try {
    return {
      cert: readFileSync(resolve(root, '../.local/https/localhost.pem')),
      key: readFileSync(resolve(root, '../.local/https/localhost.key')),
    };
  } catch {
    throw new Error('Trusted localhost certificate files are required. See FRONTEND_INTEGRATION.md.');
  }
}

export default defineConfig(({ command, isPreview }) => ({
  root,
  plugins: [react()],
  // Keep production artifacts in the established, ignored frontend directory.
  build: { outDir: resolve(root, 'build'), emptyOutDir: true },
  server: {
    host: 'localhost', port: 3000, strictPort: true,
    allowedHosts: ['localhost'],
    https: command === 'serve' ? localhostHttps() : undefined,
    cors: { origin: 'https://localhost:3000' },
    fs: { strict: true, allow: [root] },
  },
  preview: { host: 'localhost', port: 3000, strictPort: true, https: isPreview ? localhostHttps() : undefined },
}));
