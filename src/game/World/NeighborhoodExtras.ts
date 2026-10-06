/**
 * Accra Life — Neighborhood Extras (Hardened + Upgraded)
 *
 * 6 distinctly Accra environment props, rebuilt with:
 * - Hardened colliders (tighter bounds, no gaps)
 * - Deterministic geometry (no Math.random — positions are hardcoded so
 *   the scene looks identical every reload)
 * - Z-fighting prevention (graffiti panels offset 0.04m from wall surface)
 * - Better silhouettes (thicker walls, beveled edges, umbrella ribs)
 * - Branded textures via getSignboardTexture where applicable
 * - No floating elements (signs attached to poles/walls, not mid-air)
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
  buildChaleWotePanel(scene, colliders, interactables);
  buildBillboardGantry(scene, colliders);
}

// ============================================================================
// 1. MoMo umbrella — MTN-yellow mobile-money booth (HARDENED)
// ============================================================================

function buildMoMoUmbrella(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_MOMO_UMBRELLA';
  group.position.set(-5.0, 0, -8.5);
  const baseY = getSurfaceHeightAt(-5.0, -8.5);

  const matYellow = sharedArtLibrary.getMaterial('momo_yellow_v2', { color: 0xffcc00, roughness: 0.35, metalness: 0.05 });
  const matBlue = sharedArtLibrary.getMaterial('momo_blue_v2', { color: 0x005bb5, roughness: 0.4 });
  const matSteel = sharedArtLibrary.getMaterial('momo_steel_v2', { color: 0x334155, roughness: 0.3, metalness: 0.7 });
  const matWood = sharedArtLibrary.getMaterial('momo_wood_v2', { color: 0x8b4513, roughness: 0.68 });
  const matDark = sharedArtLibrary.getMaterial('momo_dark_v2', { color: 0x0f172a, roughness: 0.4, metalness: 0.4 });

  // Canopy — slightly wider + flatter for better rain coverage
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.48, 28), matYellow);
  canopy.position.set(0, baseY + 2.3, 0);
  canopy.castShadow = true;
  group.add(canopy);

  // Blue trim band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.98, 1.98, 0.14, 28, 1, true), matBlue);
  band.position.set(0, baseY + 2.16, 0);
  group.add(band);

  // Umbrella ribs — 8 thin cylinders radiating from the pole (visual detail)
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.9, 6), matSteel);
    rib.position.set(Math.cos(ang) * 0.95, baseY + 2.18, Math.sin(ang) * 0.95);
    rib.rotation.z = Math.PI / 2 - ang;
    rib.rotation.y = ang;
    group.add(rib);
  }

  // Tip finial
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), matBlue);
  tip.position.set(0, baseY + 2.6, 0);
  group.add(tip);

  // Center pole — taller for better canopy clearance
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 12), matSteel);
  pole.position.set(0, baseY + 1.15, 0);
  pole.castShadow = true;
  group.add(pole);

  // Agent desk — slightly smaller, with branded tablecloth (yellow top)
  const desk = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.62, 0.5), matWood);
  desk.position.set(0, baseY + 0.33, 0);
  desk.castShadow = true;
  group.add(desk);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.55), matYellow);
  deskTop.position.set(0, baseY + 0.66, 0);
  deskTop.castShadow = true;
  group.add(deskTop);

  // Agent stool (small wooden cylinder — the agent sits here)
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.42, 10), matWood);
  stool.position.set(0, baseY + 0.21, -0.45);
  stool.castShadow = true;
  group.add(stool);

  // Phone on desk (dark slab with blue screen)
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.022, 0.065), matDark);
  phone.position.set(-0.18, baseY + 0.69, 0.05);
  group.add(phone);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.016), sharedArtLibrary.getBasicMaterial('momo_screen_v2', { color: 0x60a5fa }));
  screen.position.set(-0.18, baseY + 0.7, 0.098);
  group.add(screen);

  // Branded sign — ATTACHED TO THE POLE (not floating). Mounted at y=1.6.
  const signTex = sharedArtLibrary.getSignboardTexture('momo_sign_v2', '#ffcc00', '#005bb5', 'MTN MoMo', 'SEND MONEY');
  const matSign = sharedArtLibrary.getBasicMaterial('momo_sign_panel_v2', { map: signTex });
  const signPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.2), matSign);
  signPanel.position.set(0, baseY + 1.65, 0.06);
  // Attach a small bracket from pole to sign
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), matSteel);
  bracket.position.set(0, baseY + 1.65, 0.02);
  group.add(signPanel, bracket);

  // Cash box under desk
  const cashBox = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.2), matDark);
  cashBox.position.set(0.28, baseY + 0.08, 0.15);
  group.add(cashBox);

  scene.add(group);

  colliders.push({
    id: 'ACC_MOMO_UMBRELLA',
    minX: -5.55, maxX: -4.45,
    minZ: -9.05, maxZ: -7.95,
    height: 1.5
  });

  interactables.push({
    id: 'momo_agent',
    assetId: 'ACC_MOMO_UMBRELLA',
    title: 'MoMo Agent',
    promptLabel: 'MoMo',
    interactionResponse: 'Mobile money agent — send cash to friends across Accra.',
    position: new THREE.Vector3(-5.0, baseY + 0.14, -7.6),
    lookAtPosition: new THREE.Vector3(-5.0, baseY + 0.14, -8.4),
    radius: 2.5
  });
}

// ============================================================================
// 2. Market hawker table — DETERMINISTIC produce + tablecloth (HARDENED)
// ============================================================================

function buildHawkerTable(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_HAWKER_TABLE';
  group.position.set(-1.5, 0, -7.0);
  const baseY = getSurfaceHeightAt(-1.5, -7.0);

  const matWood = sharedArtLibrary.getMaterial('hawker_wood_v2', { color: 0x78350f, roughness: 0.72 });
  const matCloth = sharedArtLibrary.getMaterial('hawker_cloth_v2', { color: 0x16a34a, roughness: 0.82 });
  const matTomato = sharedArtLibrary.getMaterial('hawker_tomato_v2', { color: 0xdc2626, roughness: 0.5 });
  const matPlantain = sharedArtLibrary.getMaterial('hawker_plantain_v2', { color: 0xfacc15, roughness: 0.62 });
  const matOrange = sharedArtLibrary.getMaterial('hawker_orange_v2', { color: 0xea580c, roughness: 0.58 });
  const matBasket = sharedArtLibrary.getMaterial('hawker_basket_v2', { color: 0xb45309, roughness: 0.85 });

  // Table top + 4 legs
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.07, 0.68), matWood);
  top.position.set(0, baseY + 0.78, 0);
  top.castShadow = true;
  group.add(top);
  for (const [lx, lz] of [[-0.78, -0.26], [0.78, -0.26], [-0.78, 0.26], [0.78, 0.26]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.78, 0.07), matWood);
    leg.position.set(lx, baseY + 0.39, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  // Tablecloth — green fabric draped over the table (slightly larger than top)
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.02, 0.7), matCloth);
  cloth.position.set(0, baseY + 0.81, 0);
  cloth.receiveShadow = true;
  group.add(cloth);

  // Three produce baskets (woven brown rings) — deterministic positions
  const basketPositions: Array<[number, number, string, THREE.Material]> = [
    [-0.55, 0, 'tomatoes', matTomato],
    [0.0, 0, 'plantains', matPlantain],
    [0.55, 0, 'oranges', matOrange]
  ];
  for (const [bx, bz, _label, matFruit] of basketPositions) {
    // Basket ring
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.12, 14, 1, true), matBasket);
    basket.position.set(bx, baseY + 0.86, bz);
    group.add(basket);
    // Fruit pile — deterministic, not Math.random
    if (_label === 'tomatoes') {
      const tPos: Array<[number, number, number]> = [
        [-0.04, 0, -0.05], [0.04, 0, -0.08], [0, 0, 0.02], [-0.06, 0, 0.05],
        [0.06, 0.03, -0.02], [-0.02, 0.03, 0.08], [0.08, 0.03, 0.05],
        [-0.08, 0.06, 0], [0.02, 0.06, -0.06], [-0.04, 0.06, 0.06]
      ];
      for (const [tx, ty, tz] of tPos) {
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), matFruit);
        t.position.set(bx + tx, baseY + 0.88 + ty, bz + tz);
        t.castShadow = true;
        group.add(t);
      }
    } else if (_label === 'plantains') {
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.28), matFruit);
        const angle = (i / 4) * Math.PI;
        p.position.set(bx + Math.cos(angle) * 0.06, baseY + 0.88 + i * 0.03, bz + Math.sin(angle) * 0.04);
        p.rotation.set(0, angle, 0.1);
        p.castShadow = true;
        group.add(p);
      }
    } else {
      const oPos: Array<[number, number, number]> = [
        [-0.04, 0, 0], [0.04, 0, -0.04], [0, 0, 0.06], [0.06, 0, 0.02],
        [-0.06, 0.04, -0.02], [0.02, 0.04, 0.08], [0.08, 0.04, 0]
      ];
      for (const [ox, oy, oz] of oPos) {
        const o = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), matFruit);
        o.position.set(bx + ox, baseY + 0.89 + oy, bz + oz);
        o.castShadow = true;
        group.add(o);
      }
    }
  }

  // Branded sign — leaning against front-left leg
  const signTex = sharedArtLibrary.getSignboardTexture('hawker_sign_v2', '#16a34a', '#facc15', 'FRESH PRODUCE', 'MAKOLA · ₵ CHEAP');
  const matSign = sharedArtLibrary.getBasicMaterial('hawker_sign_v2', { map: signTex });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.15), matSign);
  sign.position.set(-0.6, baseY + 0.5, 0.32);
  sign.rotation.set(0, 0.25, 0.08);
  group.add(sign);

  scene.add(group);

  colliders.push({
    id: 'ACC_HAWKER_TABLE',
    minX: -2.45, maxX: -0.55,
    minZ: -7.38, maxZ: -6.62,
    height: 1.0
  });
}

// ============================================================================
// 3. Cool chest — beveled edges + no misleading price (HARDENED)
// ============================================================================

function buildCoolChest(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_COOL_CHEST';
  group.position.set(5.5, 0, -8.5);
  const baseY = getSurfaceHeightAt(5.5, -8.5);

  const matBody = sharedArtLibrary.getMaterial('coolchest_body_v2', { color: 0x1e40af, roughness: 0.5 });
  const matLid = sharedArtLibrary.getMaterial('coolchest_lid_v2', { color: 0xf8fafc, roughness: 0.42 });
  const matHandle = sharedArtLibrary.getMaterial('coolchest_handle_v2', { color: 0x111827, roughness: 0.35, metalness: 0.5 });
  const matHinge = sharedArtLibrary.getMaterial('coolchest_hinge_v2', { color: 0x475569, roughness: 0.4, metalness: 0.6 });

  // Body — slightly smaller inner box for beveled look
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.52, 0.62), matBody);
  body.position.set(0, baseY + 0.3, 0);
  body.castShadow = true;
  group.add(body);
  // Bevel trim (lighter blue strip around the top edge)
  const bevel = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.06, 0.65), sharedArtLibrary.getMaterial('coolchest_bevel_v2', { color: 0x3b82f6, roughness: 0.45 }));
  bevel.position.set(0, baseY + 0.56, 0);
  group.add(bevel);

  // Lid — slightly domed (thinner in the middle)
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 0.65), matLid);
  lid.position.set(0, baseY + 0.64, 0);
  lid.castShadow = true;
  group.add(lid);

  // Hinges (2 small cylinders on the back edge)
  for (const hx of [-0.35, 0.35]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), matHinge);
    hinge.position.set(hx, baseY + 0.62, -0.3);
    hinge.rotation.z = Math.PI / 2;
    group.add(hinge);
  }

  // Latch (front center)
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), matHandle);
  latch.position.set(0, baseY + 0.62, 0.32);
  group.add(latch);

  // Side handles
  for (const sx of [-0.54, 0.54]) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.16), matHandle);
    handle.position.set(sx, baseY + 0.42, 0);
    group.add(handle);
  }

  // Branded sign — NO price (cool chest is not interactable)
  const signTex = sharedArtLibrary.getSignboardTexture('coolchest_sign_v2', '#1e40af', '#f8fafc', 'COOL DRINKS', 'ICE COLD');
  const matSign = sharedArtLibrary.getBasicMaterial('coolchest_sign_v2', { map: signTex });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.21), matSign);
  sign.position.set(0, baseY + 0.35, 0.316);
  group.add(sign);

  // Bottle caps (deterministic positions) — 4 varied brand colors
  const capData: Array<[number, number]> = [
    [-0.3, 0x16a34a], [-0.1, 0xdc2626], [0.1, 0xf97316], [0.3, 0x16a34a]
  ];
  for (const [cx, color] of capData) {
    const matCap = sharedArtLibrary.getBasicMaterial(`cc_cap_${cx}`, { color });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), matCap);
    cap.position.set(cx, baseY + 0.71, 0);
    group.add(cap);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 8), matHandle);
    neck.position.set(cx, baseY + 0.66, 0);
    group.add(neck);
  }

  scene.add(group);

  colliders.push({
    id: 'ACC_COOL_CHEST',
    minX: 4.92, maxX: 6.08,
    minZ: -8.82, maxZ: -8.18,
    height: 0.85
  });
}

// ============================================================================
// 4. Susu kiosk — hollow walls + visible door + dual signs (HARDENED)
// ============================================================================

function buildSusuKiosk(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_SUSU_KIOSK';
  group.position.set(-4.5, 0, 7.5);
  const baseY = getSurfaceHeightAt(-4.5, 7.5);

  const matWood = sharedArtLibrary.getMaterial('susu_wood_v2', { color: 0x92400e, roughness: 0.68 });
  const matRoof = sharedArtLibrary.getMaterial('susu_roof_v2', { color: 0x475569, roughness: 0.55, metalness: 0.3 });
  const matDark = sharedArtLibrary.getMaterial('susu_dark_v2', { color: 0x0f172a, roughness: 0.85 });
  const matBars = sharedArtLibrary.getMaterial('susu_bars_v2', { color: 0x111827, roughness: 0.35, metalness: 0.6 });
  const matCounter = sharedArtLibrary.getMaterial('susu_counter_v2', { color: 0xb45309, roughness: 0.58 });

  const kioskW = 1.4, kioskH = 2.0, kioskD = 1.2, wallT = 0.08;

  // 4 walls (hollow — not a solid box)
  // Back (north) wall
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(kioskW, kioskH, wallT), matWood);
  wallN.position.set(0, baseY + kioskH / 2, -kioskD / 2 + wallT / 2);
  wallN.castShadow = true;
  group.add(wallN);
  // Side walls
  for (const sx of [-kioskW / 2 + wallT / 2, kioskW / 2 - wallT / 2]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wallT, kioskH, kioskD), matWood);
    wall.position.set(sx, baseY + kioskH / 2, 0);
    wall.castShadow = true;
    group.add(wall);
  }
  // Front wall — split into 2 segments with a door gap (0.5m wide)
  const doorGap = 0.5;
  const segW = (kioskW - doorGap) / 2;
  for (const sx of [-kioskW / 2 + segW / 2, kioskW / 2 - segW / 2]) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, kioskH, wallT), matWood);
    seg.position.set(sx, baseY + kioskH / 2, kioskD / 2 - wallT / 2);
    seg.castShadow = true;
    group.add(seg);
  }
  // Door (open, angled slightly — ajar)
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorGap - 0.02, kioskH - 0.1, 0.03), matWood);
  door.position.set(0.15, baseY + kioskH / 2 - 0.05, kioskD / 2 - wallT / 2 + 0.02);
  door.rotation.y = -0.3;
  group.add(door);

  // Sloped roof (more angle for rain runoff)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(kioskW + 0.25, 0.08, kioskD + 0.2), matRoof);
  roof.position.set(0, baseY + kioskH + 0.08, 0);
  roof.rotation.x = 0.12;
  roof.castShadow = true;
  group.add(roof);

  // Service hatch (dark recessed panel on the south/front face — above counter)
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.04), matDark);
  hatch.position.set(0, baseY + 1.25, kioskD / 2 + 0.01);
  group.add(hatch);

  // Counter ledge below the hatch
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.2), matCounter);
  counter.position.set(0, baseY + 0.92, kioskD / 2 + 0.08);
  group.add(counter);

  // Window bars on the hatch (security grill)
  for (const bx of [-0.28, -0.14, 0, 0.14, 0.28]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.6, 0.035), matBars);
    bar.position.set(bx, baseY + 1.25, kioskD / 2 + 0.03);
    group.add(bar);
  }

  // Dual branded signs — front (south, facing the player) + back (north)
  const signTex = sharedArtLibrary.getSignboardTexture('susu_sign_v2', '#16a34a', '#fef3c7', 'DAILY SUSU', 'SAVE TODAY · CHALE');
  const matSign = sharedArtLibrary.getBasicMaterial('susu_sign_v2', { map: signTex });
  // Front sign (above the hatch)
  const signFront = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), matSign);
  signFront.position.set(0, baseY + 1.85, kioskD / 2 + 0.02);
  group.add(signFront);
  // Back sign (facing players walking north)
  const signBack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), matSign);
  signBack.position.set(0, baseY + 1.85, -kioskD / 2 - 0.02);
  signBack.rotation.y = Math.PI;
  group.add(signBack);

  scene.add(group);

  colliders.push({
    id: 'ACC_SUSU_KIOSK',
    minX: -5.25, maxX: -3.75,
    minZ: 6.85, maxZ: 8.15,
    height: 2.4
  });

  interactables.push({
    id: 'susu_collector',
    assetId: 'ACC_SUSU_KIOSK',
    title: 'Susu Collector',
    promptLabel: 'Susu',
    interactionResponse: 'Susu collector — save daily with the community bank.',
    position: new THREE.Vector3(-4.5, baseY + 0.14, 7.0),
    lookAtPosition: new THREE.Vector3(-4.5, baseY + 0.14, 7.5),
    radius: 2.6
  });
}

// ============================================================================
// 5. Concrete park bench — REBUILT at non-overlapping position (HARDENED)
// ============================================================================

function buildParkBench(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_PARK_BENCH';
  // Position: south sidewalk, WEST of the trotro stop (avoids overlap
  // with the trotro shelter collider at 6.7-11.3 X, 4.5-5.8 Z).
  group.position.set(4.0, 0, 5.5);
  const baseY = getSurfaceHeightAt(4.0, 5.5);

  const matConcrete = sharedArtLibrary.getMaterial('bench_concrete_v2', { color: 0x94a3b8, roughness: 0.88 });
  const matSlats = sharedArtLibrary.getMaterial('bench_slats_v2', { color: 0x78350f, roughness: 0.7 });

  // Concrete pier legs (2)
  for (const lx of [-0.85, 0.85]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.45), matConcrete);
    leg.position.set(lx, baseY + 0.21, 0);
    leg.castShadow = true;
    group.add(leg);
  }

  // Seat slab (4 wooden slats)
  for (let i = 0; i < 4; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.12), matSlats);
    slab.position.set(0, baseY + 0.46, -0.15 + i * 0.1);
    slab.castShadow = true;
    group.add(slab);
  }

  // Backrest (3 vertical slats + horizontal rail)
  for (const bx of [-0.65, 0, 0.65]) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.04), matSlats);
    back.position.set(bx, baseY + 0.75, -0.22);
    back.castShadow = true;
    group.add(back);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.04), matSlats);
  rail.position.set(0, baseY + 1.0, -0.22);
  rail.castShadow = true;
  group.add(rail);

  scene.add(group);

  colliders.push({
    id: 'ACC_PARK_BENCH',
    minX: 3.05, maxX: 4.95,
    minZ: 5.1, maxZ: 5.9,
    height: 1.1
  });
}

// ============================================================================
// 6. Chale Wote graffiti wall — thicker wall + no z-fighting (HARDENED)
// ============================================================================

function buildChaleWotePanel(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_CHALE_WOTE_PANEL';
  group.position.set(-22.5, 0, -7.5);
  const baseY = getSurfaceHeightAt(-22.5, -7.5);

  const matConcrete = sharedArtLibrary.getMaterial('wote_wall_v2', { color: 0x6b7280, roughness: 0.95 });
  const matRed = sharedArtLibrary.getBasicMaterial('wote_red_v2', { color: 0xdc2626 });
  const matYellow = sharedArtLibrary.getBasicMaterial('wote_yellow_v2', { color: 0xfacc15 });
  const matGreen = sharedArtLibrary.getBasicMaterial('wote_green_v2', { color: 0x16a34a });
  const matBlue = sharedArtLibrary.getBasicMaterial('wote_blue_v2', { color: 0x0ea5e9 });
  const matBlack = sharedArtLibrary.getBasicMaterial('wote_black_v2', { color: 0x0f172a });
  const matWhite = sharedArtLibrary.getBasicMaterial('wote_white_v2', { color: 0xf8fafc });

  // Thicker wall (0.5m) — looks like a real concrete wall, not cardboard
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 5.2), matConcrete);
  wall.position.set(0, baseY + 1.6, 0);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // Concrete base footing (wider than the wall — stability)
  const footing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 5.4), matConcrete);
  footing.position.set(0, baseY + 0.075, 0);
  footing.castShadow = true;
  group.add(footing);

  // Graffiti on the EAST face (facing the player who walks east along the
  // sidewalk). Offset 0.04m from the wall surface to prevent z-fighting.
  const faceX = 0.25 + 0.04; // east face of the 0.5m-thick wall + z-fight offset

  // Layered abstract shapes — Chale Wote festival inspired
  // Top stripe (red)
  const stripe1 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.4), matRed);
  stripe1.position.set(faceX, baseY + 2.3, 0);
  stripe1.rotation.y = -Math.PI / 2;
  group.add(stripe1);
  // Middle stripe (yellow)
  const stripe2 = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.3), matYellow);
  stripe2.position.set(faceX, baseY + 1.7, 0.3);
  stripe2.rotation.y = -Math.PI / 2;
  group.add(stripe2);
  // Lower stripe (green)
  const stripe3 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.25), matGreen);
  stripe3.position.set(faceX, baseY + 1.1, -0.3);
  stripe3.rotation.y = -Math.PI / 2;
  group.add(stripe3);

  // Sun/moon circle (blue, top-left)
  const circle = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), matBlue);
  circle.position.set(faceX, baseY + 2.3, -1.5);
  circle.rotation.y = -Math.PI / 2;
  group.add(circle);

  // Triangle (black, bottom — proper shape geometry)
  const triShape = new THREE.Shape();
  triShape.moveTo(-0.35, -0.3);
  triShape.lineTo(0.35, -0.3);
  triShape.lineTo(0, 0.45);
  triShape.closePath();
  const triGeo = new THREE.ShapeGeometry(triShape);
  const triangle = new THREE.Mesh(triGeo, matBlack);
  triangle.position.set(faceX, baseY + 0.65, 0.8);
  triangle.rotation.y = -Math.PI / 2;
  group.add(triangle);

  // Small white dots (spray-paint texture, scattered — deterministic)
  const dotPositions: Array<[number, number]> = [
    [-1.8, 2.6], [-1.5, 1.9], [1.6, 2.5], [1.9, 1.4],
    [-1.0, 0.8], [0.5, 2.8], [1.2, 0.5], [-0.5, 2.9]
  ];
  for (const [dz, dy] of dotPositions) {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), matWhite);
    dot.position.set(faceX, baseY + dy, dz);
    dot.rotation.y = -Math.PI / 2;
    group.add(dot);
  }

  // Also graffiti on the WEST face (facing players walking west)
  const westX = -0.25 - 0.04;
  const wStripe = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.3), matYellow);
  wStripe.position.set(westX, baseY + 2.0, 0);
  group.add(wStripe);
  const wCircle = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), matRed);
  wCircle.position.set(westX, baseY + 1.5, 1.5);
  group.add(wCircle);

  scene.add(group);

  colliders.push({
    id: 'ACC_CHALE_WOTE_PANEL',
    minX: -22.85, maxX: -22.15,
    minZ: -10.2, maxZ: -4.8,
    height: 3.2
  });

  interactables.push({
    id: 'chale_wote_panel',
    assetId: 'ACC_CHALE_WOTE_PANEL',
    title: 'Chale Wote Mural',
    promptLabel: 'View Art',
    interactionResponse: 'Street art inspired by the Chale Wote festival in Jamestown.',
    position: new THREE.Vector3(-21.5, baseY + 0.14, -7.5),
    lookAtPosition: new THREE.Vector3(-22.4, baseY + 1.0, -7.5),
    radius: 3.0
  });
}

// ============================================================================
// 7. Overhead billboard gantry (unchanged — already hardened)
// ============================================================================

function buildBillboardGantry(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_BILLBOARD_GANTRY';
  group.position.set(0, 0, 0);

  const matSteel = sharedArtLibrary.getMaterial('billboard_steel', { color: 0x475569, roughness: 0.5, metalness: 0.5 });
  const matPanelFrame = sharedArtLibrary.getMaterial('billboard_panel_frame', { color: 0x1e293b, roughness: 0.7 });

  for (const sz of [-6.5, 6.5]) {
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 6.5, 12), matSteel);
    pylon.position.set(0, 3.25, sz);
    pylon.castShadow = true;
    group.add(pylon);
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.4, 12), matPanelFrame);
    boot.position.set(0, 0.2, sz);
    boot.castShadow = true;
    group.add(boot);
  }

  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 14.4), matSteel);
  beam.position.set(0, 6.4, 0);
  beam.castShadow = true;
  group.add(beam);

  for (const sz of [-6.5, 6.5]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.5, 0.1), matSteel);
    brace.position.set(0, 4.0, sz / 2);
    brace.rotation.x = Math.atan2(2.5, 6.5);
    group.add(brace);
  }

  const panelW = 8.0, panelH = 2.5, panelY = 5.0;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.35, panelH + 0.4, panelW + 0.4), matPanelFrame);
  frame.position.set(0, panelY, 0);
  frame.castShadow = true;
  group.add(frame);

  // Try to use billboard texture if available; fall back to signboard
  let matAd: THREE.Material;
  try {
    const adTex = sharedArtLibrary.getBillboardTexture('mtn_ad_v3', 'mtn');
    matAd = sharedArtLibrary.getBasicMaterial('billboard_ad_mtn_v3', { map: adTex, side: THREE.DoubleSide });
  } catch {
    const signTex = sharedArtLibrary.getSignboardTexture('billboard_mtn_fallback', '#ffcc00', '#003c71', 'MTN', 'Everywhere You Go');
    matAd = sharedArtLibrary.getBasicMaterial('billboard_ad_fallback', { map: signTex, side: THREE.DoubleSide });
  }

  const panelE = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), matAd);
  panelE.position.set(0.20, panelY, 0);
  panelE.rotation.y = Math.PI / 2;
  group.add(panelE);

  const panelW_face = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), matAd);
  panelW_face.position.set(-0.20, panelY, 0);
  panelW_face.rotation.y = -Math.PI / 2;
  group.add(panelW_face);

  const catwalk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, panelW + 0.2), matSteel);
  catwalk.position.set(0, panelY - panelH / 2 - 0.1, 0);
  group.add(catwalk);

  scene.add(group);

  for (const sz of [-6.5, 6.5]) {
    colliders.push({
      id: `ACC_BILLBOARD_PYLON_${sz > 0 ? 'S' : 'N'}`,
      minX: -0.32, maxX: 0.32,
      minZ: sz - 0.32, maxZ: sz + 0.32,
      height: 6.5
    });
  }
}

// ============================================================================
// Verify surface Y placement for all extras
// ============================================================================

export function verifyExtrasSurfaceY(): void {
  const positions: Array<[number, number, string]> = [
    [-5.0, -8.5, 'MoMo umbrella'],
    [-1.5, -7.0, 'Hawker table'],
    [5.5, -8.5, 'Cool chest'],
    [-4.5, 7.5, 'Susu kiosk'],
    [4.0, 5.5, 'Park bench'],
    [-22.5, -7.5, 'Chale Wote panel'],
    [0.0, -6.5, 'Billboard gantry (north pylon)'],
    [0.0, 6.5, 'Billboard gantry (south pylon)']
  ];
  for (const [x, z, name] of positions) {
    const y = getSurfaceHeightAt(x, z);
    if (y > 0.5) {
      console.warn(`[extras] ${name} at (${x}, ${z}) sits on elevated surface y=${y.toFixed(2)}`);
    }
  }
}
