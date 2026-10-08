import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: '/Accra-life/',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 3000, host: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
