import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';

export function buildTrotroStopAndVehicle(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_PROP_001';
  group.position.set(9.0, 0, 6.2);

  const matConcretePad = sharedArtLibrary.getMaterial('trotro_pad_concrete', {
    color: 0x94a3b8,
    roughness: 0.85
  });
  const matShelterSteel = sharedArtLibrary.getMaterial('trotro_shelter_steel', {
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.55
  });
  const matRoofGalv = sharedArtLibrary.getMaterial('trotro_roof_galv', {
    map: sharedArtLibrary.getCorrugatedRoofTexture('#64748b', '#475569'),
    roughness: 0.48,
    metalness: 0.35
  });
  const matBenchWood = sharedArtLibrary.getMaterial('trotro_bench_wood', {
    color: 0x92400e,
    roughness: 0.65
  });
  const matVanWhite = sharedArtLibrary.getMaterial('trotro_van_white', {
    color: 0xf8fafc,
    roughness: 0.34,
    metalness: 0.12
  });
  const matVanCobalt = sharedArtLibrary.getMaterial('trotro_van_cobalt', {
    color: 0x0284c7,
    roughness: 0.38,
    metalness: 0.18
  });
  const matTaxiYellow = sharedArtLibrary.getMaterial('trotro_taxi_yellow', {
    color: 0xfacc15,
    roughness: 0.38
  });
  const matRedStripe = sharedArtLibrary.getMaterial('trotro_red_stripe', {
    color: 0xdc2626,
    roughness: 0.42
  });
  const matGlassDark = sharedArtLibrary.getMaterial('trotro_glass_dark', {
    color: 0x0f172a,
    roughness: 0.16,
    metalness: 0.38
  });
  const matTireRubber = sharedArtLibrary.getMaterial('trotro_tire_rubber', {
    color: 0x111827,
    roughness: 0.88
  });
  const matRimSilver = sharedArtLibrary.getMaterial('trotro_rim_silver', {
    color: 0xe2e8f0,
    roughness: 0.28,
    metalness: 0.72
  });
  const matHeadlight = sharedArtLibrary.getBasicMaterial('trotro_headlight', {
    color: 0xfef08a
  });
  const matTaillight = sharedArtLibrary.getBasicMaterial('trotro_taillight', {
    color: 0xef4444
  });

  // 1. Commuter Boarding Shelter (`ACC_PROP_001`) at South walkway curb
  const boardingPad = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 2.8), matConcretePad);
  boardingPad.position.set(0, 0.05, 0.25);
  boardingPad.receiveShadow = true;
  group.add(boardingPad);

  for (const [px, pz] of [
    [-2.3, -0.65],
    [2.3, -0.65],
    [-2.3, 1.2],
    [2.3, 1.2]
  ] as [number, number][]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.65, 12), matShelterSteel);
    post.position.set(px, 1.36, pz);
    post.castShadow = true;
    group.add(post);
  }

  // Back windbreak panel & slatted wooden commuter bench
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.35, 0.1), matVanCobalt);
  backPanel.position.set(0, 1.38, 1.2);
  const backStripe = new THREE.Mesh(new THREE.BoxGeometry(4.52, 0.18, 0.12), matTaxiYellow);
  backStripe.position.set(0, 1.95, 1.2);
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.1, 0.5), matBenchWood);
  benchSeat.position.set(0, 0.52, 0.82);
  benchSeat.castShadow = true;
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.36, 0.08), matBenchWood);
  benchBack.position.set(0, 0.82, 1.06);
  for (const lx of [-1.6, 0, 1.6]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.44), matShelterSteel);
    leg.position.set(lx, 0.26, 0.82);
    group.add(leg);
  }
  group.add(backPanel, backStripe, benchSeat, benchBack);

  // Shelter roof & solidly mounted front/back Osu–Circle Station signboard
  const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.14, 2.75), matRoofGalv);
  shelterRoof.position.set(0, 2.72, 0.28);
  shelterRoof.rotation.x = -0.05;
  shelterRoof.castShadow = true;
  group.add(shelterRoof);

  // Solid signboard housing attached directly to the front shelter posts at z = -0.65
  const signBacking = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.62, 0.14), matShelterSteel);
  signBacking.position.set(0, 3.08, -0.65);
  const shelterSignTex = sharedArtLibrary.getSignboardTexture(
    'trotro_stop_001_v2',
    '#0284c7',
    '#facc15',
    'OSU – CIRCLE STATION',
    'TROTRO STOP · ADABRAKA · ₵6 FARE',
    '#ffffff'
  );
  const signMat = sharedArtLibrary.getBasicMaterial('sign_panel_trotro_001_v2', {
    map: shelterSignTex
  });
  const shelterSignFront = new THREE.Mesh(new THREE.PlaneGeometry(4.56, 0.54), signMat);
  shelterSignFront.position.set(0, 3.08, -0.73);
  shelterSignFront.rotation.y = Math.PI;
  const shelterSignBack = new THREE.Mesh(new THREE.PlaneGeometry(4.56, 0.54), signMat);
  shelterSignBack.position.set(0, 3.08, -0.57);
  group.add(signBacking, shelterSignFront, shelterSignBack);

  // 2. Stationary Accra Trotro Sprinter Minibus (`ACC_TROTRO_001`)
  // Parked directly in front of the Trotro Stop shelter at Local X = 0.0, Local Z = -3.65 (World X = 9.0, Z = 2.55)
  // Facing West (-X) so its curb-side sliding passenger door (+Z) opens toward the shelter!
  const van = new THREE.Group();
  van.name = 'ACC_TROTRO_001';
  van.position.set(0.0, 0.02, -3.65);

  // Main rear/mid lower chassis (x from -1.85 to +2.35, length 4.2m)
  const lowerChassis = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.92, 2.02), matVanCobalt);
  lowerChassis.position.set(0.25, 0.82, 0);
  lowerChassis.castShadow = true;
  lowerChassis.receiveShadow = true;

  // Taxi-yellow commercial beltline stripe & red Ghana accent trim
  const yellowBeltStripe = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.18, 2.05), matTaxiYellow);
  yellowBeltStripe.position.set(0.25, 1.32, 0);
  const redTrimStripe = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.06, 2.06), matRedStripe);
  redTrimStripe.position.set(0.25, 1.2, 0);

  // Upper white passenger cabin (x from -1.65 to +2.35, length 4.0m)
  const upperCabin = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.96, 1.96), matVanWhite);
  upperCabin.position.set(0.35, 1.84, 0);
  upperCabin.castShadow = true;

  // High-roof Sprinter crown cap
  const roofCrown = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.16, 1.82), matVanWhite);
  roofCrown.position.set(0.38, 2.38, 0);
  roofCrown.castShadow = true;

  // Contoured front engine hood & cab nose (-X is front of van!)
  const frontHood = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.86, 1.96), matVanCobalt);
  frontHood.position.set(-2.15, 0.79, 0);
  frontHood.castShadow = true;
  const frontHoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 1.92), matTaxiYellow);
  frontHoodTop.position.set(-2.14, 1.25, 0);

  // Flush front windshield block bridging the hood (-2.15) to the upper cabin (-1.65) with zero gaps!
  const cabWindshieldBlock = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.86, 1.88), matVanWhite);
  cabWindshieldBlock.position.set(-1.76, 1.76, 0);
  const windshieldGlass = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 1.74), matGlassDark);
  windshieldGlass.position.set(-1.82, 1.76, 0);

  // Overhead front route placard above windshield ("CIRCLE - OSU")
  const routePlacard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 1.24), matTaxiYellow);
  routePlacard.position.set(-1.67, 2.24, 0);

  // Rear window (+X is rear of van)
  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.68, 1.62), matGlassDark);
  rearWindow.position.set(2.36, 1.84, 0);

  // Side passenger windows along road side (-Z) and curb side (+Z)
  for (const wx of [-1.15, -0.15, 0.85, 1.78]) {
    const winRoad = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.62, 0.05), matGlassDark);
    winRoad.position.set(wx, 1.84, -0.97);
    van.add(winRoad);
  }
  for (const wx of [-1.15, 0.95, 1.82]) {
    const winCurb = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.62, 0.05), matGlassDark);
    winCurb.position.set(wx, 1.84, 0.97);
    van.add(winCurb);
  }

  // Open sliding passenger doorway on curb side (+Z facing the Trotro shelter!)
  const doorwayRecess = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.68, 0.14), matGlassDark);
  doorwayRecess.position.set(-0.12, 1.32, 0.96);
  const slidingDoorStep = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.1, 0.22), matTaxiYellow);
  slidingDoorStep.position.set(-0.12, 0.4, 1.06);
  const openDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.64, 0.07), matVanCobalt);
  openDoorLeaf.position.set(0.84, 1.32, 1.05);
  van.add(doorwayRecess, slidingDoorStep, openDoorLeaf);

  // Heavy-duty bumpers, front grille, headlights, taillights, side mirrors, and yellow Ghana plates
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 2.08), matShelterSteel);
  frontBumper.position.set(-2.54, 0.44, 0);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 2.08), matShelterSteel);
  rearBumper.position.set(2.42, 0.44, 0);
  const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 1.24), matShelterSteel);
  frontGrille.position.set(-2.54, 0.82, 0);

  for (const lz of [-0.74, 0.74]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.3), matHeadlight);
    headlight.position.set(-2.54, 0.84, lz);
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.24), matTaillight);
    taillight.position.set(2.38, 0.9, lz);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.18), matShelterSteel);
    mirror.position.set(-1.62, 1.66, lz > 0 ? 1.08 : -1.08);
    van.add(headlight, taillight, mirror);
  }

  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.52), matTaxiYellow);
  frontPlate.position.set(-2.67, 0.44, 0);
  const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.52), matTaxiYellow);
  rearPlate.position.set(2.54, 0.44, 0);

  // Steel roof rack loaded with market sacks, travel bag & yellow Kufuor jerrycan
  const roofRack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.65), matShelterSteel);
  roofRack.position.set(0.5, 2.5, 0);
  const luggageBag = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.36, 0.82), matBenchWood);
  luggageBag.position.set(0.95, 2.68, -0.18);
  const marketSack = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.32, 0.68), matRedStripe);
  marketSack.position.set(-0.05, 2.66, -0.22);
  const jerrycan = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.34), matTaxiYellow);
  jerrycan.position.set(0.35, 2.72, 0.38);

  // 4 detailed wheels with wheel-arch flares, rubber tires & silver hubcaps
  for (const [wx, wz] of [
    [-1.48, -0.98],
    [1.42, -0.98],
    [-1.48, 0.98],
    [1.42, 0.98]
  ] as [number, number][]) {
    const arch = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.18, 0.16), matShelterSteel);
    arch.position.set(wx, 0.82, wz > 0 ? 0.98 : -0.98);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 18), matTireRubber);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(wx, 0.4, wz);
    tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 14), matRimSilver);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(wx, 0.4, wz);
    van.add(arch, tire, rim);
  }

  van.add(
    lowerChassis,
    yellowBeltStripe,
    redTrimStripe,
    upperCabin,
    roofCrown,
    frontHood,
    frontHoodTop,
    cabWindshieldBlock,
    windshieldGlass,
    routePlacard,
    rearWindow,
    frontBumper,
    rearBumper,
    frontGrille,
    frontPlate,
    rearPlate,
    roofRack,
    luggageBag,
    marketSack,
    jerrycan
  );
  group.add(van);

  scene.add(group);

  // Colliders for both the shelter (world X: [6.4, 11.6], Z: [5.45, 7.6]) and the parked Trotro minibus (world X: [6.3, 11.6], Z: [1.45, 3.65])
  colliders.push(
    {
      id: 'ACC_PROP_001_SHELTER',
      minX: 6.4,
      maxX: 11.6,
      minZ: 5.45,
      maxZ: 7.6,
      height: 3.1
    },
    {
      id: 'ACC_TROTRO_001',
      minX: 6.3,
      maxX: 11.6,
      minZ: 1.45,
      maxZ: 3.65,
      height: 2.7
    }
  );

  interactables.push({
    id: 'trotro_stop',
    assetId: 'ACC_PROP_001',
    title: 'Osu–Circle Trotro Station',
    promptLabel: 'Trotro',
    interactionResponse: 'Osu–Circle station — mate collecting fares.',
    position: new THREE.Vector3(9.0, 0.14, 4.9),
    lookAtPosition: new THREE.Vector3(9.0, 0.14, 3.2),
    radius: 3.5
  });
}
