/**
 * DebugOverlay — ?debug=1 fixed panel for diagnosing 3D scene issues.
 *
 * Toggled on by appending ?debug=1 to the URL. Shows:
 *   - WebGL vendor + renderer strings
 *   - R3F canvas CSS size vs drawing-buffer size (catches stretched blurs)
 *   - devicePixelRatio + the live dpr R3F is using
 *   - renderer.info.render.calls + triangles (refreshed each second)
 *   - renderer.info.memory.geometries + textures count
 *   - JS heap if performance.memory is available (Chrome)
 *   - live FPS (rolling average)
 *   - AssetBoundary failures (collected via the global __assetFailures array)
 *   - document.elementsFromPoint(center) computed opacity + backdrop-filter
 *     + filter for each element over the viewport (catches blur culprits)
 *
 * Off by default — no perf cost when ?debug=1 is absent.
 *
 * Mobile backdrop-filter stripping: on `matchMedia('(pointer: coarse)')`
 * devices, this module proactively strips backdrop-filter from any element
 * that overlaps the canvas. iOS Safari is notoriously expensive with
 * backdrop-filter over WebGL — it forces a separate compositing layer +
 * re-renders the entire page each frame.
 */
import type { WebGLRenderer } from 'three';

interface AssetFailureRecord {
  name: string;
  message: string;
  at: number;
}

declare global {
  interface Window {
    __assetFailures?: AssetFailureRecord[];
    __debugGetR3FRenderer?: () => WebGLRenderer | null;
  }
}

// Initialize the global failure collector (AssetBoundary pushes here).
if (typeof window !== 'undefined' && !window.__assetFailures) {
  window.__assetFailures = [];
}

const DEBUG_ENABLED =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('debug');

const IS_MOBILE =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(pointer: coarse)').matches;

/** Strip backdrop-filter from elements that overlap the canvas (mobile only). */
function stripBackdropFilterOnMobile(): void {
  if (!IS_MOBILE) return;
  // Walk the DOM + remove backdrop-filter from any element with it. This is
  // crude but effective — backdrop-filter over WebGL is extremely expensive
  // on iOS Safari (forces a separate compositing layer + re-renders the
  // entire page each frame). Replace with a solid rgba background.
  const all = document.querySelectorAll('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i] as HTMLElement;
    const cs = getComputedStyle(el);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') {
      el.style.backdropFilter = 'none';
      (el.style as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter = 'none';
      if (cs.background === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'rgba(0, 0, 0, 0)') {
        el.style.background = 'rgba(9, 13, 22, 0.92)';
      }
    }
    if (cs.filter && cs.filter !== 'none' && cs.filter.includes('blur')) {
      el.style.filter = 'none';
    }
  }
}

let overlayEl: HTMLDivElement | null = null;
let rafHandle: number | null = null;
let fpsSamples: number[] = [];
let lastFrameMs = performance.now();

function tick(): void {
  if (!overlayEl) return;
  const now = performance.now();
  const dt = now - lastFrameMs;
  lastFrameMs = now;
  fpsSamples.push(1000 / Math.max(1, dt));
  if (fpsSamples.length > 60) fpsSamples.shift();
  const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
  if (Math.floor(now / 250) !== Math.floor((now - dt) / 250)) {
    overlayEl.innerHTML = renderPanelContents(avgFps);
  }
  rafHandle = requestAnimationFrame(tick);
}

function renderPanelContents(fps: number): string {
  const renderer = window.__debugGetR3FRenderer?.() ?? null;
  const canvas = document.querySelector('#r3f-root canvas') as HTMLCanvasElement | null;
  const cssSize = canvas ? `${canvas.clientWidth}x${canvas.clientHeight}` : '(no canvas)';
  const buffer = canvas ? `${canvas.width}x${canvas.height}` : '(no buffer)';
  const dpr = window.devicePixelRatio || 1;

  let glInfo = '(no GL)';
  if (renderer) {
    const gl = renderer.getContext();
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const vendor = ext ? gl!.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl?.getParameter(gl.VENDOR);
    const rend = ext ? gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
    glInfo = `${vendor} / ${rend}`;
  }

  const info = renderer?.info;
  const renderCalls = info?.render.calls ?? '?';
  const triangles = info?.render.triangles ?? '?';
  const geometries = info?.memory.geometries ?? '?';
  const textures = info?.memory.textures ?? '?';

  const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  const heapMb = heap ? `${Math.round(heap.usedJSHeapSize / 1024 / 1024)}MB` : '(n/a)';

  const failures = window.__assetFailures ?? [];
  const failuresList = failures.length === 0 ? '(none)' : failures.map(f => `${f.name}: ${f.message}`).join('<br>  ');

  let centerStack = '(n/a)';
  try {
    const els = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    centerStack = els.slice(0, 5).map((el) => {
      const cs = getComputedStyle(el as HTMLElement);
      const id = (el as HTMLElement).id || (el as HTMLElement).className?.toString?.() || el.tagName;
      return `${id} [opacity=${cs.opacity}, backdrop-filter=${cs.backdropFilter}, filter=${cs.filter}]`;
    }).join('<br>  ');
  } catch { /* document not ready */ }

  return `
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;line-height:1.45;color:#f8fafc">
      <div style="color:#facc15;font-weight:700">DEBUG (?debug=1)${IS_MOBILE ? ' · MOBILE' : ''}</div>
      <div>FPS: <b>${fps.toFixed(1)}</b></div>
      <div>WebGL: ${glInfo}</div>
      <div>canvas CSS: ${cssSize} · buffer: ${buffer}</div>
      <div>devicePixelRatio: ${dpr}</div>
      <div>render.calls: ${renderCalls} · triangles: ${triangles}</div>
      <div>memory: geometries=${geometries} textures=${textures}</div>
      <div>JS heap: ${heapMb}</div>
      <div style="margin-top:4px;color:#94a3b8">[asset] failures:</div>
      <div style="color:#fb923c">  ${failuresList}</div>
      <div style="margin-top:4px;color:#94a3b8">elements @ center:</div>
      <div style="color:#a5b4fc">  ${centerStack}</div>
    </div>
  `;
}

export function initDebugOverlay(): void {
  if (!DEBUG_ENABLED) return;
  if (overlayEl) return;
  overlayEl = document.createElement('div');
  overlayEl.style.cssText = [
    'position:fixed', 'top:60px', 'left:14px', 'z-index:99999',
    'background:rgba(9,13,22,0.92)', 'border:1.5px solid #facc15',
    'border-radius:8px', 'padding:8px 10px', 'max-width:380px',
    'pointer-events:none', 'box-shadow:0 4px 14px rgba(0,0,0,0.5)',
  ].join(';');
  document.body.appendChild(overlayEl);
  rafHandle = requestAnimationFrame(tick);
}

/** Strip mobile backdrop-filters + start the debug panel (if enabled). */
export function bootstrapDebugOverlay(): void {
  stripBackdropFilterOnMobile();
  initDebugOverlay();
}

/** AssetBoundary pushes here so the panel can display them. */
export function recordAssetFailure(name: string, message: string): void {
  if (typeof window === 'undefined') return;
  if (!window.__assetFailures) window.__assetFailures = [];
  window.__assetFailures.push({ name, message, at: Date.now() });
  if (window.__assetFailures.length > 50) window.__assetFailures.shift();
}

/** Check if mobile (pointer: coarse). Used by StreetCanvas for dpr/antialias. */
export const isMobileDevice = (): boolean => IS_MOBILE;
