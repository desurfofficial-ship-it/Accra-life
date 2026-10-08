/**
 * DebugOverlay — ?debug=1 fixed panel for diagnosing 3D scene + movement.
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

function stripBackdropFilterOnMobile(): void {
  if (!IS_MOBILE) return;
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
  const failuresList =
    failures.length === 0
      ? '(none)'
      : failures.map((f) => `${f.name}: ${f.message}`).join('<br>  ');

  const api = (window as unknown as {
    GameAPI?: { input?: { getMovementInput: () => { moveX: number; moveZ: number; magnitude: number } } };
  }).GameAPI;
  const gameApiReady = !!api;
  let joy = '(no api)';
  if (api?.input) {
    const m = api.input.getMovementInput();
    joy = `x=${m.moveX.toFixed(2)} z=${m.moveZ.toFixed(2)} mag=${m.magnitude.toFixed(2)}`;
  }
  const r3f = (window as unknown as {
    __r3fPlayer?: { current?: { position?: { x: number; z: number } } };
  }).__r3fPlayer;
  const avatarRef = !!(r3f && r3f.current);
  const pos = r3f?.current?.position;
  const avatarPos = pos ? `x=${pos.x.toFixed(1)} z=${pos.z.toFixed(1)}` : '(null)';

  return `
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;line-height:1.45;color:#f8fafc">
      <div style="color:#facc15;font-weight:700">DEBUG (?debug=1)${IS_MOBILE ? ' · MOBILE' : ''}</div>
      <div>FPS: <b>${fps.toFixed(1)}</b></div>
      <div>joystick: <b>${joy}</b></div>
      <div>GameAPI: <b>${gameApiReady ? 'yes' : 'NO'}</b> · avatar ref: <b>${avatarRef ? 'yes' : 'NO'}</b></div>
      <div>avatar pos: ${avatarPos}</div>
      <div>WebGL: ${glInfo}</div>
      <div>canvas CSS: ${cssSize} · buffer: ${buffer}</div>
      <div>devicePixelRatio: ${dpr}</div>
      <div>render.calls: ${renderCalls} · triangles: ${triangles}</div>
      <div>memory: geometries=${geometries} textures=${textures}</div>
      <div>JS heap: ${heapMb}</div>
      <div style="margin-top:4px;color:#94a3b8">[asset] failures:</div>
      <div style="color:#fb923c">  ${failuresList}</div>
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

export function bootstrapDebugOverlay(): void {
  stripBackdropFilterOnMobile();
  initDebugOverlay();
}

export function recordAssetFailure(name: string, message: string): void {
  if (typeof window === 'undefined') return;
  if (!window.__assetFailures) window.__assetFailures = [];
  window.__assetFailures.push({ name, message, at: Date.now() });
  if (window.__assetFailures.length > 50) window.__assetFailures.shift();
}

export const isMobileDevice = (): boolean => IS_MOBILE;
