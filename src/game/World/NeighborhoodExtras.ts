/**
 * Accra Life — Neighborhood Extras
 *
 * 7 distinctly Accra environment props built procedurally via Three.js,
 * matching the existing NeighborhoodBlock / NeighborhoodFood / etc. style
 * so the visual identity stays consistent. All registered in
 * assets/registry.json under "procedural".
 *
 * Why procedural instead of downloading external CC0 packs?
 * - The user explicitly warned against spending hours hunting for the
 *   perfect external asset while core gameplay is unfinished.
 * - These props are HIGH visual-identity value (MoMo umbrellas, hawker
 *   tables, Chale Wote graffiti — anyone who's been to Accra recognizes
 *   them), so generic asset-pack versions wouldn't read as Accra anyway.
 * - Procedural builds integrate cleanly with the existing sharedArtLibrary
 *   pattern and avoid GLTFLoader pipeline complexity for now.
 *
 * Replace with hand-crafted GLB models before launch — see the roadmap
 * entry in assets/registry.json ("Building replacements" / "Props
 * replacements").
 *
 * Layout (all positions chosen to fill the existing neighborhood's open
 * sidewalk spaces without colliding with the existing compound / shops /
 * NPCs / utility poles / trees):
 *   - MoMo umbrella: (-5.0, -8.5)   — north sidewalk, just east of provision store
 *   - Hawker table:  (-1.5, -7.0)   — north sidewalk, between Kojo and Ama
 *   - Cool chest:    (5.5, -8.5)    — north sidewalk, just west of waakye joint
 *   - Susu kiosk:    (-4.5, 7.5)    — south sidewalk, near compound entrance
 *   - Park bench:    (7.0, 4.8)     — trotro stop shelter zone
 *   - Chale Wote panel: (-22.5, -7.5) — west edge of north sidewalk
 *   - Billboard gantry: (0.0, 6.0)  — overhead, centered on Oxford Street
 */

import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { getSurfaceHeightAt } from './WorldSurface';

export function buildNeighborhoodExtras(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  buildMoMoUmbrella(scene, colliders, interactables);
  buildHawkerTable(scene, colliders);
  buildCoolChest(scene, colliders);
  buildSusuKiosk(scene, colliders, interactables);
  buildParkBench(scene, colliders);
  buildChaleWotePanel(scene, colliders);
  buildBillboardGantry(scene, colliders);
}

// ============================================================================
// MoMo umbrella — MTN-yellow mobile-money booth
// ============================================================================

function buildMoMoUmbrella(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_MOMO_UMBRELLA';
  group.position.set(-5.0, 0, -8.5);

  // MTN-yellow umbrella canopy
  const matCanopy = sharedArtLibrary.getMaterial('momo_canopy_yellow', {
    color: 0xffcc00,
    roughness: 0.45,
    metalness: 0.05
  });
  const matStripe = sharedArtLibrary.getMaterial('momo_stripe_blue', {
    color: 0x005bb5,
    roughness: 0.5
  });
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.55, 16), matCanopy);
  canopy.position.set(0, 2.2, 0);
  canopy.castShadow = true;
  group.add(canopy);

  // Blue stripe ring (MTN branding)
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.71, 1.71, 0.18, 16, 1, true), matStripe);
  stripe.position.set(0, 2.05, 0);
  group.add(stripe);

  // Tip finial
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), matStripe);
  tip.position.set(0, 2.55, 0);
  group.add(tip);

  // Center pole
  const matPole = sharedArtLibrary.getMaterial('momo_pole_steel', {
    color: 0x1f2937,
    roughness: 0.4,
    metalness: 0.6
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), matPole);
  pole.position.set(0, 1.1, 0);
  pole.castShadow = true;
  group.add(pole);

  // Small wooden table under the umbrella (the MoMo agent's desk)
  const matWood = sharedArtLibrary.getMaterial('momo_desk_wood', {
    color: 0x78350f,
    roughness: 0.7
  });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.55), matWood);
  desk.position.set(0, 0.35, 0.0);
  desk.castShadow = true;
  group.add(desk);

  // Phone + cash drawer props on the desk (small emissive cubes)
  const matPhone = sharedArtLibrary.getBasicMaterial('momo_phone', { color: 0x0f172a });
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.06), matPhone);
  phone.position.set(-0.2, 0.72, 0.0);
  group.add(phone);

  // "MTN MoMo" sign panel (yellow plane with subtle blue border)
  const matSign = sharedArtLibrary.getBasicMaterial('momo_sign_yellow', { color: 0xffcc00 });
  const signPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.22), matSign);
  signPanel.position.set(0, 1.95, 1.7);
  // Face the player walking on the sidewalk (south side of the umbrella)
  signPanel.rotation.y = Math.PI;
  group.add(signPanel);

  scene.add(group);

  colliders.push({
    id: 'ACC_MOMO_UMBRELLA',
    minX: -5.6, maxX: -4.4,
    minZ: -9.1, maxZ: -7.9,
    height: 1.4
  });

  interactables.push({
    id: 'momo_agent',
    assetId: 'ACC_MOMO_UMBRELLA',
    title: 'MoMo Agent',
    promptLabel: 'Send MoMo',
    interactionResponse: 'Mobile money agent — send cash to friends across Accra.',
    position: new THREE.Vector3(-5.0, 0.14, -7.6),
    lookAtPosition: new THREE.Vector3(-5.0, 0.14, -8.4),
    radius: 2.5
  });
}

// ============================================================================
// Market hawker table — wooden table with stacked produce
// ============================================================================

function buildHawkerTable(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_HAWKER_TABLE';
  group.position.set(-1.5, 0, -7.0);

  const matWood = sharedArtLibrary.getMaterial('hawker_table_wood', {
    color: 0x78350f,
    roughness: 0.75
  });
  const matTomato = sharedArtLibrary.getMaterial('hawker_tomato', {
    color: 0xdc2626,
    roughness: 0.55
  });
  const matPlantain = sharedArtLibrary.getMaterial('hawker_plantain', {
    color: 0xfacc15,
    roughness: 0.65
  });
  const matOrange = sharedArtLibrary.getMaterial('hawker_orange', {
    color: 0xea580c,
    roughness: 0.6
  });

  // Tabletop + 4 legs (one-piece geometry for performance)
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.7), matWood);
  top.position.set(0, 0.78, 0);
  top.castShadow = true;
  group.add(top);
  for (const [lx, lz] of [[-0.82, -0.28], [0.82, -0.28], [-0.82, 0.28], [0.82, 0.28]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), matWood);
    leg.position.set(lx, 0.39, lz);
    group.add(leg);
  }

  // Three produce piles on the table — left = tomatoes, middle = plantains, right = oranges
  // Tomatoes (small red spheres, scattered)
  for (let i = 0; i < 12; i++) {
    const tomato = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), matTomato);
    tomato.position.set(
      -0.65 + (Math.random() - 0.5) * 0.25,
      0.86 + Math.random() * 0.08,
      (Math.random() - 0.5) * 0.4
    );
    tomato.castShadow = true;
    group.add(tomato);
  }
  // Plantains (small yellow elongated boxes)
  for (let i = 0; i < 5; i++) {
    const plantain = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.35), matPlantain);
    plantain.position.set(
      0 + (Math.random() - 0.5) * 0.15,
      0.86 + i * 0.04,
      (Math.random() - 0.5) * 0.3
    );
    plantain.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI, 0);
    plantain.castShadow = true;
    group.add(plantain);
  }
  // Oranges (slightly larger orange spheres)
  for (let i = 0; i < 8; i++) {
    const orange = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), matOrange);
    orange.position.set(
      0.65 + (Math.random() - 0.5) * 0.2,
      0.88 + Math.random() * 0.1,
      (Math.random() - 0.5) * 0.4
    );
    orange.castShadow = true;
    group.add(orange);
  }

  // Hand-painted sign leaning against a leg
  const matSign = sharedArtLibrary.getBasicMaterial('hawker_sign', { color: 0xfde047 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), matSign);
  sign.position.set(-0.6, 0.45, 0.4);
  sign.rotation.set(0, 0.3, 0.1);
  group.add(sign);

  scene.add(group);

  colliders.push({
    id: 'ACC_HAWKER_TABLE',
    minX: -2.5, maxX: -0.5,
    minZ: -7.4, maxZ: -6.6,
    height: 1.0
  });
}

// ============================================================================
// Cool chest — ice chest for cold drinks (blue/white branded)
// ============================================================================

function buildCoolChest(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_COOL_CHEST';
  group.position.set(5.5, 0, -8.5);

  const matBody = sharedArtLibrary.getMaterial('coolchest_body_blue', {
    color: 0x1e40af,
    roughness: 0.6
  });
  const matLid = sharedArtLibrary.getMaterial('coolchest_lid_white', {
    color: 0xf8fafc,
    roughness: 0.5
  });
  const matHandle = sharedArtLibrary.getMaterial('coolchest_handle_black', {
    color: 0x111827,
    roughness: 0.4,
    metalness: 0.4
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.65), matBody);
  body.position.set(0, 0.32, 0);
  body.castShadow = true;
  group.add(body);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.65), matLid);
  lid.position.set(0, 0.66, 0);
  lid.castShadow = true;
  group.add(lid);

  // Side handles (small black cubes)
  for (const sx of [-0.55, 0.55]) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.18), matHandle);
    handle.position.set(sx, 0.45, 0);
    group.add(handle);
  }

  // "Cool Drinks" sign panel on the front face (yellow plane)
  const matSign = sharedArtLibrary.getBasicMaterial('coolchest_sign_yellow', { color: 0xfacc15 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.18), matSign);
  sign.position.set(0, 0.38, 0.331);
  group.add(sign);

  // A few bottle caps visible above the lid (small discs)
  const matCap = sharedArtLibrary.getBasicMaterial('coolchest_bottle_cap', { color: 0x16a34a });
  for (let i = 0; i < 4; i++) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10), matCap);
    cap.position.set(-0.35 + i * 0.23, 0.74, 0);
    group.add(cap);
  }

  scene.add(group);

  colliders.push({
    id: 'ACC_COOL_CHEST',
    minX: 4.9, maxX: 6.1,
    minZ: -8.85, maxZ: -8.15,
    height: 0.8
  });
}

// ============================================================================
// Susu collection kiosk — small wooden booth for the susu collector
// ============================================================================

function buildSusuKiosk(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_SUSU_KIOSK';
  group.position.set(-4.5, 0, 7.5);

  const matWood = sharedArtLibrary.getMaterial('susu_wood', {
    color: 0x92400e,
    roughness: 0.7
  });
  const matRoof = sharedArtLibrary.getMaterial('susu_roof_corrugated', {
    color: 0x475569,
    roughness: 0.6,
    metalness: 0.3
  });
  const matSign = sharedArtLibrary.getBasicMaterial('susu_sign_green', { color: 0x16a34a });

  // Booth body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 1.2), matWood);
  body.position.set(0, 1.0, 0);
  body.castShadow = true;
  group.add(body);

  // Roof overhang (slightly larger, sloped)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 1.5), matRoof);
  roof.position.set(0, 2.1, 0);
  roof.rotation.x = 0.08;
  roof.castShadow = true;
  group.add(roof);

  // Window hatch (recessed dark panel on the south face)
  const matHatch = sharedArtLibrary.getMaterial('susu_hatch_dark', {
    color: 0x0f172a,
    roughness: 0.9
  });
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), matHatch);
  hatch.position.set(0, 1.2, 0.61);
  group.add(hatch);

  // Counter ledge under the hatch
  const matCounter = sharedArtLibrary.getMaterial('susu_counter_wood', {
    color: 0xb45309,
    roughness: 0.6
  });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.25), matCounter);
  counter.position.set(0, 0.86, 0.74);
  group.add(counter);

  // Sign panel
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.22), matSign);
  sign.position.set(0, 1.85, 0.61);
  group.add(sign);

  scene.add(group);

  colliders.push({
    id: 'ACC_SUSU_KIOSK',
    minX: -5.3, maxX: -3.7,
    minZ: 6.85, maxZ: 8.15,
    height: 2.4
  });

  interactables.push({
    id: 'susu_collector',
    assetId: 'ACC_SUSU_KIOSK',
    title: 'Susu Collector',
    promptLabel: 'Susu',
    interactionResponse: 'Susu collector — save daily with the community bank.',
    position: new THREE.Vector3(-4.5, 0.14, 7.0),
    lookAtPosition: new THREE.Vector3(-4.5, 0.14, 7.5),
    radius: 2.6
  });
}

// ============================================================================
// Concrete park bench — at the trotro stop
// ============================================================================

function buildParkBench(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_PARK_BENCH';
  group.position.set(7.0, 0, 4.8);

  const matConcrete = sharedArtLibrary.getMaterial('bench_concrete', {
    color: 0x94a3b8,
    roughness: 0.9
  });
  const matSlats = sharedArtLibrary.getMaterial('bench_slats_wood', {
    color: 0x78350f,
    roughness: 0.72
  });

  // Concrete legs (two L-shaped piers)
  for (const lx of [-0.9, 0.9]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.5), matConcrete);
    leg.position.set(lx, 0.225, 0);
    leg.castShadow = true;
    group.add(leg);
  }

  // Seat slab
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.55), matSlats);
  seat.position.set(0, 0.5, 0);
  seat.castShadow = true;
  group.add(seat);

  // Backrest (3 vertical slats)
  for (const bx of [-0.7, 0, 0.7]) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.04), matSlats);
    back.position.set(bx, 0.82, -0.25);
    back.castShadow = true;
    group.add(back);
  }
  // Horizontal backrest rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.04), matSlats);
  rail.position.set(0, 1.1, -0.25);
  rail.castShadow = true;
  group.add(rail);

  scene.add(group);

  colliders.push({
    id: 'ACC_PARK_BENCH',
    minX: 5.95, maxX: 8.05,
    minZ: 4.5, maxZ: 5.15,
    height: 1.2
  });
}

// ============================================================================
// Chale Wote graffiti wall panel — bright abstract street art
// ============================================================================

function buildChaleWotePanel(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_CHALE_WOTE_PANEL';
  group.position.set(-22.5, 0, -7.5);

  // Concrete back-wall (subtle grey)
  const matWall = sharedArtLibrary.getMaterial('wote_wall_concrete', {
    color: 0x6b7280,
    roughness: 0.95
  });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.0, 5.0), matWall);
  wall.position.set(0, 1.5, 0);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // Bright graffiti overlay panels — placed slightly in front of the wall
  // so they read as paint on the surface. Colors inspired by Chale Wote
  // festival street art in Jamestown.
  const matRed = sharedArtLibrary.getBasicMaterial('wote_red', { color: 0xdc2626 });
  const matYellow = sharedArtLibrary.getBasicMaterial('wote_yellow', { color: 0xfacc15 });
  const matGreen = sharedArtLibrary.getBasicMaterial('wote_green', { color: 0x16a34a });
  const matBlue = sharedArtLibrary.getBasicMaterial('wote_blue', { color: 0x0ea5e9 });
  const matBlack = sharedArtLibrary.getBasicMaterial('wote_black', { color: 0x0f172a });

  // Layered abstract shapes — three stripes + a circle + a triangle
  const stripe1 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.45), matRed);
  stripe1.position.set(0.16, 2.2, 0);
  stripe1.rotation.y = Math.PI / 2;
  group.add(stripe1);

  const stripe2 = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.35), matYellow);
  stripe2.position.set(0.16, 1.6, 0.2);
  stripe2.rotation.y = Math.PI / 2;
  group.add(stripe2);

  const stripe3 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.3), matGreen);
  stripe3.position.set(0.16, 1.0, -0.2);
  stripe3.rotation.y = Math.PI / 2;
  group.add(stripe3);

  // Circle (sun/moon motif)
  const circle = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), matBlue);
  circle.position.set(0.16, 2.2, -1.4);
  circle.rotation.y = Math.PI / 2;
  group.add(circle);

  // Triangle (mountain/spear motif — built as a small tetrahedron-on-plane)
  const triGeo = new THREE.BufferGeometry();
  const triVerts = new Float32Array([
    -0.4, -0.4, 0,
     0.4, -0.4, 0,
     0.0,  0.5, 0
  ]);
  triGeo.setAttribute('position', new THREE.BufferAttribute(triVerts, 3));
  triGeo.setIndex([0, 1, 2]);
  triGeo.computeVertexNormals();
  const triangle = new THREE.Mesh(triGeo, matBlack);
  triangle.position.set(0.16, 0.7, 0.8);
  triangle.rotation.y = Math.PI / 2;
  group.add(triangle);

  scene.add(group);

  colliders.push({
    id: 'ACC_CHALE_WOTE_PANEL',
    minX: -22.7, maxX: -22.3,
    minZ: -10.0, maxZ: -5.0,
    height: 3.0
  });
}

// ============================================================================
// Overhead billboard gantry — ad-inventory slot above Oxford Street
// ============================================================================

function buildBillboardGantry(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_BILLBOARD_GANTRY';
  group.position.set(0, 0, 0);

  const matSteel = sharedArtLibrary.getMaterial('billboard_steel', {
    color: 0x475569,
    roughness: 0.5,
    metalness: 0.5
  });
  const matPanel = sharedArtLibrary.getMaterial('billboard_panel_dark', {
    color: 0x0f172a,
    roughness: 0.7
  });
  const matAdYellow = sharedArtLibrary.getBasicMaterial('billboard_ad_yellow', { color: 0xfacc15 });
  const matAdGreen = sharedArtLibrary.getBasicMaterial('billboard_ad_green', { color: 0x16a34a });

  // Two vertical support pylons (one on each side of the road)
  for (const sx of [-9.5, 9.5]) {
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 6.5, 12), matSteel);
    pylon.position.set(sx, 3.25, 0);
    pylon.castShadow = true;
    group.add(pylon);
  }

  // Horizontal gantry beam connecting the two pylons
  const beam = new THREE.Mesh(new THREE.BoxGeometry(19.5, 0.35, 0.4), matSteel);
  beam.position.set(0, 6.4, 0);
  beam.castShadow = true;
  group.add(beam);

  // Billboard panel hanging from the beam — facing both north and south
  // (two-sided so players walking either direction see the ad)
  const panelSize = { w: 8.0, h: 2.5 };
  const panelN = new THREE.Mesh(new THREE.PlaneGeometry(panelSize.w, panelSize.h), matPanel);
  panelN.position.set(0, 5.1, 0.25);
  group.add(panelN);
  const panelS = new THREE.Mesh(new THREE.PlaneGeometry(panelSize.w, panelSize.h), matPanel);
  panelS.position.set(0, 5.1, -0.25);
  panelS.rotation.y = Math.PI;
  group.add(panelS);

  // Ad creative — placeholder for now. Two color bands (yellow top, green
  // bottom) with a thin black bar between. Will be wired to the live ad
  // inventory system later (per the brief's monetization section).
  for (const side of [1, -1]) {
    const top = new THREE.Mesh(new THREE.PlaneGeometry(panelSize.w * 0.9, panelSize.h * 0.4), matAdYellow);
    top.position.set(0, 5.45, 0.26 * side);
    top.rotation.y = side === 1 ? 0 : Math.PI;
    group.add(top);
    const bot = new THREE.Mesh(new THREE.PlaneGeometry(panelSize.w * 0.9, panelSize.h * 0.4), matAdGreen);
    bot.position.set(0, 4.75, 0.26 * side);
    bot.rotation.y = side === 1 ? 0 : Math.PI;
    group.add(bot);
  }

  scene.add(group);

  // The billboard is overhead — no player collider on the panel itself.
  // The pylons DO need colliders (player can walk into them).
  for (const sx of [-9.5, 9.5]) {
    colliders.push({
      id: `ACC_BILLBOARD_PYLON_${sx > 0 ? 'E' : 'W'}`,
      minX: sx - 0.32, maxX: sx + 0.32,
      minZ: -0.32, maxZ: 0.32,
      height: 6.5
    });
  }
}

// ============================================================================
// Re-export the surface helper for callers that want to verify Y placement
// ============================================================================

export function verifyExtrasSurfaceY(): void {
  // Sanity check that all extras sit on the world surface (used in tests later).
  const positions: Array<[number, number, string]> = [
    [-5.0, -8.5, 'MoMo umbrella'],
    [-1.5, -7.0, 'Hawker table'],
    [5.5, -8.5, 'Cool chest'],
    [-4.5, 7.5, 'Susu kiosk'],
    [7.0, 4.8, 'Park bench'],
    [-22.5, -7.5, 'Chale Wote panel'],
    [0.0, 0.0, 'Billboard gantry']
  ];
  for (const [x, z, name] of positions) {
    const y = getSurfaceHeightAt(x, z);
    if (y > 0.5) {
      console.warn(`[extras] ${name} at (${x}, ${z}) sits on elevated surface y=${y.toFixed(2)}`);
    }
  }
}
