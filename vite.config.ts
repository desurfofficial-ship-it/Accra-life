import { defineConfig } from 'vite';

export default defineConfig({
  base: '/lagos-life-ghana/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});
