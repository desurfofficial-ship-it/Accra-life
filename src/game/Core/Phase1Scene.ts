import * as THREE from 'three';
import { InputManager } from '../Player/InputManager';
import { ColliderBox, PlayerController } from '../Player/PlayerController';
import { ThirdPersonCamera } from '../Player/ThirdPersonCamera';
import { InteractableTarget, InteractionSystem } from '../Player/InteractionSystem';
import { buildFirstNeighborhoodBlock } from '../World/NeighborhoodBlock';
import { updatePlayerCompoundCutaway } from '../World/PlayerCompound';
import { getSurfaceHeightAt } from '../World/WorldSurface';
import { CharacterRig, type PlayerLookOptions } from '../Art/CharacterBuilder';
import { Canvas3DFallbackRenderer } from './Canvas3DFallbackRenderer';

export interface Phase1Callbacks {
  onTargetChanged: (target: InteractableTarget | null) => void;
  onTargetInteracted: (target: InteractableTarget) => void;
}

export interface Phase1Options {
  look?: PlayerLookOptions;
}

interface ActiveRenderer {
  domElement: HTMLCanvasElement;
  setSize(width: number, height: number): void;
  setPixelRatio(value: number): void;
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
}

export class Phase1Scene {
  public readonly scene: THREE.Scene;
  public renderer: ActiveRenderer | null;
  public readonly inputManager: InputManager;
  public readonly player: PlayerController;
  public readonly thirdPersonCamera: ThirdPersonCamera;
  public readonly interactionSystem: InteractionSystem;
  public readonly npcRigs: CharacterRig[];

  /**
   * Custom map integration: when the R3F canvas (src/r3f) owns the visible
   * view, main.ts disables ONLY this scene's render call — the simulation
   * above it (player, interactions, NPC rigs, camera) keeps running so the
   * systems layer stays live while the GPU draws just the custom map.
   */
  public renderEnabled = true;

  /** Mobile perf (PR spec point 2): when #r3f-root exists, Phase1Scene
   *  must NOT create a WebGLRenderer — R3F owns the visible canvas. The
   *  simulation (player, interactions, NPC rigs, camera) keeps running so
   *  the systems layer stays live while the GPU draws just the custom map.
   *  this.renderer is null in this mode; all calls are guarded. */
  private readonly r3fActive: boolean;

  private readonly container: HTMLElement;
  private colliders: ColliderBox[] = [];
  // v4.11: performance.now() delta replaces THREE.Clock (deprecated in newer
  // three — it logged a console warning on every boot). Same semantics:
  // seconds since previous frame, clamped to 0.1s.
  private lastFrameMs = performance.now();
  private callbacks: Phase1Callbacks;
  private usingFallback = false;
  private sunLight: THREE.DirectionalLight | null = null;

  constructor(container: HTMLElement, callbacks: Phase1Callbacks, options?: Phase1Options) {
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdcebfa);
    this.scene.fog = new THREE.FogExp2(0xdcebfa, 0.012);

    const initW = container.clientWidth || window.innerWidth;
    const initH = container.clientHeight || window.innerHeight;

    // Detect R3F ownership BEFORE creating a renderer. When R3F owns the
    // visible canvas, Phase1Scene runs simulation-only (no WebGL context,
    // no shadow map, no canvas appended). Saves ~30MB of GPU memory + a
    // whole second WebGL context that iOS will kill the tab over.
    const r3fRoot = document.getElementById('r3f-root');
    this.r3fActive = !!r3fRoot;

    this.renderer = this.r3fActive ? null : this.createSafeRenderer(initW, initH);

    // Custom map integration: #r3f-root hosts the live 5x5 Accra grid
    // (src/r3f — the player-facing world). It renders ABOVE this canvas,
    // so it must survive the container wipe below.
    r3fRoot?.remove();
    container.innerHTML = '';
    if (r3fRoot) container.appendChild(r3fRoot);
    if (this.renderer) {
      container.appendChild(this.renderer.domElement);
    }

    this.setupLighting();

    const block = buildFirstNeighborhoodBlock(this.scene);
    this.colliders = block.colliders;
    this.npcRigs = block.npcRigs;

    this.inputManager = new InputManager();

    this.player = new PlayerController(
      this.inputManager,
      new THREE.Vector3(0, 0, 5.8),
      options?.look
    );
    this.scene.add(this.player.group);

    this.thirdPersonCamera = new ThirdPersonCamera(
      this.container,
      this.inputManager,
      this.player.position
    );

    this.interactionSystem = new InteractionSystem(
      this.scene,
      this.inputManager,
      (target) => this.callbacks.onTargetChanged(target),
      (target) => this.callbacks.onTargetInteracted(target)
    );

    for (let i = 0; i < block.interactables.length; i++) {
      this.interactionSystem.registerTarget(block.interactables[i]);
    }

    const handleViewportResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (this.renderer) {
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      }
      this.thirdPersonCamera.resize(w, h);
    };

    window.addEventListener('resize', handleViewportResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleViewportResize, 60);
    });

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => handleViewportResize());
      ro.observe(container);
    }

    this.animate();
  }

  private createSafeRenderer(width: number, height: number): ActiveRenderer {
    try {
      const webgl = new THREE.WebGLRenderer({ antialias: true });
      const gl = webgl.getContext();
      if (gl && !gl.isContextLost()) {
        webgl.setSize(width, height);
        webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        webgl.shadowMap.enabled = true;
        // v4.11: PCFSoftShadowMap was removed in newer three — setting it
        // logged a deprecation warning on every boot (three already fell
        // back to PCFShadowMap internally, so this is behavior-identical).
        webgl.shadowMap.type = THREE.PCFShadowMap;
        webgl.toneMapping = THREE.ACESFilmicToneMapping;
        webgl.toneMappingExposure = 1.1;

        webgl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          this.switchToFallbackRenderer();
        });

        return webgl;
      }
      webgl.dispose();
    } catch {
      // Fall through
    }

    this.usingFallback = true;
    const fallback = new Canvas3DFallbackRenderer(width, height);
    fallback.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    return fallback;
  }

  private switchToFallbackRenderer(): void {
    if (this.usingFallback) return;
    this.usingFallback = true;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const fallback = new Canvas3DFallbackRenderer(w, h);
    fallback.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer = fallback;
    this.container.innerHTML = '';
    this.container.appendChild(fallback.domElement);
  }

  private setupLighting(): void {
    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0xd8b48e, 0.92);
    hemiLight.position.set(0, 32, 0);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff3d6, 1.55);
    sunLight.position.set(18, 28, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 80;
    const d = 24;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = 0.0002;
    sunLight.shadow.normalBias = 0.02;
    this.sunLight = sunLight;
    this.scene.add(sunLight);
    this.scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.45);
    rimLight.position.set(-14, 14, -16);
    this.scene.add(rimLight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const nowMs = performance.now();
    const dt = Math.min((nowMs - this.lastFrameMs) / 1000, 0.1);
    this.lastFrameMs = nowMs;

    this.player.update(dt, this.thirdPersonCamera.yaw, this.colliders);

    // ── Custom-map player mirror ─────────────────────────────────────────
    // When the R3F map layer is live, the VISIBLE avatar is authoritative:
    // copy its position + facing into the systems player every frame so
    // gameAPI.position, getActiveTarget(), getLocationAt(), the location
    // pill, presence and the compound cutaway all follow the avatar the
    // player actually sees (and that TroTroBoarding's proximity reads).
    // Without this mirror the hidden player and the visible avatar drift
    // apart — the AI would read positions/targets for a player nobody
    // can see on the map. The hidden controller's own integration result
    // is discarded (velocity zeroed); the avatar drives everything.
    const r3fPlayer = (window as unknown as {
      __r3fPlayer?: { current: { position: THREE.Vector3; rotation: { y: number } } | null };
    }).__r3fPlayer;
    const visibleAvatar = r3fPlayer?.current ?? null;
    if (visibleAvatar) {
      this.player.position.set(
        visibleAvatar.position.x,
        getSurfaceHeightAt(visibleAvatar.position.x, visibleAvatar.position.z),
        visibleAvatar.position.z
      );
      this.player.rotationY = visibleAvatar.rotation.y;
      this.player.group.rotation.y = visibleAvatar.rotation.y;
      this.player.velocity.set(0, 0, 0);
    }

    updatePlayerCompoundCutaway(this.player.position);

    if (this.sunLight) {
      this.sunLight.position.set(this.player.position.x + 18, 28, this.player.position.z + 20);
      this.sunLight.target.position.set(this.player.position.x, 0, this.player.position.z);
      this.sunLight.target.updateMatrixWorld();
    }

    for (let i = 0; i < this.npcRigs.length; i++) {
      this.npcRigs[i].updateAnimation(dt, false, false, i * 1.8);
    }

    this.thirdPersonCamera.update(dt, this.player.position, this.colliders);
    this.interactionSystem.update(dt, this.player.position, this.player.getForwardVector());

    if (this.renderEnabled && this.renderer) {
      try {
        this.renderer.render(this.scene, this.thirdPersonCamera.camera);
      } catch {
        this.switchToFallbackRenderer();
        if (this.renderer) this.renderer.render(this.scene, this.thirdPersonCamera.camera);
      }
    }
  };
}
