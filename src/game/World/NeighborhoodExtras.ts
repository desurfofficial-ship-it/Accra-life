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
  // Cool chest is a visual prop only (no interactable) — matches the
  // user's a96ff69 commit "Remove cold drink economy and related
  // interactions". The branded "COOL DRINKS" sign still reads as Accra.
  buildCoolChest(scene, colliders);
  buildSusuKiosk(scene, colliders, interactables);
  // Park bench removed: it overlapped with the trotro stop's built-in
  // shelter bench (collider collision). The trotro stop already provides
  // seating — no need for a second bench in the same zone.
  buildChaleWotePanel(scene, colliders, interactables);
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

  // MTN-yellow umbrella canopy — flatter cone for better silhouette +
  // sharper tip, two-tier for visual interest.
  const matCanopyYellow = sharedArtLibrary.getMaterial('momo_canopy_yellow', {
    color: 0xffcc00,
    roughness: 0.4,
    metalness: 0.08
  });
  const matCanopyBlue = sharedArtLibrary.getMaterial('momo_canopy_blue', {
    color: 0x005bb5,
    roughness: 0.45
  });
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.85, 0.55, 24), matCanopyYellow);
  canopy.position.set(0, 2.25, 0);
  canopy.castShadow = true;
  group.add(canopy);

  // Blue band ring around the canopy (MTN branding — yellow + blue is iconic)
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(1.83, 1.83, 0.16, 24, 1, true),
    matCanopyBlue
  );
  band.position.set(0, 2.10, 0);
  group.add(band);

  // Sharper tip finial (small sphere)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), matCanopyBlue);
  tip.position.set(0, 2.58, 0);
  group.add(tip);

  // Center pole — brushed-steel effect via metalness
  const matPole = sharedArtLibrary.getMaterial('momo_pole_steel', {
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.7
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.25, 12), matPole);
  pole.position.set(0, 1.13, 0);
  pole.castShadow = true;
  group.add(pole);

  // Small wooden MoMo agent desk — slimmer profile
  const matWood = sharedArtLibrary.getMaterial('momo_desk_wood', {
    color: 0x8b4513,
    roughness: 0.7
  });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.65, 0.55), matWood);
  desk.position.set(0, 0.34, 0.0);
  desk.castShadow = true;
  group.add(desk);
  // Desk top trim (lighter wood, gives a cleaner edge)
  const matWoodTrim = sharedArtLibrary.getMaterial('momo_desk_trim', {
    color: 0xc2410c,
    roughness: 0.65
  });
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.6), matWoodTrim);
  deskTop.position.set(0, 0.69, 0);
  deskTop.castShadow = true;
  group.add(deskTop);

  // Phone on the desk (small dark slab with a tiny emissive screen)
  const matPhoneBody = sharedArtLibrary.getMaterial('momo_phone_body', {
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.4
  });
  const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.07), matPhoneBody);
  phoneBody.position.set(-0.22, 0.72, 0);
  group.add(phoneBody);
  const matPhoneScreen = sharedArtLibrary.getBasicMaterial('momo_phone_screen', { color: 0x60a5fa });
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.018), matPhoneScreen);
  phoneScreen.position.set(-0.22, 0.733, 0.036);
  group.add(phoneScreen);

  // Branded "MTN MoMo" sign panel — uses the existing signboard texture
  // helper (same one Adabraka Provisions uses). Yellow bg + blue border
  // + "MTN MoMo" title + "SEND MONEY" subtitle. Faces south (toward the
  // player walking along the sidewalk).
  const signTex = sharedArtLibrary.getSignboardTexture(
    'momo_sign',
    '#ffcc00',
    '#005bb5',
    'MTN MoMo',
    'SEND MONEY'
  );
  const matSign = sharedArtLibrary.getBasicMaterial('momo_sign_panel', { map: signTex });
  const signPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.24), matSign);
  signPanel.position.set(0, 1.95, 1.78);
  // Face the player walking on the sidewalk (south side of the umbrella)
  signPanel.rotation.y = Math.PI;
  group.add(signPanel);

  // Cash box under the desk (small black box on the south side, visible)
  const matCashBox = sharedArtLibrary.getMaterial('momo_cashbox', {
    color: 0x111827,
    roughness: 0.5,
    metalness: 0.5
  });
  const cashBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.22), matCashBox);
  cashBox.position.set(0.32, 0.09, 0.18);
  group.add(cashBox);

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
    promptLabel: 'MoMo',
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

function buildCoolChest(
  scene: THREE.Scene,
  colliders: ColliderBox[]
): void {
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

  // Branded "COOL DRINKS" sign panel on the front face — uses the
  // signboard texture helper. Blue bg + white border + "COOL DRINKS" title
  // + "ICE COLD" subtitle. Visible to players walking along the sidewalk.
  const signTex = sharedArtLibrary.getSignboardTexture(
    'coolchest_sign',
    '#1e40af',
    '#f8fafc',
    'COOL DRINKS',
    'ICE COLD · ₵3'
  );
  const matSign = sharedArtLibrary.getBasicMaterial('coolchest_sign_panel', { map: signTex });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.23), matSign);
  sign.position.set(0, 0.38, 0.331);
  group.add(sign);

  // A few bottle caps + necks visible above the lid — varied colors to
  // suggest different drink brands (Voltic water, Coca-Cola, Fanta, Sprite)
  const capColors = [0x16a34a /* Voltic green */, 0xdc2626 /* Coke red */, 0xf97316 /* Fanta orange */, 0x16a34a /* Sprite green */];
  for (let i = 0; i < 4; i++) {
    const matCap = sharedArtLibrary.getBasicMaterial(`coolchest_cap_${i}`, { color: capColors[i] });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.022, 12), matCap);
    cap.position.set(-0.35 + i * 0.23, 0.74, 0);
    group.add(cap);
    // Bottle neck below the cap (dark glass)
    const matNeck = sharedArtLibrary.getMaterial(`coolchest_neck_${i}`, {
      color: 0x1f2937,
      roughness: 0.3,
      metalness: 0.4
    });
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 10), matNeck);
    neck.position.set(-0.35 + i * 0.23, 0.69, 0);
    group.add(neck);
  }

  scene.add(group);

  colliders.push({
    id: 'ACC_COOL_CHEST',
    minX: 4.9, maxX: 6.1,
    minZ: -8.85, maxZ: -8.15,
    height: 0.8
  });

  // NOTE: cool_chest is intentionally NOT interactable. The user's a96ff69
  // commit removed the cold drink economy (EXP_COLD_DRINK) + related
  // interactions. The prop remains as a visual element with the branded
  // "COOL DRINKS" sign — a future slice can re-add the interactable if the
  // economy is restored.
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

  // Branded "DAILY SUSU" sign panel — uses the signboard texture helper.
  // Green bg + cream border + "DAILY SUSU" title + "SAVE TODAY" subtitle.
  // Faces south (toward the player walking on the south sidewalk).
  const signTex = sharedArtLibrary.getSignboardTexture(
    'susu_sign',
    '#16a34a',
    '#fef3c7',
    'DAILY SUSU',
    'SAVE TODAY · CHALE'
  );
  const matSign = sharedArtLibrary.getBasicMaterial('susu_sign_panel', { map: signTex });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.26), matSign);
  sign.position.set(0, 1.85, 0.61);
  group.add(sign);

  // Window bars on the hatch (security grill — typical susu kiosk detail)
  const matBars = sharedArtLibrary.getMaterial('susu_bars_steel', {
    color: 0x111827,
    roughness: 0.4,
    metalness: 0.6
  });
  for (const bx of [-0.32, -0.16, 0, 0.16, 0.32]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), matBars);
    bar.position.set(bx, 1.2, 0.62);
    group.add(bar);
  }

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
// Chale Wote graffiti wall panel — bright abstract street art
// ============================================================================

function buildChaleWotePanel(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
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

  interactables.push({
    id: 'chale_wote_panel',
    assetId: 'ACC_CHALE_WOTE_PANEL',
    title: 'Chale Wote Mural',
    promptLabel: 'View Art',
    interactionResponse: 'Street art inspired by the Chale Wote festival in Jamestown.',
    position: new THREE.Vector3(-21.5, 0.14, -7.5),
    lookAtPosition: new THREE.Vector3(-22.4, 1.0, -7.5),
    radius: 3.0
  });
}

// ============================================================================
// Overhead billboard gantry — ad-inventory slot above Oxford Street
// ============================================================================
// FIX (per user feedback): pylons were at x=±9.5, z=0 — IN THE MIDDLE OF THE
// ROAD. Now they're at z=±6.5 (on the sidewalks), beam crosses the road
// north-south overhead, panels face east-west so players walking either
// direction along Oxford Street can read the ad.
//
// FIX (per user feedback): ad creative was just 2 placeholder color bands
// with no readable content. Now uses a real branded MTN ad via
// sharedArtLibrary.getSignboardTexture (the same texture helper the Adabraka
// Provisions shop uses). MTN yellow + blue is the most recognizable brand
// identity in Ghana — instantly reads as Accra.

function buildBillboardGantry(scene: THREE.Scene, colliders: ColliderBox[]): void {
  const group = new THREE.Group();
  group.name = 'ACC_BILLBOARD_GANTRY';
  group.position.set(0, 0, 0);

  const matSteel = sharedArtLibrary.getMaterial('billboard_steel', {
    color: 0x475569,
    roughness: 0.5,
    metalness: 0.5
  });
  const matPanelFrame = sharedArtLibrary.getMaterial('billboard_panel_frame', {
    color: 0x1e293b,
    roughness: 0.7
  });

  // Two vertical support pylons — on the SIDEWALKS (z=±6.5), not the road.
  // (Sidewalks span z=±4.4..7.7, so z=±6.5 is safely on the walk.)
  for (const sz of [-6.5, 6.5]) {
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 6.5, 12), matSteel);
    pylon.position.set(0, 3.25, sz);
    pylon.castShadow = true;
    group.add(pylon);
    // Concrete base boot at the sidewalk level (visual anchor)
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.4, 12), matPanelFrame);
    boot.position.set(0, 0.2, sz);
    boot.castShadow = true;
    group.add(boot);
  }

  // Horizontal gantry beam crossing the road north-south at y=6.4.
  // Length = distance between pylons (13.0) + a bit of overhang each side.
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 14.4), matSteel);
  beam.position.set(0, 6.4, 0);
  beam.castShadow = true;
  group.add(beam);

  // Diagonal cross-braces for structural realism (X pattern, viewed from the road)
  for (const sz of [-6.5, 6.5]) {
    const braceGeo = new THREE.BoxGeometry(0.1, 4.5, 0.1);
    const brace = new THREE.Mesh(braceGeo, matSteel);
    brace.position.set(0, 4.0, sz / 2);
    brace.rotation.x = Math.atan2(2.5, 6.5); // angle from pylon up to beam center
    group.add(brace);
  }

  // Billboard panel — 8m wide × 2.5m tall, hangs from the beam, faces east
  // AND west (two-sided so players walking either direction see the ad).
  // The panel is in the Y-Z plane (width along Z, height along Y), so its
  // normals point along ±X — visible from east and west.
  const panelW = 8.0;
  const panelH = 2.5;
  const panelY = 5.0;

  // Frame box around the panel (gives depth + edges)
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, panelH + 0.4, panelW + 0.4),
    matPanelFrame
  );
  frame.position.set(0, panelY, 0);
  frame.castShadow = true;
  group.add(frame);

  // Real branded ad creative via the existing signboard texture helper.
  // MTN yellow (#ffcc00) + MTN blue (#003c71) — instantly recognizable.
  const adTex = sharedArtLibrary.getSignboardTexture(
    'billboard_mtn_ad',
    '#ffcc00',         // bg: MTN yellow
    '#003c71',         // border/text accent: MTN blue
    'MTN',             // title
    'Everywhere You Go' // subtitle
  );
  const matAd = sharedArtLibrary.getBasicMaterial('billboard_ad_mtn', { map: adTex });

  // Two ad panels — one facing +X (eastbound traffic), one facing -X (westbound)
  const panelE = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), matAd);
  panelE.position.set(0.18, panelY, 0);
  // Default PlaneGeometry faces +Z; rotate -90° around Y to face +X (east)
  panelE.rotation.y = -Math.PI / 2;
  group.add(panelE);

  const panelW_face = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), matAd);
  panelW_face.position.set(-0.18, panelY, 0);
  // Rotate +90° around Y to face -X (west)
  panelW_face.rotation.y = Math.PI / 2;
  group.add(panelW_face);

  scene.add(group);

  // Pylon colliders — on the sidewalks (where players can walk into them).
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
// Re-export the surface helper for callers that want to verify Y placement
// ============================================================================

export function verifyExtrasSurfaceY(): void {
  // Sanity check that all extras sit on the world surface (used in tests later).
  const positions: Array<[number, number, string]> = [
    [-5.0, -8.5, 'MoMo umbrella'],
    [-1.5, -7.0, 'Hawker table'],
    [5.5, -8.5, 'Cool chest'],
    [-4.5, 7.5, 'Susu kiosk'],
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
