import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 43124,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
  },
});
