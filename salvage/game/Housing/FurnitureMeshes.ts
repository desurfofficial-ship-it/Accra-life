/**
 * Accra Life — Furniture Meshes (procedural)
 *
 * Generates a Three.js Group per catalog item using procedural geometry
 * (boxes, cylinders, spheres) matching the existing sharedArtLibrary
 * pattern from NeighborhoodBlock / NeighborhoodFood / etc.
 *
 * This is the PLACEHOLDER pipeline — Phase 1 engine. Per the product spec
 * (section 41):
 *   "Phase 1 — ENGINE: ... Use approximately 20–40 optimized assets for
 *    the first complete vertical slice."
 *   "Phase 5 — ACCRA AUTHENTICITY: Begin replacing high-visibility generic
 *    assets with Ghanaian furniture... Do this progressively. Do not block
 *    MVP development waiting for custom art."
 *
 * When CC0 GLB assets are ingested via the asset pipeline (Quaternius,
 * Kenney, Mastjie, LowPolyAssets, KayKit, Quin — see assets/README.md),
 * this module will be replaced by an ExternalAssetLoader that loads GLBs
 * by assetPath from the registry. The PlacementEngine API stays the same.
 *
 * Each mesh generator returns a Group with:
 *   - Pivot at bottom-center (origin at floor level, +Y up)
 *   - Forward = +Z (so rotation 0 = facing south)
 *   - Dimensions matching the catalog item's dimensions field
 */

import * as THREE from 'three';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import type { FurnitureId } from '../Home/HomeSystem';

/** Cache of materials by key (avoids creating 100s of duplicate materials). */
function mat(key: string, opts: THREE.MeshStandardMaterialParameters): THREE.Material {
  return sharedArtLibrary.getMaterial(`furn_${key}`, opts);
}
function basicMat(key: string, opts: THREE.MeshBasicMaterialParameters): THREE.Material {
  return sharedArtLibrary.getBasicMaterial(`furn_basic_${key}`, opts);
}

/**
 * Build a Three.js Group for the given catalog item. Returns a Group with
 * the item's geometry centered at origin (bottom on the floor at y=0).
 *
 * For items without a specific generator, falls back to a generic
 * dimension-matched box (so every catalog item has SOME visual).
 */
export function buildFurnitureMesh(id: FurnitureId): THREE.Group {
  const group = new THREE.Group();
  group.name = `FURNITURE_${id}`;

  switch (id) {
    case 'bed_basic':
    case 'bed':
      buildBed(group, id === 'bed');
      break;
    case 'chair_plastic':
    case 'plastic_chair':
      buildPlasticChair(group);
      break;
    case 'chair_wooden':
    case 'wooden_stool':
      buildWoodenChair(group, id === 'wooden_stool');
      break;
    case 'table_small':
    case 'plastic_table':
      buildSmallTable(group);
      break;
    case 'table_dining':
      buildDiningTable(group);
      break;
    case 'sofa_basic':
    case 'sofa':
      buildSofa(group, id === 'sofa');
      break;
    case 'tv_basic':
    case 'tv':
      buildTV(group);
      break;
    case 'fridge_basic':
    case 'fridge':
      buildFridge(group, id === 'fridge');
      break;
    case 'cooker_gas':
      buildGasCooker(group);
      break;
    case 'toilet_basic':
      buildToilet(group);
      break;
    case 'shower_basic':
      buildBucketShower(group);
      break;
    case 'fan_standing':
      buildStandingFan(group);
      break;
    case 'wardrobe_basic':
      buildWardrobe(group);
      break;
    case 'rug':
      buildRug(group);
      break;
    case 'kente_cloth':
      buildKenteCloth(group);
      break;
    case 'sound_box':
      buildSoundBox(group);
      break;
    case 'generator':
      buildGenerator(group);
      break;
    case 'flower_pots':
      buildFlowerPots(group);
      break;
    default:
      buildGenericBox(group);
  }

  return group;
}

// ============================================================================
// Bed — wooden frame + mattress + pillow
// ============================================================================
function buildBed(group: THREE.Group, premium: boolean): void {
  const matFrame = mat('bed_frame_wood', { color: premium ? 0x6b3410 : 0x8b4513, roughness: 0.7 });
  const matMattress = mat('bed_mattress', { color: premium ? 0xf8fafc : 0xe2e8f0, roughness: 0.85 });
  const matPillow = mat('bed_pillow', { color: 0xf8fafc, roughness: 0.9 });
  const matBlanket = mat('bed_blanket', { color: premium ? 0x1e40af : 0x475569, roughness: 0.8 });

  // Frame (4 legs + side rails)
  const frameH = 0.35;
  const legGeo = new THREE.BoxGeometry(0.08, frameH, 0.08);
  for (const [lx, lz] of [[-0.45, -0.95], [0.45, -0.95], [-0.45, 0.95], [0.45, 0.95]] as [number, number][]) {
    const leg = new THREE.Mesh(legGeo, matFrame);
    leg.position.set(lx, frameH / 2, lz);
    leg.castShadow = true;
    group.add(leg);
  }
  // Side rails
  for (const sz of [-0.95, 0.95]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), matFrame);
    rail.position.set(0, frameH - 0.04, sz);
    group.add(rail);
  }
  for (const sx of [-0.45, 0.45]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.9), matFrame);
    rail.position.set(sx, frameH - 0.04, 0);
    group.add(rail);
  }
  // Mattress
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 1.9), matMattress);
  mattress.position.set(0, frameH + 0.09, 0);
  mattress.castShadow = true;
  group.add(mattress);
  // Pillow at the head (+Z)
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.3), matPillow);
  pillow.position.set(0, frameH + 0.23, 0.78);
  group.add(pillow);
  // Blanket (covers lower 2/3)
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 1.3), matBlanket);
  blanket.position.set(0, frameH + 0.2, -0.2);
  group.add(blanket);
}

// ============================================================================
// Plastic monobloc chair (Ghanaian staple)
// ============================================================================
function buildPlasticChair(group: THREE.Group): void {
  const matPlastic = mat('chair_plastic_white', { color: 0xf8fafc, roughness: 0.55, metalness: 0.05 });

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.45), matPlastic);
  seat.position.set(0, 0.42, 0);
  seat.castShadow = true;
  group.add(seat);
  // Backrest (slightly tilted)
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.04), matPlastic);
  back.position.set(0, 0.65, -0.2);
  back.rotation.x = -0.12;
  back.castShadow = true;
  group.add(back);
  // 4 legs
  for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), matPlastic);
    leg.position.set(lx, 0.21, lz);
    group.add(leg);
  }
}

// ============================================================================
// Carved wooden chair
// ============================================================================
function buildWoodenChair(group: THREE.Group, isStool: boolean): void {
  const matWood = mat('chair_wood_dark', { color: 0x6b3410, roughness: 0.65 });

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.45), matWood);
  seat.position.set(0, 0.45, 0);
  seat.castShadow = true;
  group.add(seat);
  if (!isStool) {
    // Backrest with vertical slats
    for (const bx of [-0.15, 0, 0.15]) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), matWood);
      slat.position.set(bx, 0.7, -0.2);
      group.add(slat);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.04), matWood);
    rail.position.set(0, 0.92, -0.2);
    group.add(rail);
  }
  // 4 legs
  for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 8), matWood);
    leg.position.set(lx, 0.225, lz);
    group.add(leg);
  }
}

// ============================================================================
// Small wooden table
// ============================================================================
function buildSmallTable(group: THREE.Group): void {
  const matWood = mat('table_wood', { color: 0x92400e, roughness: 0.7 });
  // Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.55), matWood);
  top.position.set(0, 0.72, 0);
  top.castShadow = true;
  group.add(top);
  // 4 legs
  for (const [lx, lz] of [[-0.38, -0.22], [0.38, -0.22], [-0.38, 0.22], [0.38, 0.22]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), matWood);
    leg.position.set(lx, 0.36, lz);
    group.add(leg);
  }
}

// ============================================================================
// Dining table (4-seater, 2x1 grid footprint)
// ============================================================================
function buildDiningTable(group: THREE.Group): void {
  const matWood = mat('dining_table_wood', { color: 0x78350f, roughness: 0.65 });
  // Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.75), matWood);
  top.position.set(0, 0.75, 0);
  top.castShadow = true;
  group.add(top);
  // 4 legs
  for (const [lx, lz] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.08), matWood);
    leg.position.set(lx, 0.37, lz);
    group.add(leg);
  }
}

// ============================================================================
// Sofa (2-seater)
// ============================================================================
function buildSofa(group: THREE.Group, premium: boolean): void {
  const matBody = mat('sofa_body', { color: premium ? 0x1e3a8a : 0x475569, roughness: 0.85 });
  const matCushion = mat('sofa_cushion', { color: premium ? 0x60a5fa : 0x94a3b8, roughness: 0.8 });

  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.35, 0.75), matBody);
  base.position.set(0, 0.18, 0);
  base.castShadow = true;
  group.add(base);
  // Seat cushions (2)
  for (const cx of [-0.38, 0.38]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.65), matCushion);
    cushion.position.set(cx, 0.42, 0.03);
    cushion.castShadow = true;
    group.add(cushion);
  }
  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 0.15), matBody);
  back.position.set(0, 0.6, -0.3);
  back.castShadow = true;
  group.add(back);
  // Armrests
  for (const sx of [-0.78, 0.78]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.45, 0.75), matBody);
    arm.position.set(sx, 0.4, 0);
    arm.castShadow = true;
    group.add(arm);
  }
}

// ============================================================================
// Flatscreen TV (wall-mounted, thin)
// ============================================================================
function buildTV(group: THREE.Group): void {
  const matFrame = mat('tv_frame', { color: 0x0f172a, roughness: 0.4, metalness: 0.5 });
  const matScreen = basicMat('tv_screen', { color: 0x1e293b });

  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.05), matFrame);
  frame.position.set(0, 0.85, 0);
  frame.castShadow = true;
  group.add(frame);
  // Screen (slightly inset, dark blue-black)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.45), matScreen);
  screen.position.set(0, 0.85, 0.026);
  group.add(screen);
  // Stand (small base + neck)
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.2), matFrame);
  standBase.position.set(0, 0.45, 0);
  group.add(standBase);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.06), matFrame);
  neck.position.set(0, 0.55, 0);
  group.add(neck);
}

// ============================================================================
// Single-door fridge
// ============================================================================
function buildFridge(group: THREE.Group, premium: boolean): void {
  const matBody = mat('fridge_body', { color: premium ? 0xe2e8f0 : 0x94a3b8, roughness: 0.45, metalness: 0.6 });
  const matHandle = mat('fridge_handle', { color: 0x1e293b, roughness: 0.35, metalness: 0.7 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.55), matBody);
  body.position.set(0, 0.7, 0);
  body.castShadow = true;
  group.add(body);
  // Door split line (horizontal groove)
  const split = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.01), matHandle);
  split.position.set(0, 1.0, 0.28);
  group.add(split);
  // Handle (vertical bar on the right side of the upper door)
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.35, 0.025), matHandle);
  handle.position.set(0.22, 1.15, 0.29);
  group.add(handle);
}

// ============================================================================
// 2-burner gas cooker (Ghanaian-style with cylinder visible)
// ============================================================================
function buildGasCooker(group: THREE.Group): void {
  const matBody = mat('cooker_body', { color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
  const matGrate = mat('cooker_grate', { color: 0x0f172a, roughness: 0.7 });
  const matCylinder = mat('cooker_cylinder', { color: 0xb91c1c, roughness: 0.6, metalness: 0.3 });

  // Body (stove top)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.45), matBody);
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  group.add(body);
  // 4 legs
  for (const [lx, lz] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.04), matBody);
    leg.position.set(lx, 0.4, lz);
    group.add(leg);
  }
  // 2 burners (grates)
  for (const bx of [-0.13, 0.13]) {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12), matGrate);
    burner.position.set(bx, 0.86, 0);
    group.add(burner);
  }
  // Gas cylinder (visible on the side, tucked under)
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 14), matCylinder);
  cylinder.position.set(0, 0.25, 0.55);
  cylinder.castShadow = true;
  group.add(cylinder);
  // Hose from cylinder to stove
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), matBody);
  hose.position.set(0, 0.5, 0.35);
  hose.rotation.x = Math.PI / 2.5;
  group.add(hose);
}

// ============================================================================
// Squat toilet (low-profile ceramic)
// ============================================================================
function buildToilet(group: THREE.Group): void {
  const matCeramic = mat('toilet_ceramic', { color: 0xf8fafc, roughness: 0.3, metalness: 0.05 });

  // Bowl (squat-style: low wide slab)
  const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.7), matCeramic);
  bowl.position.set(0, 0.075, 0);
  bowl.castShadow = true;
  group.add(bowl);
  // Footrests (2 small platforms on either side)
  for (const sx of [-0.32, 0.32]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.55), matCeramic);
    foot.position.set(sx, 0.04, 0);
    group.add(foot);
  }
  // Hole (dark patch on top — visual cue)
  const matHole = basicMat('toilet_hole', { color: 0x0f172a });
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.4), matHole);
  hole.position.set(0, 0.151, 0);
  hole.rotation.x = -Math.PI / 2;
  group.add(hole);
}

// ============================================================================
// Bucket shower (bucket + cup + small platform)
// ============================================================================
function buildBucketShower(group: THREE.Group): void {
  const matBucket = mat('shower_bucket', { color: 0x1e40af, roughness: 0.5 });
  const matCup = mat('shower_cup', { color: 0x60a5fa, roughness: 0.45 });
  const matFloor = mat('shower_floor_pad', { color: 0x475569, roughness: 0.85 });

  // Floor pad (drainage area)
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16), matFloor);
  pad.position.set(0, 0.02, 0);
  pad.receiveShadow = true;
  group.add(pad);
  // Bucket (tall cylinder)
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.55, 14), matBucket);
  bucket.position.set(0, 0.32, 0);
  bucket.castShadow = true;
  group.add(bucket);
  // Cup (smaller cup sitting on top or beside)
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 10), matCup);
  cup.position.set(0.18, 0.08, 0);
  group.add(cup);
}

// ============================================================================
// Standing fan (oscillating)
// ============================================================================
function buildStandingFan(group: THREE.Group): void {
  const matPole = mat('fan_pole', { color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
  const matBlade = mat('fan_blade', { color: 0x475569, roughness: 0.5 });
  const matBase = mat('fan_base', { color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
  const matGuard = mat('fan_guard', { color: 0x94a3b8, roughness: 0.4, metalness: 0.5 });

  // Base (cross-shaped for stability)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.05, 16), matBase);
  base.position.set(0, 0.025, 0);
  base.castShadow = true;
  group.add(base);
  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 10), matPole);
  pole.position.set(0, 0.75, 0);
  group.add(pole);
  // Motor housing
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), matPole);
  motor.position.set(0, 1.45, 0);
  motor.rotation.z = Math.PI / 2;
  group.add(motor);
  // 3 blades
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.01, 0.08), matBlade);
    const ang = (i * 2 * Math.PI) / 3;
    blade.position.set(Math.cos(ang) * 0.2, 1.45, Math.sin(ang) * 0.2);
    blade.rotation.y = ang;
    group.add(blade);
  }
  // Guard ring (front face)
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 24), matGuard);
  guard.position.set(0, 1.45, 0.08);
  group.add(guard);
}

// ============================================================================
// Wooden wardrobe (tall, against wall)
// ============================================================================
function buildWardrobe(group: THREE.Group): void {
  const matBody = mat('wardrobe_body', { color: 0x6b3410, roughness: 0.7 });
  const matHandle = mat('wardrobe_handle', { color: 0x1e293b, roughness: 0.4, metalness: 0.7 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.75, 0.5), matBody);
  body.position.set(0, 0.875, 0);
  body.castShadow = true;
  group.add(body);
  // Door split line
  const split = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.7, 0.51), matHandle);
  split.position.set(0, 0.875, 0);
  group.add(split);
  // 2 handles
  for (const sx of [-0.05, 0.05]) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), matHandle);
    handle.position.set(sx, 0.9, 0.26);
    group.add(handle);
  }
}

// ============================================================================
// Rug (flat plane on the floor)
// ============================================================================
function buildRug(group: THREE.Group): void {
  const matRug = mat('rug_woven', { color: 0xb45309, roughness: 0.9 });
  const matTrim = basicMat('rug_trim', { color: 0xfacc15 });
  // Base
  const base = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), matRug);
  base.position.set(0, 0.005, 0);
  base.rotation.x = -Math.PI / 2;
  base.receiveShadow = true;
  group.add(base);
  // Trim border
  const trim = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.78, 4), matTrim);
  trim.position.set(0, 0.006, 0);
  trim.rotation.x = -Math.PI / 2;
  trim.rotation.z = Math.PI / 4;
  trim.scale.set(1.4, 1.0, 1);
  group.add(trim);
}

// ============================================================================
// Kente wall tapestry (flat plane on the wall)
// ============================================================================
function buildKenteCloth(group: THREE.Group): void {
  const matKente = basicMat('kente_cloth', { color: 0xfacc15 });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), matKente);
  cloth.position.set(0, 1.0, 0);
  group.add(cloth);
}

// ============================================================================
// Sound box (hi-fi system)
// ============================================================================
function buildSoundBox(group: THREE.Group): void {
  const matBody = mat('soundbox_body', { color: 0x0f172a, roughness: 0.5, metalness: 0.5 });
  const matSpeaker = basicMat('soundbox_speaker', { color: 0x1e293b });
  // Body (rectangular box)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), matBody);
  body.position.set(0, 0.35, 0);
  body.castShadow = true;
  group.add(body);
  // 2 speakers (front face circles)
  for (const sy of [0.25, 0.5]) {
    const speaker = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), matSpeaker);
    speaker.position.set(0, sy, 0.176);
    group.add(speaker);
  }
}

// ============================================================================
// Backup generator (gasoline, courtyard)
// ============================================================================
function buildGenerator(group: THREE.Group): void {
  const matBody = mat('generator_body', { color: 0x1e40af, roughness: 0.6 });
  const matFrame = mat('generator_frame', { color: 0x0f172a, roughness: 0.5, metalness: 0.4 });
  // Frame (open cage)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), matFrame);
  frame.position.set(0, 0.45, 0);
  frame.castShadow = true;
  group.add(frame);
  // Engine body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.35), matBody);
  body.position.set(0, 0.25, 0);
  group.add(body);
  // Fuel tank (small cylinder on top)
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12), matBody);
  tank.position.set(0, 0.6, 0);
  tank.rotation.z = Math.PI / 2;
  group.add(tank);
}

// ============================================================================
// Flower pots (terracotta)
// ============================================================================
function buildFlowerPots(group: THREE.Group): void {
  const matPot = mat('flower_pot', { color: 0x92400e, roughness: 0.85 });
  const matPlant = mat('flower_plant', { color: 0x166534, roughness: 0.85 });
  // 3 small pots
  for (let i = 0; i < 3; i++) {
    const px = -0.3 + i * 0.3;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.2, 10), matPot);
    pot.position.set(px, 0.1, 0);
    pot.castShadow = true;
    group.add(pot);
    // Plant (small sphere on top)
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), matPlant);
    plant.position.set(px, 0.3, 0);
    group.add(plant);
  }
}

// ============================================================================
// Generic fallback box (for items without a specific generator)
// ============================================================================
function buildGenericBox(group: THREE.Group): void {
  const matGeneric = mat('furn_generic', { color: 0x6b7280, roughness: 0.7 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matGeneric);
  box.position.set(0, 0.25, 0);
  box.castShadow = true;
  group.add(box);
}
