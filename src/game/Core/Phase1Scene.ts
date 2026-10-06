import * as THREE from 'three';
import { InputManager } from '../Player/InputManager';
import { ColliderBox, PlayerController } from '../Player/PlayerController';
import { ThirdPersonCamera } from '../Player/ThirdPersonCamera';
import { InteractableTarget, InteractionSystem } from '../Player/InteractionSystem';
import { buildFirstNeighborhoodBlock } from '../World/NeighborhoodBlock';
import { updatePlayerCompoundCutaway } from '../World/PlayerCompound';
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
  public renderer: ActiveRenderer;
  public readonly inputManager: InputManager;
  public readonly player: PlayerController;
  public readonly thirdPersonCamera: ThirdPersonCamera;
  public readonly interactionSystem: InteractionSystem;
  public readonly npcRigs: CharacterRig[];

  private readonly container: HTMLElement;
  private colliders: ColliderBox[] = [];
  private clock = new THREE.Clock();
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

    this.renderer = this.createSafeRenderer(initW, initH);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

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
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
        webgl.shadowMap.type = THREE.PCFSoftShadowMap;
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

    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.player.update(dt, this.thirdPersonCamera.yaw, this.colliders);
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

    try {
      this.renderer.render(this.scene, this.thirdPersonCamera.camera);
    } catch {
      this.switchToFallbackRenderer();
      this.renderer.render(this.scene, this.thirdPersonCamera.camera);
    }
  };
}
