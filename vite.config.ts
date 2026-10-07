import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the two heavyweight libraries into their own cached chunks.
        // three.js (~600KB) and firebase (~300KB) change far less often than
        // game code, so browsers keep them in cache between deploys; the
        // game chunk alone shrinks from ~1.3MB to a few hundred KB.
        // NOTE: Vite 8 bundles rolldown, which only supports the FUNCTION
        // form of manualChunks (the object form throws at build time).
        manualChunks(id: string): string | undefined {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          return undefined;
        },
      },
    },
  },
});
