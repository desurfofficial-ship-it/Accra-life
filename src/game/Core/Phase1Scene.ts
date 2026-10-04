import * as THREE from 'three';
import { InputManager } from '../Player/InputManager';
import { ColliderBox, PlayerController } from '../Player/PlayerController';
import { ThirdPersonCamera } from '../Player/ThirdPersonCamera';
import { InteractableTarget, InteractionSystem } from '../Player/InteractionSystem';
import { buildFirstNeighborhoodBlock } from '../World/NeighborhoodBlock';
import { Canvas3DFallbackRenderer } from './Canvas3DFallbackRenderer';

export interface Phase1Callbacks {
  onTargetChanged: (target: InteractableTarget | null) => void;
  onTargetInteracted: (target: InteractableTarget) => void;
}

interface ActiveRenderer {
  domElement: HTMLCanvasElement;
  setSize(width: number, height: number): void;
  setPixelRatio(value: number): void;
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
}

function canCompileWebGLShaders(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = (testCanvas.getContext('webgl2') ||
      testCanvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl || gl.isContextLost()) {
      return false;
    }
    const shader = gl.createShader(gl.VERTEX_SHADER);
    if (!shader || !(shader instanceof WebGLShader)) {
      return false;
    }
    gl.shaderSource(shader, 'void main() { gl_Position = vec4(0.0); }');
    gl.compileShader(shader);
    const ok = Boolean(gl.getShaderParameter(shader, gl.COMPILE_STATUS));
    gl.deleteShader(shader);
    return ok;
  } catch {
    return false;
  }
}

export class Phase1Scene {
  public readonly scene: THREE.Scene;
  public renderer: ActiveRenderer;
  public readonly inputManager: InputManager;
  public readonly player: PlayerController;
  public readonly thirdPersonCamera: ThirdPersonCamera;
  public readonly interactionSystem: InteractionSystem;

  private readonly container: HTMLElement;
  private colliders: ColliderBox[] = [];
  private clock = new THREE.Clock();
  private callbacks: Phase1Callbacks;
  private usingFallback = false;

  constructor(container: HTMLElement, callbacks: Phase1Callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdfeffc);
    this.scene.fog = new THREE.FogExp2(0xdfeffc, 0.013);

    const initW = container.clientWidth || window.innerWidth;
    const initH = container.clientHeight || window.innerHeight;

    this.renderer = this.createSafeRenderer(initW, initH);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.setupLighting();

    // Build the First Playable Accra Neighborhood Block
    const block = buildFirstNeighborhoodBlock(this.scene);
    this.colliders = block.colliders;

    // Initialize centralized InputManager
    this.inputManager = new InputManager();

    // Spawn player at a safe location on the South pedestrian walkway
    this.player = new PlayerController(this.inputManager, new THREE.Vector3(0, 0, 5.8));
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
    if (canCompileWebGLShaders()) {
      try {
        const webgl = new THREE.WebGLRenderer({ antialias: true });
        const gl = webgl.getContext();
        if (gl && !gl.isContextLost() && gl.createShader(gl.VERTEX_SHADER) instanceof WebGLShader) {
          webgl.setSize(width, height);
          webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          webgl.shadowMap.enabled = true;
          webgl.shadowMap.type = THREE.PCFSoftShadowMap;
          webgl.toneMapping = THREE.ACESFilmicToneMapping;
          webgl.toneMappingExposure = 1.08;

          webgl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            this.switchToFallbackRenderer();
          });

          return webgl;
        }
        webgl.dispose();
      } catch {
        // Fall through to Canvas3DFallbackRenderer
      }
    }

    this.usingFallback = true;
    const fallback = new Canvas3DFallbackRenderer(width, height);
    fallback.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x9ca3af, 0.85);
    hemiLight.position.set(0, 30, 0);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
    sunLight.position.set(16, 26, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 85;
    const d = 30;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.player.update(dt, this.thirdPersonCamera.yaw, this.colliders);
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
