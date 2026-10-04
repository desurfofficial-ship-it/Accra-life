import * as THREE from 'three';
import { ColliderBox, PlayerController } from '../Player/PlayerController';
import { ThirdPersonCamera } from '../Player/ThirdPersonCamera';
import { InteractableTarget, InteractionSystem } from '../Player/InteractionSystem';
import { buildFirstNeighborhoodBlock } from '../World/NeighborhoodBlock';

export interface Phase1Callbacks {
  onTargetChanged: (target: InteractableTarget | null) => void;
  onTargetInteracted: (target: InteractableTarget) => void;
  onTelemetryUpdate?: (x: number, z: number, speedLabel: string, nearestLabel: string) => void;
}

export class Phase1Scene {
  public readonly scene: THREE.Scene;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly player: PlayerController;
  public readonly thirdPersonCamera: ThirdPersonCamera;
  public readonly interactionSystem: InteractionSystem;

  private colliders: ColliderBox[] = [];
  private clock = new THREE.Clock();
  private callbacks: Phase1Callbacks;

  constructor(container: HTMLElement, callbacks: Phase1Callbacks) {
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdfeffc); // Warm coastal Accra sky
    this.scene.fog = new THREE.FogExp2(0xdfeffc, 0.013);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.setupLighting();

    // Build the First Playable Accra Neighborhood Block (Art Bible compliant)
    const block = buildFirstNeighborhoodBlock(this.scene);
    this.colliders = block.colliders;

    // Spawn player on the residential walkway
    this.player = new PlayerController(new THREE.Vector3(0, 0, 5.8));
    this.scene.add(this.player.group);

    this.thirdPersonCamera = new ThirdPersonCamera(this.renderer.domElement, this.player.position);

    this.interactionSystem = new InteractionSystem(
      this.scene,
      (target) => this.callbacks.onTargetChanged(target),
      (target) => this.callbacks.onTargetInteracted(target)
    );

    for (const target of block.interactables) {
      this.interactionSystem.registerTarget(target);
    }

    window.addEventListener('resize', () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      this.renderer.setSize(w, h);
      this.thirdPersonCamera.resize(w, h);
    });

    this.animate();
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
    this.thirdPersonCamera.update(dt, this.player.position);
    this.interactionSystem.update(dt, this.player.position, this.player.getForwardVector());

    if (this.callbacks.onTelemetryUpdate) {
      const speedLabel = this.player.isSprinting
        ? 'Jogging'
        : this.player.isMoving
          ? 'Walking'
          : 'Idle';
      const active = this.interactionSystem.getActiveTarget();
      this.callbacks.onTelemetryUpdate(
        this.player.position.x,
        this.player.position.z,
        speedLabel,
        active ? active.assetId : 'None'
      );
    }

    this.renderer.render(this.scene, this.thirdPersonCamera.camera);
  };
}
