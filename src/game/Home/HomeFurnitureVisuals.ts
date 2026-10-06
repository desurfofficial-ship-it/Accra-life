import * as THREE from 'three';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { FURNITURE_CATALOG, type FurnitureId } from './HomeSystem';

/** Courtyard slots — outside veranda */
const COURTYARD_SLOTS: [number, number, number][] = [
  [-12.4, 0.12, 9.6],
  [-11.2, 0.12, 9.5],
  [-9.6, 0.12, 9.6],
  [-12.6, 0.12, 10.8],
  [-10.5, 0.12, 10.6],
  [-8.6, 0.12, 10.8]
];

/** Interior slots — inside hollowed room */
const INTERIOR_SLOTS: [number, number, number][] = [
  [-12.8, 0.12, 13.2],
  [-9.0, 0.12, 14.6],
  [-9.2, 0.12, 12.4],
  [-12.6, 0.12, 14.4],
  [-10.5, 0.12, 13.5],
  [-11.5, 0.12, 12.2]
];

export class HomeFurnitureVisuals {
  private readonly scene: THREE.Scene;
  private readonly root: THREE.Group;
  private readonly interiorShell: THREE.Group;
  private meshes = new Map<FurnitureId, THREE.Object3D>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'HOME_FURNITURE';
    this.scene.add(this.root);
    this.interiorShell = this.buildInteriorShell();
    this.scene.add(this.interiorShell);
  }

  private buildInteriorShell(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'HOME_INTERIOR_SHELL';

    const floorMat = sharedArtLibrary.getMaterial('home_interior_floor', {
      color: 0xd6c3a8,
      roughness: 0.82
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.06, 4.4), floorMat);
    floor.position.set(-10.5, 0.14, 13.1);
    floor.receiveShadow = true;
    g.add(floor);

    const trim = sharedArtLibrary.getMaterial('home_baseboard', {
      color: 0xf8fafc,
      roughness: 0.6
    });
    const boardN = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 0.06), trim);
    boardN.position.set(-10.5, 0.22, 15.2);
    const boardS = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 0.06), trim);
    boardS.position.set(-10.5, 0.22, 11.0);
    g.add(boardN, boardS);

    const metal = sharedArtLibrary.getMaterial('home_fan_metal', {
      color: 0x4b5563,
      roughness: 0.35,
      metalness: 0.5
    });
    const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), metal);
    fanHub.position.set(-10.5, 3.15, 13.1);
    const bladeMat = sharedArtLibrary.getMaterial('home_fan_blade', {
      color: 0xe5e7eb,
      roughness: 0.55
    });
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.18), bladeMat);
      const a = (i / 3) * Math.PI * 2;
      blade.position.set(-10.5 + Math.cos(a) * 0.35, 3.12, 13.1 + Math.sin(a) * 0.35);
      blade.rotation.y = a;
      g.add(blade);
    }
    g.add(fanHub);

    const doorMat = sharedArtLibrary.getMaterial('home_door_mat', {
      color: 0x7c2d12,
      roughness: 0.9
    });
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.5), doorMat);
    mat.position.set(-10.5, 0.16, 11.15);
    g.add(mat);

    return g;
  }

  public sync(owned: FurnitureId[]): void {
    const set = new Set(owned);

    for (const [id, mesh] of this.meshes) {
      if (!set.has(id)) {
        this.root.remove(mesh);
        this.meshes.delete(id);
      }
    }

    for (const id of set) {
      if (this.meshes.has(id)) continue;
      const item = FURNITURE_CATALOG.find((f) => f.id === id);
      if (!item) continue;
      const mesh = this.buildMesh(id);
      const slots = item.zone === 'interior' ? INTERIOR_SLOTS : COURTYARD_SLOTS;
      const pos = slots[item.slot % slots.length];
      mesh.position.set(pos[0], pos[1], pos[2]);
      if (id === 'kente_cloth') {
        mesh.position.set(-13.9, 1.4, 13.5);
        mesh.rotation.y = Math.PI / 2;
      }
      if (id === 'generator') {
        mesh.position.set(-8.4, 0.12, 14.8);
      }
      this.root.add(mesh);
      this.meshes.set(id, mesh);
    }
  }

  private buildMesh(id: FurnitureId): THREE.Object3D {
    const g = new THREE.Group();
    g.name = id;

    const wood = sharedArtLibrary.getMaterial(`furn_wood_${id}`, {
      color: 0x78350f,
      roughness: 0.65
    });
    const plastic = sharedArtLibrary.getMaterial(`furn_plastic_${id}`, {
      color: 0x1d4ed8,
      roughness: 0.4
    });
    const metal = sharedArtLibrary.getMaterial(`furn_metal_${id}`, {
      color: 0x374151,
      roughness: 0.4,
      metalness: 0.45
    });
    const fabric = sharedArtLibrary.getMaterial(`furn_fabric_${id}`, {
      color: 0x047857,
      roughness: 0.85
    });
    const kenteGold = sharedArtLibrary.getMaterial(`furn_kente_gold_${id}`, {
      color: 0xf59e0b,
      roughness: 0.55
    });
    const kenteGreen = sharedArtLibrary.getMaterial(`furn_kente_green_${id}`, {
      color: 0x15803d,
      roughness: 0.55
    });
    const kenteRed = sharedArtLibrary.getMaterial(`furn_kente_red_${id}`, {
      color: 0xb91c1c,
      roughness: 0.55
    });
    const white = sharedArtLibrary.getMaterial(`furn_white_${id}`, {
      color: 0xf1f5f9,
      roughness: 0.5
    });

    switch (id) {
      case 'plastic_chair': {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), plastic);
        seat.position.y = 0.42;
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.05), plastic);
        back.position.set(0, 0.65, -0.18);
        for (const [ox, oz] of [
          [-0.15, -0.15],
          [0.15, -0.15],
          [-0.15, 0.15],
          [0.15, 0.15]
        ] as [number, number][]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), plastic);
          leg.position.set(ox, 0.2, oz);
          g.add(leg);
        }
        g.add(seat, back);
        break;
      }
      case 'wooden_stool': {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.06, 10), wood);
        top.position.y = 0.38;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.04), wood);
          leg.position.set(Math.cos(a) * 0.12, 0.18, Math.sin(a) * 0.12);
          g.add(leg);
        }
        g.add(top);
        break;
      }
      case 'plastic_table': {
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.55), plastic);
        top.position.y = 0.72;
        for (const [ox, oz] of [
          [-0.38, -0.2],
          [0.38, -0.2],
          [-0.38, 0.2],
          [0.38, 0.2]
        ] as [number, number][]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), plastic);
          leg.position.set(ox, 0.35, oz);
          g.add(leg);
        }
        g.add(top);
        break;
      }
      case 'sofa': {
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.35, 0.55), fabric);
        base.position.y = 0.28;
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.45, 0.14), fabric);
        back.position.set(0, 0.58, -0.2);
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.5), fabric);
        armL.position.set(-0.62, 0.42, 0);
        const armR = armL.clone();
        armR.position.x = 0.62;
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.42), white);
        cushion.position.y = 0.48;
        g.add(base, back, armL, armR, cushion);
        break;
      }
      case 'bed': {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.28, 0.85), wood);
        frame.position.y = 0.22;
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.14, 0.75), white);
        mattress.position.y = 0.42;
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.28), fabric);
        pillow.position.set(0, 0.52, -0.22);
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 0.08), wood);
        headboard.position.set(0, 0.55, -0.4);
        g.add(frame, mattress, pillow, headboard);
        break;
      }
      case 'tv': {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.35), wood);
        stand.position.y = 0.25;
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.06), metal);
        screen.position.set(0, 0.75, 0);
        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(0.58, 0.34, 0.02),
          sharedArtLibrary.getMaterial('tv_screen', {
            color: 0x0ea5e9,
            roughness: 0.25,
            metalness: 0.3
          })
        );
        glow.position.set(0, 0.75, 0.04);
        g.add(stand, screen, glow);
        break;
      }
      case 'fridge': {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.5), white);
        body.position.y = 0.68;
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.04), metal);
        handle.position.set(0.22, 0.75, 0.28);
        g.add(body, handle);
        break;
      }
      case 'kente_cloth': {
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 1.1), wood);
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.28), kenteGold);
        s1.position.set(0.04, 0, -0.3);
        const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.28), kenteGreen);
        s2.position.set(0.04, 0, 0);
        const s3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.28), kenteRed);
        s3.position.set(0.04, 0, 0.3);
        g.add(back, s1, s2, s3);
        break;
      }
      case 'sound_box': {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 0.35), metal);
        box.position.y = 0.38;
        g.add(box);
        break;
      }
      case 'generator': {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.5, 0.5),
          sharedArtLibrary.getMaterial('gen_red', { color: 0xdc2626, roughness: 0.45 })
        );
        body.position.y = 0.3;
        const tank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), metal);
        tank.position.set(0.15, 0.58, 0);
        g.add(body, tank);
        break;
      }
      case 'flower_pots': {
        for (const ox of [-0.22, 0.22]) {
          const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.13, 0.24, 10),
            sharedArtLibrary.getMaterial('pot_terra', { color: 0xb45309, roughness: 0.8 })
          );
          pot.position.set(ox, 0.12, 0);
          const leaf = new THREE.Mesh(
            new THREE.SphereGeometry(0.14, 8, 6),
            sharedArtLibrary.getMaterial('leaf_green', { color: 0x16a34a, roughness: 0.8 })
          );
          leaf.position.set(ox, 0.34, 0);
          g.add(pot, leaf);
        }
        break;
      }
      case 'rug': {
        const rug = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.04, 1.1),
          sharedArtLibrary.getMaterial('rug_pattern', { color: 0xa16207, roughness: 0.9 })
        );
        rug.position.y = 0.02;
        g.add(rug);
        break;
      }
      default:
        break;
    }

    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    return g;
  }
}
