import * as THREE from 'three';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { FURNITURE_CATALOG, type FurnitureId } from './HomeSystem';

/** Fixed courtyard slots relative to compound group origin (-10.5, 0, 12.2) */
const SLOT_POS: [number, number, number][] = [
  [-12.2, 0.12, 10.4],
  [-11.0, 0.12, 10.4],
  [-9.8, 0.12, 10.4],
  [-12.0, 0.12, 11.6],
  [-10.5, 0.12, 11.4],
  [-9.0, 0.12, 11.6]
];

export class HomeFurnitureVisuals {
  private readonly scene: THREE.Scene;
  private readonly root: THREE.Group;
  private meshes = new Map<FurnitureId, THREE.Object3D>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'HOME_FURNITURE';
    this.scene.add(this.root);
  }

  public sync(owned: FurnitureId[]): void {
    const set = new Set(owned);

    // Remove unowned
    for (const [id, mesh] of this.meshes) {
      if (!set.has(id)) {
        this.root.remove(mesh);
        this.meshes.delete(id);
      }
    }

    // Add missing
    for (const id of set) {
      if (this.meshes.has(id)) continue;
      const item = FURNITURE_CATALOG.find((f) => f.id === id);
      if (!item) continue;
      const mesh = this.buildMesh(id);
      const pos = SLOT_POS[item.slot % SLOT_POS.length];
      mesh.position.set(pos[0], pos[1], pos[2]);
      // Offset if slot shared
      if (this.slotOccupied(item.slot, id)) {
        mesh.position.x += 0.55;
        mesh.position.z += 0.35;
      }
      this.root.add(mesh);
      this.meshes.set(id, mesh);
    }
  }

  private slotOccupied(slot: number, except: FurnitureId): boolean {
    for (const [id] of this.meshes) {
      if (id === except) continue;
      const item = FURNITURE_CATALOG.find((f) => f.id === id);
      if (item && item.slot === slot) return true;
    }
    return false;
  }

  private buildMesh(id: FurnitureId): THREE.Object3D {
    const g = new THREE.Group();
    g.name = id;

    const wood = sharedArtLibrary.getMaterial(`furn_wood_${id}`, {
      color: 0x78350f,
      roughness: 0.65
    });
    const plastic = sharedArtLibrary.getMaterial(`furn_plastic_${id}`, {
      color: 0x1e3a5f,
      roughness: 0.45
    });
    const metal = sharedArtLibrary.getMaterial(`furn_metal_${id}`, {
      color: 0x374151,
      roughness: 0.4,
      metalness: 0.4
    });
    const fabric = sharedArtLibrary.getMaterial(`furn_fabric_${id}`, {
      color: 0x059669,
      roughness: 0.85
    });
    const accent = sharedArtLibrary.getMaterial(`furn_accent_${id}`, {
      color: 0xf59e0b,
      roughness: 0.5
    });

    switch (id) {
      case 'plastic_chair': {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), plastic);
        seat.position.y = 0.42;
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.06), plastic);
        back.position.set(0, 0.64, -0.18);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), plastic);
        for (const [x, z] of [
          [-0.16, -0.16],
          [0.16, -0.16],
          [-0.16, 0.16],
          [0.16, 0.16]
        ] as [number, number][]) {
          const l = leg.clone();
          l.position.set(x, 0.2, z);
          g.add(l);
        }
        g.add(seat, back);
        break;
      }
      case 'wooden_stool': {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.06, 12), wood);
        top.position.y = 0.38;
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.06), wood);
        leg.position.y = 0.18;
        g.add(top, leg);
        break;
      }
      case 'plastic_table': {
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.55), plastic);
        top.position.y = 0.55;
        for (const [x, z] of [
          [-0.38, -0.2],
          [0.38, -0.2],
          [-0.38, 0.2],
          [0.38, 0.2]
        ] as [number, number][]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 0.05), plastic);
          leg.position.set(x, 0.26, z);
          g.add(leg);
        }
        g.add(top);
        break;
      }
      case 'sofa': {
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.55), fabric);
        base.position.y = 0.28;
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.12), fabric);
        back.position.set(0, 0.55, -0.22);
        g.add(base, back);
        break;
      }
      case 'tv': {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.35), wood);
        stand.position.y = 0.25;
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.06), metal);
        screen.position.set(0, 0.72, 0);
        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(0.58, 0.34, 0.02),
          sharedArtLibrary.getMaterial('tv_screen', { color: 0x0ea5e9, roughness: 0.3, metalness: 0.2 })
        );
        glow.position.set(0, 0.72, 0.04);
        g.add(stand, screen, glow);
        break;
      }
      case 'fridge': {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.45), metal);
        body.position.y = 0.6;
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), accent);
        handle.position.set(0.22, 0.7, 0.24);
        g.add(body, handle);
        break;
      }
      case 'bed': {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 0.7), wood);
        frame.position.y = 0.2;
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.62), fabric);
        mattress.position.y = 0.36;
        g.add(frame, mattress);
        break;
      }
      case 'kente_cloth': {
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.04), accent);
        cloth.position.y = 0.9;
        g.add(cloth);
        break;
      }
      case 'sound_box': {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.3), metal);
        box.position.y = 0.35;
        g.add(box);
        break;
      }
      case 'generator': {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.45), metal);
        body.position.y = 0.28;
        const tank = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), accent);
        tank.position.set(0.15, 0.55, 0);
        g.add(body, tank);
        break;
      }
      case 'flower_pots': {
        for (const ox of [-0.2, 0.2]) {
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 10), wood);
          pot.position.set(ox, 0.12, 0);
          const leaf = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 8, 6),
            sharedArtLibrary.getMaterial('leaf_green', { color: 0x16a34a, roughness: 0.8 })
          );
          leaf.position.set(ox, 0.32, 0);
          g.add(pot, leaf);
        }
        break;
      }
      case 'rug': {
        const rug = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 1.0), fabric);
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
