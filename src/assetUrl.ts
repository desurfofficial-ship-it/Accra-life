/**
 * assetUrl — Vite-aware asset path helper.
 *
 * Vite's `import.meta.env.BASE_URL` is the base path the app is served
 * from. Locally it's `'/'`; on GitHub Pages it's `'/Accra-life/'` (the
 * `base: './'` config in vite.config.ts resolves to the repo path at
 * build time when the build is for Pages).
 *
 * Every asset path that's used as a URL string (passed to useGLTF /
 * useLoader / fetch / etc.) must go through `assetUrl()` so it resolves
 * correctly on both localhost and Pages. Without this, hardcoded
 * absolute asset paths resolve to a 404 on Pages because the repo
 * subdir is missing.
 *
 * Usage:
 *   import { assetUrl } from '../assetUrl';
 *   const url = assetUrl('assets/glb/foo.glb');
 *   useGLTF(url)
 *
 * The leading slash is stripped automatically — pass either
 * `assets/glb/foo.glb` or with a leading slash, both work.
 */
export const assetUrl = (p: string): string =>
  `${import.meta.env.BASE_URL}${p.replace(/^\/+/, '')}`;
