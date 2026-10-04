import * as THREE from 'three';
import { CHARACTER_STYLE_STANDARD, sharedArtLibrary } from './AssetRegistry';

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
  updateAnimation(dt: number, isMoving: boolean, isSprinting: boolean, phaseOffset?: number): void;
}

interface ArchetypeVisualSpec {
  skinHex: number;
  hairHex: number;
  trouserHex: number;
  shoeUpperHex: number;
  shoeSoleHex: number;
  heightScale: number;
  shirtTexture: THREE.CanvasTexture;
  collarHex: number;
  hairStyle: 'taper_fade' | 'sponge_twists' | 'braided_bun' | 'kufi_elder';
  garmentCut: 'fitted_shirt' | 'peplum_skirt' | 'northern_smock';
  hasGlasses?: boolean;
  hasEarrings?: boolean;
  hasBeard?: boolean;
}

export function buildStylizedGhanaianCharacter(archetypeId: CharacterArchetypeId): CharacterRig {
  const spec = getArchetypeSpec(archetypeId);

  const root = new THREE.Group();
  root.name = archetypeId;
  root.scale.setScalar(spec.heightScale);

  // Shared materials from library
  const skinMat = sharedArtLibrary.getMaterial(`skin_${spec.skinHex}`, {
    color: spec.skinHex,
    roughness: CHARACTER_STYLE_STANDARD.skinRoughness,
    metalness: CHARACTER_STYLE_STANDARD.skinMetalness
  });

  const hairMat = sharedArtLibrary.getMaterial(`hair_${spec.hairHex}`, {
    color: spec.hairHex,
    roughness: CHARACTER_STYLE_STANDARD.hairRoughness,
    metalness: 0.02
  });

  const shirtMat = sharedArtLibrary.getMaterial(`shirt_${archetypeId}`, {
    map: spec.shirtTexture,
    roughness: CHARACTER_STYLE_STANDARD.clothRoughness,
    metalness: 0.02
  });

  const collarMat = sharedArtLibrary.getMaterial(`collar_${spec.collarHex}`, {
    color: spec.collarHex,
    roughness: 0.58
  });

  const trouserMat = sharedArtLibrary.getMaterial(`trouser_${spec.trouserHex}`, {
    color: spec.trouserHex,
    roughness: 0.72
  });

  const shoeUpperMat = sharedArtLibrary.getMaterial(`shoe_upper_${spec.shoeUpperHex}`, {
    color: spec.shoeUpperHex,
    roughness: 0.46
  });

  const shoeSoleMat = sharedArtLibrary.getMaterial(`shoe_sole_${spec.shoeSoleHex}`, {
    color: spec.shoeSoleHex,
    roughness: 0.55
  });

  // Ground contact shadow disc
  const shadowGeo = new THREE.CircleGeometry(0.38, 24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.24,
    depthWrite: false
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  // ---------------------------------------------------------------------------
  // 1. PELVIS & LOWER BODY HIERARCHY
  // ---------------------------------------------------------------------------
  const pelvis = new THREE.Group();
  pelvis.name = 'Pelvis';
  pelvis.position.set(0, 0.86, 0);
  root.add(pelvis);

  const hipPelvisMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.165, 0.155, 0.18, 16),
    trouserMat
  );
  hipPelvisMesh.castShadow = true;
  hipPelvisMesh.receiveShadow = true;
  pelvis.add(hipPelvisMesh);

  // ---------------------------------------------------------------------------
  // 2. TORSO, GARMENT SILHOUETTE & NECK
  // ---------------------------------------------------------------------------
  const torso = new THREE.Group();
  torso.name = 'Torso';
  torso.position.set(0, 0.06, 0);
  pelvis.add(torso);

  // Sculpted upper torso (wider shoulders tapering cleanly to waist)
  const chestMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.205, 0.165, 0.48, 18),
    shirtMat
  );
  chestMesh.position.y = 0.24;
  chestMesh.scale.set(1.08, 1.0, 0.74);
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  torso.add(chestMesh);

  // Rounded shoulder cap Bridge
  const shoulderBridge = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.115, 0.26, 8, 14),
    shirtMat
  );
  shoulderBridge.rotation.z = Math.PI / 2;
  shoulderBridge.position.set(0, 0.43, 0);
  shoulderBridge.scale.set(1, 1, 0.82);
  shoulderBridge.castShadow = true;
  torso.add(shoulderBridge);

  // Tailored neckline / collar ring
  const collarRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.088, 0.022, 10, 20),
    collarMat
  );
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.set(0, 0.48, 0.01);
  torso.add(collarRing);

  // Garment-specific silhouette additions
  if (spec.garmentCut === 'peplum_skirt') {
    // Flared Ankara peplum waist frill + midi skirt
    const peplumFlare = new THREE.Mesh(
      new THREE.CylinderGeometry(0.165, 0.235, 0.18, 18),
      shirtMat
    );
    peplumFlare.position.y = 0.03;
    peplumFlare.scale.set(1.05, 1, 0.82);
    peplumFlare.castShadow = true;
    torso.add(peplumFlare);

    const midiSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.175, 0.21, 0.42, 18),
      trouserMat
    );
    midiSkirt.position.y = -0.18;
    midiSkirt.scale.set(1.04, 1, 0.84);
    midiSkirt.castShadow = true;
    pelvis.add(midiSkirt);
  } else if (spec.garmentCut === 'northern_smock') {
    // Flowing woven Batakari / Northern smock tunic skirt
    const smockTunic = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.245, 0.34, 18),
      shirtMat
    );
    smockTunic.position.y = -0.04;
    smockTunic.scale.set(1.06, 1, 0.82);
    smockTunic.castShadow = true;
    torso.add(smockTunic);
  }

  // ---------------------------------------------------------------------------
  // 3. NECK & EXPRESSIVE SCULPTED HEAD
  // ---------------------------------------------------------------------------
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.50, 0);
  torso.add(neck);

  const neckCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.066, 0.11, 14),
    skinMat
  );
  neckCylinder.position.y = 0.04;
  neckCylinder.castShadow = true;
  neck.add(neckCylinder);

  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 0.10, 0);
  neck.add(head);

  // Sculpted cranium + jawline composite (no boxes!)
  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.138, 22, 20),
    skinMat
  );
  cranium.position.set(0, 0.11, 0);
  cranium.scale.set(0.94, 1.08, 0.98);
  cranium.castShadow = true;
  head.add(cranium);

  const jawChin = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.088, 0.055, 10, 16),
    skinMat
  );
  jawChin.position.set(0, 0.065, 0.018);
  jawChin.scale.set(0.95, 1.0, 0.88);
  jawChin.castShadow = true;
  head.add(jawChin);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.032, 10, 10);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(side * 0.128, 0.10, -0.005);
    ear.scale.set(0.45, 0.85, 0.65);
    head.add(ear);
  }

  // Sculpted Nose Bridge & Tip
  const nose = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.018, 0.028, 8, 10),
    skinMat
  );
  nose.position.set(0, 0.095, 0.132);
  nose.rotation.x = -0.18;
  head.add(nose);

  // Expressive Eyes (Sclera + Dark Iris + Brow)
  const scleraMat = sharedArtLibrary.getMaterial('eye_sclera', {
    color: 0xf8fafc,
    roughness: 0.25
  });
  const irisMat = sharedArtLibrary.getMaterial('eye_iris', {
    color: 0x1c1917,
    roughness: 0.15
  });
  const lipMat = sharedArtLibrary.getMaterial(`lips_${spec.skinHex}`, {
    color: 0x432314,
    roughness: 0.5
  });

  for (const side of [-1, 1]) {
    const eyeSclera = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), scleraMat);
    eyeSclera.position.set(side * 0.048, 0.118, 0.118);
    eyeSclera.scale.set(1.15, 0.88, 0.55);
    head.add(eyeSclera);

    const eyeIris = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 10), irisMat);
    eyeIris.position.set(side * 0.048, 0.118, 0.130);
    eyeIris.scale.set(1.0, 1.0, 0.45);
    head.add(eyeIris);

    // Sculpted arched eyebrow
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.032, 6, 8), hairMat);
    brow.rotation.z = Math.PI / 2 - side * 0.12;
    brow.position.set(side * 0.048, 0.146, 0.124);
    head.add(brow);
  }

  // Warm expressive mouth / smile line
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.034, 6, 10), lipMat);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, 0.052, 0.122);
  mouth.scale.set(0.75, 1.0, 0.65);
  head.add(mouth);

  // Archetype Hair & Headwear
  buildHairAndAccessories(head, spec, hairMat);

  // ---------------------------------------------------------------------------
  // 4. ARTICULATED ARMS (Shoulder -> Elbow -> Hand)
  // ---------------------------------------------------------------------------
  const { shoulder: leftShoulder, elbow: leftElbow } = buildArticulatedArm(
    -1,
    skinMat,
    shirtMat,
    collarMat
  );
  const { shoulder: rightShoulder, elbow: rightElbow } = buildArticulatedArm(
    1,
    skinMat,
    shirtMat,
    collarMat
  );
  torso.add(leftShoulder, rightShoulder);

  // ---------------------------------------------------------------------------
  // 5. ARTICULATED LEGS (Hip -> Knee -> Foot)
  // ---------------------------------------------------------------------------
  const { hip: leftHip, knee: leftKnee } = buildArticulatedLeg(
    -1,
    skinMat,
    trouserMat,
    shoeUpperMat,
    shoeSoleMat,
    collarMat,
    spec.garmentCut === 'peplum_skirt'
  );
  const { hip: rightHip, knee: rightKnee } = buildArticulatedLeg(
    1,
    skinMat,
    trouserMat,
    shoeUpperMat,
    shoeSoleMat,
    collarMat,
    spec.garmentCut === 'peplum_skirt'
  );
  pelvis.add(leftHip, rightHip);

  // ---------------------------------------------------------------------------
  // 6. FULL-BODY PROCEDURAL ANIMATION CONTROLLER (Zero Per-Frame Allocations)
  // ---------------------------------------------------------------------------
  let animClock = 0;

  const updateAnimation = (
    dt: number,
    isMoving: boolean,
    isSprinting: boolean,
    phaseOffset = 0
  ): void => {
    if (isMoving) {
      const freq = isSprinting ? 12.8 : 8.6;
      const strideAmp = isSprinting ? 0.68 : 0.44;
      animClock += dt * freq;
      const phase = animClock + phaseOffset;

      const sinP = Math.sin(phase);
      const cosP = Math.cos(phase);

      // Hip swing
      leftHip.rotation.x = sinP * strideAmp;
      rightHip.rotation.x = -sinP * strideAmp;

      // Natural knee bend (knees only flex backward during the recovery/lift phase)
      leftKnee.rotation.x = -Math.max(0, -cosP) * (isSprinting ? 0.85 : 0.52);
      rightKnee.rotation.x = -Math.max(0, cosP) * (isSprinting ? 0.85 : 0.52);

      // Opposite arm swing + natural elbow flexion
      leftShoulder.rotation.x = -sinP * strideAmp * 0.82;
      rightShoulder.rotation.x = sinP * strideAmp * 0.82;
      leftElbow.rotation.x = Math.max(0.15, sinP * 0.35 + (isSprinting ? 0.55 : 0.28));
      rightElbow.rotation.x = Math.max(0.15, -sinP * 0.35 + (isSprinting ? 0.55 : 0.28));

      // Subtle torso counter-twist and forward lean when jogging
      torso.rotation.y = -sinP * 0.08;
      torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, isSprinting ? 0.11 : 0.04, dt * 10);
      head.rotation.y = sinP * 0.05;

      // Vertical stride bounce on pelvis
      const bounce = Math.abs(cosP) * (isSprinting ? 0.048 : 0.026);
      pelvis.position.y = 0.86 + bounce;
    } else {
      animClock += dt * 2.1;
      const idlePhase = animClock + phaseOffset;
      const breath = Math.sin(idlePhase) * 0.012;
      const gentleLook = Math.sin(idlePhase * 0.55) * 0.09;

      const damp = Math.min(1, dt * 10);
      leftHip.rotation.x = THREE.MathUtils.lerp(leftHip.rotation.x, 0, damp);
      rightHip.rotation.x = THREE.MathUtils.lerp(rightHip.rotation.x, 0, damp);
      leftKnee.rotation.x = THREE.MathUtils.lerp(leftKnee.rotation.x, 0, damp);
      rightKnee.rotation.x = THREE.MathUtils.lerp(rightKnee.rotation.x, 0, damp);

      leftShoulder.rotation.x = THREE.MathUtils.lerp(leftShoulder.rotation.x, 0.03, damp);
      rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, -0.03, damp);
      leftElbow.rotation.x = THREE.MathUtils.lerp(leftElbow.rotation.x, 0.14, damp);
      rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, 0.14, damp);

      torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0, damp);
      torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, breath * 1.5, damp);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, gentleLook, damp);

      pelvis.position.y = 0.86 + breath;
    }
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

function buildHairAndAccessories(
  head: THREE.Group,
  spec: ArchetypeVisualSpec,
  hairMat: THREE.Material
): void {
  if (spec.hairStyle === 'taper_fade') {
    // Sculpted Accra high-top fade with rounded crown and crisp temple lineup
    const crownBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.142, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    crownBase.position.set(0, 0.115, -0.008);
    crownBase.scale.set(0.95, 1.06, 1.0);
    crownBase.castShadow = true;
    head.add(crownBase);

    const flatTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.112, 0.124, 0.068, 18),
      hairMat
    );
    flatTop.position.set(0, 0.235, -0.005);
    flatTop.scale.set(0.96, 1.0, 0.98);
    flatTop.castShadow = true;
    head.add(flatTop);
  } else if (spec.hairStyle === 'sponge_twists') {
    const crownBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.144, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hairMat
    );
    crownBase.position.set(0, 0.118, -0.008);
    head.add(crownBase);

    // Textured sponge-twist curls cluster on top
    const curlGeo = new THREE.SphereGeometry(0.034, 8, 8);
    const curlOffsets: Array<[number, number, number]> = [
      [0, 0.245, 0.02],
      [-0.048, 0.238, 0.01],
      [0.048, 0.238, 0.01],
      [-0.035, 0.242, -0.04],
      [0.035, 0.242, -0.04],
      [0, 0.25, -0.03]
    ];
    for (const [cx, cy, cz] of curlOffsets) {
      const curl = new THREE.Mesh(curlGeo, hairMat);
      curl.position.set(cx, cy, cz);
      head.add(curl);
    }
  } else if (spec.hairStyle === 'braided_bun') {
    // Sleek braided base + high sculptural Accra box-braids crown bun
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.143, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat
    );
    hairCap.position.set(0, 0.118, -0.01);
    head.add(hairCap);

    const highBun = new THREE.Mesh(new THREE.SphereGeometry(0.082, 16, 14), hairMat);
    highBun.position.set(0, 0.265, -0.035);
    highBun.scale.set(1.05, 0.92, 1.05);
    highBun.castShadow = true;
    head.add(highBun);

    const bunWrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.068, 0.016, 8, 18),
      sharedArtLibrary.getMaterial('gold_accessory', {
        color: 0xfacc15,
        roughness: 0.3,
        metalness: 0.75
      })
    );
    bunWrap.rotation.x = Math.PI / 2 - 0.2;
    bunWrap.position.set(0, 0.23, -0.03);
    head.add(bunWrap);
  } else if (spec.hairStyle === 'kufi_elder') {
    // Embroidered Kufi cap + salt-and-pepper side hair & beard
    const kufiMat = sharedArtLibrary.getMaterial('kufi_gold_cap', {
      color: 0xd97706,
      roughness: 0.62
    });
    const kufiBandMat = sharedArtLibrary.getMaterial('kufi_band', {
      color: 0x0f172a,
      roughness: 0.7
    });

    const kufiCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.122, 0.134, 0.095, 20),
      kufiMat
    );
    kufiCap.position.set(0, 0.215, -0.005);
    kufiCap.scale.set(0.95, 1, 0.98);
    kufiCap.castShadow = true;
    head.add(kufiCap);

    const kufiTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.136, 0.025, 20),
      kufiBandMat
    );
    kufiTrim.position.set(0, 0.175, -0.005);
    kufiTrim.scale.set(0.95, 1, 0.98);
    head.add(kufiTrim);
  }

  if (spec.hasEarrings) {
    const goldMat = sharedArtLibrary.getMaterial('gold_accessory', {
      color: 0xfacc15,
      roughness: 0.3,
      metalness: 0.75
    });
    const hoopGeo = new THREE.TorusGeometry(0.022, 0.004, 8, 16);
    for (const side of [-1, 1]) {
      const hoop = new THREE.Mesh(hoopGeo, goldMat);
      hoop.rotation.y = Math.PI / 2;
      hoop.position.set(side * 0.135, 0.072, 0.0);
      head.add(hoop);
    }
  }

  if (spec.hasBeard) {
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(0.094, 14, 12),
      hairMat
    );
    beard.position.set(0, 0.042, 0.042);
    beard.scale.set(0.92, 0.65, 0.88);
    head.add(beard);
  }
}

function buildArticulatedArm(
  side: -1 | 1,
  skinMat: THREE.Material,
  shirtMat: THREE.Material,
  cuffMat: THREE.Material
): { shoulder: THREE.Group; elbow: THREE.Group } {
  const shoulder = new THREE.Group();
  shoulder.name = side === -1 ? 'LeftShoulder' : 'RightShoulder';
  shoulder.position.set(side * 0.235, 0.42, 0);

  // Tailored short sleeve with Kente/accent cuff band
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.062, 0.20, 14),
    shirtMat
  );
  sleeve.position.y = -0.09;
  sleeve.castShadow = true;
  shoulder.add(sleeve);

  const cuffBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.064, 0.064, 0.028, 14),
    cuffMat
  );
  cuffBand.position.y = -0.185;
  shoulder.add(cuffBand);

  // Upper arm skin segment to elbow
  const upperArm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.048, 0.09, 8, 12),
    skinMat
  );
  upperArm.position.y = -0.21;
  upperArm.castShadow = true;
  shoulder.add(upperArm);

  // Elbow Joint
  const elbow = new THREE.Group();
  elbow.name = side === -1 ? 'LeftElbow' : 'RightElbow';
  elbow.position.set(0, -0.27, 0);
  shoulder.add(elbow);

  // Tapered Forearm
  const forearm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.038, 0.22, 12),
    skinMat
  );
  forearm.position.y = -0.11;
  forearm.castShadow = true;
  elbow.add(forearm);

  // Sculpted Hand (rounded palm + thumb silhouette)
  const handGroup = new THREE.Group();
  handGroup.name = side === -1 ? 'LeftHand' : 'RightHand';
  handGroup.position.set(0, -0.24, 0);
  elbow.add(handGroup);

  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 10), skinMat);
  palm.scale.set(0.82, 1.18, 0.58);
  palm.castShadow = true;
  handGroup.add(palm);

  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.024, 6, 8), skinMat);
  thumb.position.set(side * -0.028, 0.01, 0.022);
  thumb.rotation.x = 0.4;
  handGroup.add(thumb);

  return { shoulder, elbow };
}

function buildArticulatedLeg(
  side: -1 | 1,
  skinMat: THREE.Material,
  trouserMat: THREE.Material,
  shoeUpperMat: THREE.Material,
  shoeSoleMat: THREE.Material,
  accentMat: THREE.Material,
  isSkirtArchetype: boolean
): { hip: THREE.Group; knee: THREE.Group } {
  const hip = new THREE.Group();
  hip.name = side === -1 ? 'LeftHip' : 'RightHip';
  hip.position.set(side * 0.095, -0.04, 0);

  // Upper thigh
  const thigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.078, 0.064, 0.38, 14),
    trouserMat
  );
  thigh.position.y = -0.19;
  thigh.castShadow = true;
  hip.add(thigh);

  // Knee Joint
  const knee = new THREE.Group();
  knee.name = side === -1 ? 'LeftKnee' : 'RightKnee';
  knee.position.set(0, -0.39, 0);
  hip.add(knee);

  // Calf (skin for midi-skirt archetype, tailored trouser leg for trousers)
  const calf = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.048, 0.36, 14),
    isSkirtArchetype ? skinMat : trouserMat
  );
  calf.position.y = -0.18;
  calf.castShadow = true;
  knee.add(calf);

  // Sculpted Footwear (Sneaker / Loafer with distinct midsole welt, rounded toebox, and heel tab)
  const footGroup = new THREE.Group();
  footGroup.name = side === -1 ? 'LeftFoot' : 'RightFoot';
  footGroup.position.set(0, -0.38, 0.035);
  knee.add(footGroup);

  const sole = new THREE.Mesh(
    new THREE.BoxGeometry(0.106, 0.032, 0.235),
    shoeSoleMat
  );
  sole.position.set(0, -0.03, 0.01);
  sole.castShadow = true;
  footGroup.add(sole);

  const shoeUpper = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.048, 0.11, 8, 14),
    shoeUpperMat
  );
  shoeUpper.rotation.x = Math.PI / 2;
  shoeUpper.position.set(0, 0.005, 0.008);
  shoeUpper.scale.set(1.04, 1.0, 0.76);
  shoeUpper.castShadow = true;
  footGroup.add(shoeUpper);

  const heelAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.088, 0.036, 0.025),
    accentMat
  );
  heelAccent.position.set(0, 0.015, -0.09);
  footGroup.add(heelAccent);

  return { hip, knee };
}

function getArchetypeSpec(id: CharacterArchetypeId): ArchetypeVisualSpec {
  switch (id) {
    case 'PLAYER_GHA_001':
      return {
        skinHex: 0x6b3e26,
        hairHex: 0x141416,
        trouserHex: 0x1e293b,
        shoeUpperHex: 0xf8fafc,
        shoeSoleHex: 0xfef3c7,
        heightScale: 1.0,
        shirtTexture: sharedArtLibrary.getKenteTrimTexture(),
        collarHex: 0x059669,
        hairStyle: 'taper_fade',
        garmentCut: 'fitted_shirt'
      };
    case 'NPC_MALE_001':
      return {
        skinHex: 0x5c3317,
        hairHex: 0x18181b,
        trouserHex: 0x0f172a,
        shoeUpperHex: 0x78350f,
        shoeSoleHex: 0x27272a,
        heightScale: 1.01,
        shirtTexture: sharedArtLibrary.getTerracottaShirtTexture(),
        collarHex: 0xf59e0b,
        hairStyle: 'sponge_twists',
        garmentCut: 'fitted_shirt'
      };
    case 'NPC_FEMALE_001':
      return {
        skinHex: 0x7a482b,
        hairHex: 0x18181b,
        trouserHex: 0x065f46,
        shoeUpperHex: 0xd97706,
        shoeSoleHex: 0x451a03,
        heightScale: 0.965,
        shirtTexture: sharedArtLibrary.getAnkaraPatternTexture(),
        collarHex: 0xfacc15,
        hairStyle: 'braided_bun',
        garmentCut: 'peplum_skirt',
        hasEarrings: true
      };
    case 'NPC_OLDER_001':
      return {
        skinHex: 0x4a2511,
        hairHex: 0x9ca3af, // Salt-and-pepper elder hair & beard
        trouserHex: 0x334155,
        shoeUpperHex: 0x451a03,
        shoeSoleHex: 0x1c1917,
        heightScale: 0.985,
        shirtTexture: sharedArtLibrary.getNorthernSmockTexture(),
        collarHex: 0xd97706,
        hairStyle: 'kufi_elder',
        garmentCut: 'northern_smock',
        hasBeard: true
      };
  }
}
