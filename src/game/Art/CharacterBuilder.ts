import * as THREE from 'three';
import { sharedArtLibrary } from './AssetRegistry';

export type CharacterArchetypeId =
  | 'PLAYER_GHA_001'
  | 'NPC_MALE_001'
  | 'NPC_FEMALE_001'
  | 'NPC_OLDER_001';

export interface CharacterRig {
  readonly assetId: CharacterArchetypeId;
  readonly root: THREE.Group;
  readonly pelvis: THREE.Group;
  readonly torso: THREE.Group;
  readonly neck: THREE.Group;
  readonly head: THREE.Group;
  readonly leftShoulder: THREE.Group;
  readonly leftElbow: THREE.Group;
  readonly rightShoulder: THREE.Group;
  readonly rightElbow: THREE.Group;
  readonly leftHip: THREE.Group;
  readonly leftKnee: THREE.Group;
  readonly rightHip: THREE.Group;
  readonly rightKnee: THREE.Group;
  updateAnimation(
    dt: number,
    isMoving: boolean,
    isSprinting: boolean,
    phaseOffset?: number,
    turnRate?: number,
    moveSpeedRatio?: number
  ): void;
}

interface ArchetypeVisualSpec {
  skinHex: number;
  hairHex: number;
  trouserHex: number;
  shoeHex: number;
  heightScale: number;
  shirtColor: number;
  accentColor: number;
  hairStyle: 'block_fade' | 'block_twists' | 'block_bun' | 'block_kufi';
  garmentCut: 'block_shirt' | 'block_skirt' | 'block_smock';
  hasEarrings?: boolean;
  hasBeard?: boolean;
}

/**
 * Middle-ground stylized blocky geometry.
 * Head-to-body ≈ 1:5, medium human eyes, chunky but human limbs.
 * Feels like a second life in Accra — not a toy.
 */
interface SharedBlockyGeometries {
  shadowDisc: THREE.CircleGeometry;
  torsoBox: THREE.BoxGeometry;
  pelvisBox: THREE.BoxGeometry;
  headBox: THREE.BoxGeometry;
  neckBox: THREE.BoxGeometry;
  upperArm: THREE.BoxGeometry;
  lowerArm: THREE.BoxGeometry;
  hand: THREE.BoxGeometry;
  thigh: THREE.BoxGeometry;
  calf: THREE.BoxGeometry;
  foot: THREE.BoxGeometry;
  eyeWhite: THREE.SphereGeometry;
  pupil: THREE.SphereGeometry;
  hairBlock: THREE.BoxGeometry;
  ear: THREE.BoxGeometry;
}

let cachedBlockyGeos: SharedBlockyGeometries | null = null;

function getSharedBlockyGeometries(): SharedBlockyGeometries {
  if (!cachedBlockyGeos) {
    const shadowDisc = new THREE.CircleGeometry(0.40, 16);
    shadowDisc.rotateX(-Math.PI / 2);

    cachedBlockyGeos = {
      shadowDisc,
      // Torso — solid, readable
      torsoBox: new THREE.BoxGeometry(0.40, 0.46, 0.24),
      pelvisBox: new THREE.BoxGeometry(0.38, 0.20, 0.22),
      // Head — slightly larger than realistic (1:5), not Roblox-huge
      headBox: new THREE.BoxGeometry(0.30, 0.30, 0.30),
      neckBox: new THREE.BoxGeometry(0.12, 0.09, 0.12),
      // Chunky but human limbs
      upperArm: new THREE.BoxGeometry(0.12, 0.26, 0.12),
      lowerArm: new THREE.BoxGeometry(0.11, 0.24, 0.11),
      hand: new THREE.BoxGeometry(0.10, 0.10, 0.10),
      thigh: new THREE.BoxGeometry(0.14, 0.32, 0.14),
      calf: new THREE.BoxGeometry(0.13, 0.30, 0.13),
      foot: new THREE.BoxGeometry(0.13, 0.07, 0.20),
      // Medium human eyes (not giant)
      eyeWhite: new THREE.SphereGeometry(0.030, 10, 8),
      pupil: new THREE.SphereGeometry(0.016, 8, 6),
      hairBlock: new THREE.BoxGeometry(0.32, 0.10, 0.32),
      ear: new THREE.BoxGeometry(0.05, 0.08, 0.035)
    };
  }
  return cachedBlockyGeos;
}

function getArchetypeSpec(id: CharacterArchetypeId): ArchetypeVisualSpec {
  switch (id) {
    case 'PLAYER_GHA_001':
      return {
        skinHex: 0x6b3e26,
        hairHex: 0x1c1917,
        trouserHex: 0x1e293b,
        shoeHex: 0xf8fafc,
        heightScale: 1.0,
        shirtColor: 0xf59e0b,
        accentColor: 0x059669,
        hairStyle: 'block_fade',
        garmentCut: 'block_shirt'
      };
    case 'NPC_MALE_001':
      return {
        skinHex: 0x5c3317,
        hairHex: 0x1c1917,
        trouserHex: 0x1e3a5f,
        shoeHex: 0x78350f,
        heightScale: 1.02,
        shirtColor: 0xc2410c,
        accentColor: 0xfacc15,
        hairStyle: 'block_twists',
        garmentCut: 'block_shirt'
      };
    case 'NPC_FEMALE_001':
      return {
        skinHex: 0x7a482b,
        hairHex: 0x1c1917,
        trouserHex: 0x059669,
        shoeHex: 0xf59e0b,
        heightScale: 0.96,
        shirtColor: 0x047857,
        accentColor: 0xdc2626,
        hairStyle: 'block_bun',
        garmentCut: 'block_skirt',
        hasEarrings: true
      };
    case 'NPC_OLDER_001':
      return {
        skinHex: 0x4a2511,
        hairHex: 0x78716c,
        trouserHex: 0x1e293b,
        shoeHex: 0x292524,
        heightScale: 0.98,
        shirtColor: 0x0284c7,
        accentColor: 0xf8fafc,
        hairStyle: 'block_kufi',
        garmentCut: 'block_smock',
        hasBeard: true
      };
  }
}

function buildBlockyHair(
  head: THREE.Group,
  spec: ArchetypeVisualSpec,
  hairMat: THREE.MeshStandardMaterial,
  geos: SharedBlockyGeometries
): void {
  const hairTop = new THREE.Mesh(geos.hairBlock, hairMat);
  hairTop.position.y = 0.17;
  hairTop.castShadow = true;
  head.add(hairTop);

  if (spec.hairStyle === 'block_fade') {
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.28), hairMat);
    sideL.position.set(-0.155, 0.05, 0);
    head.add(sideL);
    const sideR = sideL.clone();
    sideR.position.x = 0.155;
    head.add(sideR);
  } else if (spec.hairStyle === 'block_twists') {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const twist = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.07), hairMat);
        twist.position.set(i * 0.09, 0.24, j * 0.09);
        head.add(twist);
      }
    }
  } else if (spec.hairStyle === 'block_bun') {
    const bun = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), hairMat);
    bun.position.set(0, 0.26, -0.05);
    head.add(bun);
  } else if (spec.hairStyle === 'block_kufi') {
    const kufi = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.07, 0.34),
      sharedArtLibrary.getMaterial('kufi_cap', { color: 0xf8fafc, roughness: 0.6 })
    );
    kufi.position.y = 0.19;
    head.add(kufi);
  }

  if (spec.hasBeard) {
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.10), hairMat);
    beard.position.set(0, -0.14, 0.14);
    head.add(beard);
  }
}

function buildBlockyArm(
  side: number,
  geos: SharedBlockyGeometries,
  skinMat: THREE.MeshStandardMaterial,
  shirtMat: THREE.MeshStandardMaterial
): { shoulder: THREE.Group; elbow: THREE.Group } {
  const shoulder = new THREE.Group();
  shoulder.name = side < 0 ? 'LeftShoulder' : 'RightShoulder';
  shoulder.position.set(side * 0.26, 0.17, 0);

  const upper = new THREE.Mesh(geos.upperArm, shirtMat);
  upper.position.y = -0.13;
  upper.castShadow = true;
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.name = side < 0 ? 'LeftElbow' : 'RightElbow';
  elbow.position.y = -0.26;
  shoulder.add(elbow);

  const lower = new THREE.Mesh(geos.lowerArm, skinMat);
  lower.position.y = -0.12;
  lower.castShadow = true;
  elbow.add(lower);

  const hand = new THREE.Mesh(geos.hand, skinMat);
  hand.position.y = -0.26;
  hand.castShadow = true;
  elbow.add(hand);

  return { shoulder, elbow };
}

function buildBlockyLeg(
  side: number,
  geos: SharedBlockyGeometries,
  skinMat: THREE.MeshStandardMaterial,
  trouserMat: THREE.MeshStandardMaterial,
  shoeMat: THREE.MeshStandardMaterial,
  isSkirt: boolean
): { hip: THREE.Group; knee: THREE.Group } {
  const hip = new THREE.Group();
  hip.name = side < 0 ? 'LeftHip' : 'RightHip';
  hip.position.set(side * 0.11, -0.10, 0);

  const thighMat = isSkirt ? skinMat : trouserMat;
  const thigh = new THREE.Mesh(geos.thigh, thighMat);
  thigh.position.y = -0.16;
  thigh.castShadow = true;
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.name = side < 0 ? 'LeftKnee' : 'RightKnee';
  knee.position.y = -0.32;
  hip.add(knee);

  const calf = new THREE.Mesh(geos.calf, isSkirt ? skinMat : trouserMat);
  calf.position.y = -0.15;
  calf.castShadow = true;
  knee.add(calf);

  const foot = new THREE.Mesh(geos.foot, shoeMat);
  foot.position.set(0, -0.32, 0.035);
  foot.castShadow = true;
  knee.add(foot);

  return { hip, knee };
}

/**
 * Middle-ground stylized blocky Ghanaian character.
 * Feels like a second life in Accra — simplified, readable, human.
 */
export function buildStylizedGhanaianCharacter(
  archetypeId: CharacterArchetypeId
): CharacterRig {
  const spec = getArchetypeSpec(archetypeId);
  const geos = getSharedBlockyGeometries();

  const root = new THREE.Group();
  root.name = archetypeId;
  root.scale.setScalar(spec.heightScale);

  const skinMat = sharedArtLibrary.getMaterial(`skin_${spec.skinHex}`, {
    color: spec.skinHex,
    roughness: 0.55,
    metalness: 0.04
  });
  const hairMat = sharedArtLibrary.getMaterial(`hair_${spec.hairHex}`, {
    color: spec.hairHex,
    roughness: 0.8,
    metalness: 0.02
  });
  const shirtMat = sharedArtLibrary.getMaterial(`shirt_block_${archetypeId}`, {
    color: spec.shirtColor,
    roughness: 0.65,
    metalness: 0.02
  });
  const trouserMat = sharedArtLibrary.getMaterial(`trouser_${spec.trouserHex}`, {
    color: spec.trouserHex,
    roughness: 0.7
  });
  const shoeMat = sharedArtLibrary.getMaterial(`shoe_${spec.shoeHex}`, {
    color: spec.shoeHex,
    roughness: 0.5
  });

  // Contact shadow
  const shadowMat = sharedArtLibrary.getBasicMaterial('char_contact_shadow', {
    color: 0x0f172a,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
  const shadowDisc = new THREE.Mesh(geos.shadowDisc, shadowMat);
  shadowDisc.position.y = 0.01;
  root.add(shadowDisc);

  // PELVIS
  const pelvis = new THREE.Group();
  pelvis.name = 'Pelvis';
  pelvis.position.set(0, 0.88, 0);
  root.add(pelvis);

  const pelvisMesh = new THREE.Mesh(geos.pelvisBox, trouserMat);
  pelvisMesh.castShadow = true;
  pelvisMesh.receiveShadow = true;
  pelvis.add(pelvisMesh);

  // TORSO
  const torso = new THREE.Group();
  torso.name = 'Torso';
  torso.position.set(0, 0.23, 0);
  pelvis.add(torso);

  const torsoMesh = new THREE.Mesh(geos.torsoBox, shirtMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torso.add(torsoMesh);

  // Ghanaian accent stripe
  const accentMat = sharedArtLibrary.getMaterial(`accent_${spec.accentColor}`, {
    color: spec.accentColor,
    roughness: 0.5
  });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.26), accentMat);
  stripe.position.y = 0.09;
  torso.add(stripe);

  if (spec.garmentCut === 'block_skirt') {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.28), trouserMat);
    skirt.position.y = -0.16;
    skirt.castShadow = true;
    pelvis.add(skirt);
  }

  // NECK + HEAD
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.27, 0);
  torso.add(neck);

  const neckMesh = new THREE.Mesh(geos.neckBox, skinMat);
  neckMesh.castShadow = true;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 0.20, 0);
  neck.add(head);

  const headMesh = new THREE.Mesh(geos.headBox, skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Medium human eyes (not giant)
  const eyeWhiteMat = sharedArtLibrary.getMaterial('eye_white', {
    color: 0xf8fafc,
    roughness: 0.35
  });
  const pupilMat = sharedArtLibrary.getMaterial('pupil', {
    color: 0x1c0d06,
    roughness: 0.4
  });

  for (const side of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(geos.eyeWhite, eyeWhiteMat);
    eyeWhite.position.set(side * 0.075, 0.03, 0.155);
    head.add(eyeWhite);

    const pupil = new THREE.Mesh(geos.pupil, pupilMat);
    pupil.position.set(side * 0.075, 0.03, 0.175);
    head.add(pupil);
  }

  // Simple human mouth
  const mouthMat = sharedArtLibrary.getMaterial('mouth', {
    color: 0x3f1f0f,
    roughness: 0.6
  });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.03), mouthMat);
  mouth.position.set(0, -0.07, 0.155);
  head.add(mouth);

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(geos.ear, skinMat);
    ear.position.set(side * 0.165, 0.015, 0);
    head.add(ear);
  }

  // Earrings
  if (spec.hasEarrings) {
    const earringMat = sharedArtLibrary.getMaterial('gold_earring', {
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.55
    });
    for (const side of [-1, 1]) {
      const hoop = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.02), earringMat);
      hoop.position.set(side * 0.18, -0.05, 0);
      head.add(hoop);
    }
  }

  buildBlockyHair(head, spec, hairMat, geos);

  // ARMS
  const { shoulder: leftShoulder, elbow: leftElbow } = buildBlockyArm(-1, geos, skinMat, shirtMat);
  const { shoulder: rightShoulder, elbow: rightElbow } = buildBlockyArm(1, geos, skinMat, shirtMat);
  torso.add(leftShoulder, rightShoulder);

  // LEGS
  const isSkirt = spec.garmentCut === 'block_skirt';
  const { hip: leftHip, knee: leftKnee } = buildBlockyLeg(-1, geos, skinMat, trouserMat, shoeMat, isSkirt);
  const { hip: rightHip, knee: rightKnee } = buildBlockyLeg(1, geos, skinMat, trouserMat, shoeMat, isSkirt);
  pelvis.add(leftHip, rightHip);

  // ANIMATION
  let animClock = 0;
  let idleClock = 0;
  let walkBlend = 0;
  let sprintBlend = 0;

  const updateAnimation = (
    dt: number,
    isMoving: boolean,
    isSprinting: boolean,
    phaseOffset = 0,
    _turnRate = 0,
    moveSpeedRatio = 1
  ): void => {
    const smoothRate = 1 - Math.exp(-dt * 12);
    const targetWalk = isMoving ? THREE.MathUtils.clamp(moveSpeedRatio, 0.25, 1.0) : 0;
    const targetSprint = isMoving && isSprinting ? 1 : 0;

    walkBlend = THREE.MathUtils.lerp(walkBlend, targetWalk, smoothRate);
    sprintBlend = THREE.MathUtils.lerp(sprintBlend, targetSprint, smoothRate);

    const cadence = THREE.MathUtils.lerp(7.5, 11.0, sprintBlend);
    if (walkBlend > 0.01) {
      animClock += dt * cadence * Math.max(0.55, walkBlend);
    }
    idleClock += dt * 1.8;

    const phase = animClock + phaseOffset;
    const sinP = Math.sin(phase);
    const cosP = Math.cos(phase);

    // Idle breathing
    const breath = Math.sin(idleClock) * 0.007 * (1 - walkBlend);
    torso.position.y = 0.23 + breath;
    head.rotation.y = Math.sin(idleClock * 0.4) * 0.04 * (1 - walkBlend);

    // Legs
    const legAmp = THREE.MathUtils.lerp(0.42, 0.68, sprintBlend) * walkBlend;
    leftHip.rotation.x = -sinP * legAmp;
    rightHip.rotation.x = sinP * legAmp;

    const maxKnee = THREE.MathUtils.lerp(0.52, 0.95, sprintBlend) * walkBlend;
    leftKnee.rotation.x = Math.max(0, cosP) * maxKnee;
    rightKnee.rotation.x = Math.max(0, -cosP) * maxKnee;

    // Arms
    const armAmp = THREE.MathUtils.lerp(0.32, 0.52, sprintBlend) * walkBlend;
    leftShoulder.rotation.x = sinP * armAmp;
    rightShoulder.rotation.x = -sinP * armAmp;

    // Elbow
    const elbowBase = THREE.MathUtils.lerp(-0.22, -0.85, sprintBlend) * walkBlend - 0.12;
    leftElbow.rotation.x = elbowBase - (-sinP) * 0.14 * walkBlend;
    rightElbow.rotation.x = elbowBase - sinP * 0.14 * walkBlend;
  };

  return {
    assetId: archetypeId,
    root,
    pelvis,
    torso,
    neck,
    head,
    leftShoulder,
    leftElbow,
    rightShoulder,
    rightElbow,
    leftHip,
    leftKnee,
    rightHip,
    rightKnee,
    updateAnimation
  };
}
