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
  skinCss: string;
  lipCss: string;
  hairHex: number;
  trouserHex: number;
  shoeUpperHex: number;
  shoeSoleHex: number;
  heightScale: number;
  shirtTexture: THREE.CanvasTexture;
  collarHex: number;
  hairStyle: 'taper_fade' | 'sponge_twists' | 'braided_bun' | 'kufi_elder';
  garmentCut: 'fitted_shirt' | 'peplum_skirt' | 'northern_smock';
  hasEarrings?: boolean;
  hasBeard?: boolean;
  hasWristwatch?: boolean;
}

/**
 * Shared geometry cache for all characters (player + NPCs) to prevent
 * duplicate BufferGeometry allocations across character instances.
 */
interface SharedCharacterGeometries {
  shadowDisc: THREE.CircleGeometry;
  hipBowl: THREE.CapsuleGeometry;
  beltBand: THREE.CylinderGeometry;
  torsoLathe: THREE.LatheGeometry;
  shoulderBridge: THREE.CapsuleGeometry;
  collarStand: THREE.CylinderGeometry;
  lapel: THREE.BoxGeometry;
  peplumFlare: THREE.CylinderGeometry;
  midiSkirt: THREE.CylinderGeometry;
  smockTunic: THREE.CylinderGeometry;
  neckCylinder: THREE.CylinderGeometry;
  cranium: THREE.SphereGeometry;
  jawChin: THREE.CapsuleGeometry;
  facePatch: THREE.SphereGeometry;
  noseBridge: THREE.CapsuleGeometry;
  noseTip: THREE.SphereGeometry;
  nostrilWing: THREE.SphereGeometry;
  ear: THREE.SphereGeometry;
  shoulderCap: THREE.SphereGeometry;
  sleeve: THREE.CylinderGeometry;
  cuffBand: THREE.CylinderGeometry;
  upperArm: THREE.CapsuleGeometry;
  elbowCap: THREE.SphereGeometry;
  forearm: THREE.CylinderGeometry;
  watchBand: THREE.CylinderGeometry;
  watchDial: THREE.CylinderGeometry;
  wristJoint: THREE.SphereGeometry;
  palm: THREE.CapsuleGeometry;
  fingers: THREE.CapsuleGeometry[];
  thumb: THREE.CapsuleGeometry;
  hipCap: THREE.SphereGeometry;
  thigh: THREE.CylinderGeometry;
  kneeCap: THREE.SphereGeometry;
  calf: THREE.CylinderGeometry;
  ankleCuff: THREE.CylinderGeometry;
  shoeSole: THREE.BoxGeometry;
  toeCap: THREE.CylinderGeometry;
  shoeUpper: THREE.CapsuleGeometry;
  tongue: THREE.BoxGeometry;
  heelAccent: THREE.CylinderGeometry;
}

let cachedCharGeos: SharedCharacterGeometries | null = null;

function getSharedCharacterGeometries(): SharedCharacterGeometries {
  if (!cachedCharGeos) {
    const shadowDisc = new THREE.CircleGeometry(0.36, 24);
    shadowDisc.rotateX(-Math.PI / 2);

    const lathePts = [
      new THREE.Vector2(0.01, 0.0),
      new THREE.Vector2(0.166, 0.015),
      new THREE.Vector2(0.160, 0.13),
      new THREE.Vector2(0.178, 0.27),
      new THREE.Vector2(0.205, 0.41),
      new THREE.Vector2(0.184, 0.48),
      new THREE.Vector2(0.086, 0.51)
    ];
    const torsoLathe = new THREE.LatheGeometry(lathePts, 28, Math.PI, Math.PI * 2);
    torsoLathe.computeVertexNormals();

    const fingerLengths = [0.032, 0.036, 0.033, 0.026];

    cachedCharGeos = {
      shadowDisc,
      hipBowl: new THREE.CapsuleGeometry(0.144, 0.08, 12, 20),
      beltBand: new THREE.CylinderGeometry(0.168, 0.168, 0.042, 24),
      torsoLathe,
      shoulderBridge: new THREE.CapsuleGeometry(0.106, 0.27, 12, 18),
      collarStand: new THREE.CylinderGeometry(0.084, 0.094, 0.048, 20, 1, true),
      lapel: new THREE.BoxGeometry(0.056, 0.036, 0.068),
      peplumFlare: new THREE.CylinderGeometry(0.160, 0.238, 0.19, 24),
      midiSkirt: new THREE.CylinderGeometry(0.170, 0.202, 0.44, 24),
      smockTunic: new THREE.CylinderGeometry(0.176, 0.246, 0.36, 24),
      neckCylinder: new THREE.CylinderGeometry(0.057, 0.067, 0.12, 16),
      cranium: new THREE.SphereGeometry(0.138, 26, 24),
      jawChin: new THREE.CapsuleGeometry(0.086, 0.054, 12, 18),
      facePatch: new THREE.SphereGeometry(
        0.1386,
        24,
        20,
        Math.PI * 0.22,
        Math.PI * 0.56,
        Math.PI * 0.24,
        Math.PI * 0.54
      ),
      noseBridge: new THREE.CapsuleGeometry(0.014, 0.028, 8, 12),
      noseTip: new THREE.SphereGeometry(0.018, 12, 10),
      nostrilWing: new THREE.SphereGeometry(0.011, 8, 8),
      ear: new THREE.SphereGeometry(0.031, 12, 12),
      shoulderCap: new THREE.SphereGeometry(0.068, 16, 14),
      sleeve: new THREE.CylinderGeometry(0.068, 0.059, 0.19, 18),
      cuffBand: new THREE.CylinderGeometry(0.061, 0.061, 0.026, 18),
      upperArm: new THREE.CapsuleGeometry(0.045, 0.088, 10, 14),
      elbowCap: new THREE.SphereGeometry(0.044, 12, 10),
      forearm: new THREE.CylinderGeometry(0.044, 0.032, 0.205, 16),
      watchBand: new THREE.CylinderGeometry(0.036, 0.036, 0.018, 16),
      watchDial: new THREE.CylinderGeometry(0.016, 0.016, 0.010, 12),
      wristJoint: new THREE.SphereGeometry(0.031, 10, 10),
      palm: new THREE.CapsuleGeometry(0.022, 0.036, 8, 12),
      fingers: fingerLengths.map((len) => new THREE.CapsuleGeometry(0.0075, len, 6, 8)),
      thumb: new THREE.CapsuleGeometry(0.010, 0.025, 6, 8),
      hipCap: new THREE.SphereGeometry(0.078, 14, 12),
      thigh: new THREE.CylinderGeometry(0.078, 0.064, 0.38, 18),
      kneeCap: new THREE.SphereGeometry(0.062, 14, 12),
      calf: new THREE.CylinderGeometry(0.062, 0.048, 0.35, 18),
      ankleCuff: new THREE.CylinderGeometry(0.052, 0.051, 0.034, 16),
      shoeSole: new THREE.BoxGeometry(0.104, 0.026, 0.236),
      toeCap: new THREE.CylinderGeometry(0.052, 0.052, 0.026, 16),
      shoeUpper: new THREE.CapsuleGeometry(0.047, 0.118, 10, 16),
      tongue: new THREE.BoxGeometry(0.056, 0.034, 0.052),
      heelAccent: new THREE.CylinderGeometry(0.046, 0.049, 0.038, 14)
    };
  }
  return cachedCharGeos;
}

export function buildStylizedGhanaianCharacter(archetypeId: CharacterArchetypeId): CharacterRig {
  const spec = getArchetypeSpec(archetypeId);
  const geos = getSharedCharacterGeometries();

  const root = new THREE.Group();
  root.name = archetypeId;
  root.scale.setScalar(spec.heightScale);

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
    roughness: 0.55
  });

  const trouserMat = sharedArtLibrary.getMaterial(`trouser_${spec.trouserHex}`, {
    color: spec.trouserHex,
    roughness: 0.70
  });

  const shoeUpperMat = sharedArtLibrary.getMaterial(`shoe_upper_${spec.shoeUpperHex}`, {
    color: spec.shoeUpperHex,
    roughness: 0.42
  });

  const shoeSoleMat = sharedArtLibrary.getMaterial(`shoe_sole_${spec.shoeSoleHex}`, {
    color: spec.shoeSoleHex,
    roughness: 0.55
  });

  // Ground contact ambient shadow disc reusing shared geometry & material
  const shadowMat = sharedArtLibrary.getBasicMaterial('char_contact_shadow', {
    color: 0x0f172a,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
  const shadowDisc = new THREE.Mesh(geos.shadowDisc, shadowMat);
  shadowDisc.position.y = 0.006;
  root.add(shadowDisc);

  // ---------------------------------------------------------------------------
  // 1. PELVIS & LOWER HIP BOWL (Seamless rounded transition to legs & torso)
  // ---------------------------------------------------------------------------
  const pelvis = new THREE.Group();
  pelvis.name = 'Pelvis';
  pelvis.position.set(0, 0.86, 0);
  root.add(pelvis);

  const hipBowl = new THREE.Mesh(geos.hipBowl, trouserMat);
  hipBowl.scale.set(1.08, 0.9, 0.78);
  hipBowl.castShadow = true;
  hipBowl.receiveShadow = true;
  pelvis.add(hipBowl);

  const beltBand = new THREE.Mesh(
    geos.beltBand,
    sharedArtLibrary.getMaterial('belt_leather', { color: 0x1c1917, roughness: 0.42 })
  );
  beltBand.position.set(0, 0.035, 0);
  beltBand.scale.set(1.05, 1.0, 0.77);
  pelvis.add(beltBand);

  // ---------------------------------------------------------------------------
  // 2. LATHE-SCULPTED TORSO & GARMENT SILHOUETTE
  // ---------------------------------------------------------------------------
  const torso = new THREE.Group();
  torso.name = 'Torso';
  torso.position.set(0, 0.04, 0);
  pelvis.add(torso);

  const chestMesh = new THREE.Mesh(geos.torsoLathe, shirtMat);
  chestMesh.scale.set(1.06, 1.0, 0.76);
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  torso.add(chestMesh);

  const shoulderBridge = new THREE.Mesh(geos.shoulderBridge, shirtMat);
  shoulderBridge.rotation.z = Math.PI / 2;
  shoulderBridge.position.set(0, 0.43, 0);
  shoulderBridge.scale.set(1, 1, 0.82);
  shoulderBridge.castShadow = true;
  torso.add(shoulderBridge);

  const collarStand = new THREE.Mesh(geos.collarStand, collarMat);
  collarStand.position.set(0, 0.495, 0.005);
  collarStand.scale.set(0.96, 1, 0.92);
  torso.add(collarStand);

  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(geos.lapel, collarMat);
    lapel.position.set(side * 0.048, 0.478, 0.068);
    lapel.rotation.set(0.32, side * 0.42, -side * 0.28);
    torso.add(lapel);
  }

  if (spec.garmentCut === 'peplum_skirt') {
    const peplumFlare = new THREE.Mesh(geos.peplumFlare, shirtMat);
    peplumFlare.position.y = 0.02;
    peplumFlare.scale.set(1.05, 1, 0.82);
    peplumFlare.castShadow = true;
    torso.add(peplumFlare);

    const midiSkirt = new THREE.Mesh(geos.midiSkirt, trouserMat);
    midiSkirt.position.y = -0.19;
    midiSkirt.scale.set(1.04, 1, 0.84);
    midiSkirt.castShadow = true;
    pelvis.add(midiSkirt);
  } else if (spec.garmentCut === 'northern_smock') {
    const smockTunic = new THREE.Mesh(geos.smockTunic, shirtMat);
    smockTunic.position.y = -0.05;
    smockTunic.scale.set(1.06, 1, 0.82);
    smockTunic.castShadow = true;
    torso.add(smockTunic);
  }

  // ---------------------------------------------------------------------------
  // 3. NECK & EXPRESSIVE SCULPTED HEAD WITH FEATHERED FRONT (+Z) FACIAL MAP
  // ---------------------------------------------------------------------------
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.50, 0);
  torso.add(neck);

  const neckCylinder = new THREE.Mesh(geos.neckCylinder, skinMat);
  neckCylinder.position.y = 0.04;
  neckCylinder.castShadow = true;
  neck.add(neckCylinder);

  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 0.10, 0);
  neck.add(head);

  const cranium = new THREE.Mesh(geos.cranium, skinMat);
  cranium.position.set(0, 0.112, 0);
  cranium.scale.set(0.94, 1.08, 0.98);
  cranium.castShadow = true;
  head.add(cranium);

  const jawChin = new THREE.Mesh(geos.jawChin, skinMat);
  jawChin.position.set(0, 0.066, 0.018);
  jawChin.scale.set(0.94, 1.0, 0.88);
  jawChin.castShadow = true;
  head.add(jawChin);

  const faceTex = sharedArtLibrary.getCharacterFaceTexture(
    archetypeId,
    spec.skinCss,
    spec.lipCss,
    spec.garmentCut === 'peplum_skirt'
  );
  const faceMat = sharedArtLibrary.getMaterial(`face_mat_${archetypeId}`, {
    map: faceTex,
    transparent: true,
    depthWrite: false,
    roughness: CHARACTER_STYLE_STANDARD.skinRoughness,
    metalness: CHARACTER_STYLE_STANDARD.skinMetalness,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  const facePatch = new THREE.Mesh(geos.facePatch, faceMat);
  facePatch.position.set(0, 0.112, 0.0005);
  facePatch.scale.set(0.94, 1.08, 0.98);
  head.add(facePatch);

  // 3D Sculpted Nose Bridge, Tip & Nostril Wings
  const noseBridge = new THREE.Mesh(geos.noseBridge, skinMat);
  noseBridge.position.set(0, 0.102, 0.134);
  noseBridge.rotation.x = -0.24;
  head.add(noseBridge);

  const noseTip = new THREE.Mesh(geos.noseTip, skinMat);
  noseTip.position.set(0, 0.088, 0.142);
  noseTip.scale.set(1.18, 0.85, 0.95);
  head.add(noseTip);

  for (const side of [-1, 1]) {
    const nostrilWing = new THREE.Mesh(geos.nostrilWing, skinMat);
    nostrilWing.position.set(side * 0.014, 0.085, 0.134);
    head.add(nostrilWing);
  }

  // 3D Sculpted Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(geos.ear, skinMat);
    ear.position.set(side * 0.128, 0.104, -0.004);
    ear.rotation.y = -side * 0.18;
    ear.scale.set(0.42, 0.88, 0.65);
    head.add(ear);
  }

  // Hair & Cultural Accessories
  buildHairAndAccessories(head, spec, hairMat);

  // ---------------------------------------------------------------------------
  // 4. SEAMLESS ARTICULATED ARMS (Shoulder -> Elbow -> Hand)
  // ---------------------------------------------------------------------------
  const {
    shoulder: leftShoulder,
    elbow: leftElbow,
    hand: leftHand
  } = buildArticulatedArm(
    -1,
    geos,
    skinMat,
    shirtMat,
    collarMat,
    Boolean(spec.hasWristwatch)
  );
  const {
    shoulder: rightShoulder,
    elbow: rightElbow,
    hand: rightHand
  } = buildArticulatedArm(
    1,
    geos,
    skinMat,
    shirtMat,
    collarMat,
    false
  );
  torso.add(leftShoulder, rightShoulder);

  // ---------------------------------------------------------------------------
  // 5. SEAMLESS ARTICULATED LEGS (Hip -> Knee -> Foot)
  // ---------------------------------------------------------------------------
  const {
    hip: leftHip,
    knee: leftKnee,
    foot: leftFoot
  } = buildArticulatedLeg(
    -1,
    geos,
    skinMat,
    trouserMat,
    shoeUpperMat,
    shoeSoleMat,
    collarMat,
    spec.garmentCut === 'peplum_skirt'
  );
  const {
    hip: rightHip,
    knee: rightKnee,
    foot: rightFoot
  } = buildArticulatedLeg(
    1,
    geos,
    skinMat,
    trouserMat,
    shoeUpperMat,
    shoeSoleMat,
    collarMat,
    spec.garmentCut === 'peplum_skirt'
  );
  pelvis.add(leftHip, rightHip);

  // ---------------------------------------------------------------------------
  // 6. FULL-BODY BIOMECHANICAL ANIMATION CONTROLLER
  // ---------------------------------------------------------------------------
  let animClock = 0;
  let idleClock = 0;
  let walkBlend = 0;
  let sprintBlend = 0;

  const updateAnimation = (
    dt: number,
    isMoving: boolean,
    isSprinting: boolean,
    phaseOffset = 0,
    turnRate = 0,
    moveSpeedRatio = 1
  ): void => {
    const smoothRate = 1 - Math.exp(-dt * 12);
    const targetWalk = isMoving ? THREE.MathUtils.clamp(moveSpeedRatio, 0.25, 1.0) : 0;
    const targetSprint = isMoving && isSprinting ? 1 : 0;

    walkBlend = THREE.MathUtils.lerp(walkBlend, targetWalk, smoothRate);
    sprintBlend = THREE.MathUtils.lerp(sprintBlend, targetSprint, smoothRate);

    const cadence = THREE.MathUtils.lerp(7.8, 11.4, sprintBlend);
    if (walkBlend > 0.01) {
      animClock += dt * cadence * Math.max(0.55, walkBlend);
    }
    idleClock += dt * 1.9;

    const phase = animClock + phaseOffset;
    const sinP = Math.sin(phase);
    const cosP = Math.cos(phase);

    const idlePhase = idleClock + phaseOffset;
    const breath = Math.sin(idlePhase) * 0.006;
    const gentleLook = Math.sin(idlePhase * 0.5) * 0.06 * (1 - walkBlend);

    // A. LEGS, KNEES & ANKLE PITCH
    const legAmp = THREE.MathUtils.lerp(0.42, 0.68, sprintBlend) * walkBlend;
    leftHip.rotation.x = -sinP * legAmp;
    rightHip.rotation.x = sinP * legAmp;

    const maxKneeBend = THREE.MathUtils.lerp(0.56, 1.05, sprintBlend) * walkBlend;
    const leftSwingLift = Math.max(0, cosP);
    const rightSwingLift = Math.max(0, -cosP);
    const stanceCushion = 0.08 * walkBlend;

    leftKnee.rotation.x = leftSwingLift * maxKneeBend + stanceCushion;
    rightKnee.rotation.x = rightSwingLift * maxKneeBend + stanceCushion;

    leftFoot.rotation.x = (-leftSwingLift * 0.18 + Math.max(0, sinP) * 0.12) * walkBlend;
    rightFoot.rotation.x = (-rightSwingLift * 0.18 + Math.max(0, -sinP) * 0.12) * walkBlend;

    // B. SHOULDERS, ELBOWS & HANDS (Contralateral Swing & Forward Elbow Flexion)
    const armSwingAmp = THREE.MathUtils.lerp(0.32, 0.56, sprintBlend) * walkBlend;
    const shoulderPitchBias = THREE.MathUtils.lerp(0.03, 0.14, sprintBlend) * walkBlend;

    leftShoulder.rotation.x = sinP * armSwingAmp + shoulderPitchBias;
    rightShoulder.rotation.x = -sinP * armSwingAmp + shoulderPitchBias;

    const baseOutwardAbduction = THREE.MathUtils.lerp(0.09, 0.14, sprintBlend);
    leftShoulder.rotation.z = -baseOutwardAbduction - Math.max(0, -sinP) * 0.03 * walkBlend;
    rightShoulder.rotation.z = baseOutwardAbduction + Math.max(0, sinP) * 0.03 * walkBlend;

    const crossBodyYaw = THREE.MathUtils.lerp(0.04, 0.15, sprintBlend) * walkBlend;
    leftShoulder.rotation.y = Math.max(0, -sinP) * crossBodyYaw;
    rightShoulder.rotation.y = -Math.max(0, sinP) * crossBodyYaw;

    // Forward elbow bend (strictly negative rx < 0 so forearms always bend forward along +Z)
    const idleElbowBend = -0.16;
    const walkBaseElbow = -0.34;
    const sprintBaseElbow = -1.12;
    const baseElbow = THREE.MathUtils.lerp(
      idleElbowBend,
      THREE.MathUtils.lerp(walkBaseElbow, sprintBaseElbow, sprintBlend),
      walkBlend
    );

    const dynamicElbowPump = THREE.MathUtils.lerp(0.18, 0.24, sprintBlend) * walkBlend;
    leftElbow.rotation.x = THREE.MathUtils.clamp(
      baseElbow - (-sinP) * dynamicElbowPump,
      -1.42,
      -0.10
    );
    rightElbow.rotation.x = THREE.MathUtils.clamp(
      baseElbow - sinP * dynamicElbowPump,
      -1.42,
      -0.10
    );

    const inwardForearmZ = THREE.MathUtils.lerp(0.05, 0.15, sprintBlend);
    leftElbow.rotation.z = inwardForearmZ;
    rightElbow.rotation.z = -inwardForearmZ;

    const wristCurlZ = THREE.MathUtils.lerp(0.08, 0.18, sprintBlend);
    leftHand.rotation.z = wristCurlZ;
    rightHand.rotation.z = -wristCurlZ;
    leftHand.rotation.x = THREE.MathUtils.lerp(-0.04, -0.12, sprintBlend);
    rightHand.rotation.x = THREE.MathUtils.lerp(-0.04, -0.12, sprintBlend);

    // C. SPINE, PELVIS & HEAD (Stride Bounce + Turn Banking + Look-Into-Turn)
    const clampedTurn = THREE.MathUtils.clamp(turnRate, -1, 1);

    const strideBounce =
      Math.abs(sinP) * THREE.MathUtils.lerp(0.022, 0.045, sprintBlend) * walkBlend;
    pelvis.position.y = 0.86 + strideBounce;

    pelvis.rotation.z =
      sinP * 0.025 * walkBlend - clampedTurn * THREE.MathUtils.lerp(0.06, 0.13, sprintBlend);
    pelvis.rotation.y = sinP * 0.04 * walkBlend;

    const targetTorsoLeanX = THREE.MathUtils.lerp(0.04, 0.14, sprintBlend) * walkBlend;
    torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, targetTorsoLeanX, smoothRate);
    torso.rotation.y =
      -sinP * THREE.MathUtils.lerp(0.07, 0.12, sprintBlend) * walkBlend +
      clampedTurn * 0.10 +
      breath * (1 - walkBlend);
    torso.rotation.z = -clampedTurn * THREE.MathUtils.lerp(0.05, 0.10, sprintBlend);
    torso.position.y = 0.04 + breath * (1 - walkBlend);

    const targetHeadYaw =
      sinP * 0.04 * walkBlend + clampedTurn * 0.24 + gentleLook;
    const targetHeadRoll = -clampedTurn * 0.05;
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetHeadYaw, smoothRate);
    head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, targetHeadRoll, smoothRate);
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
    const crownBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.142, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
      hairMat
    );
    crownBase.position.set(0, 0.122, -0.010);
    crownBase.rotation.x = -0.14;
    crownBase.scale.set(0.95, 1.05, 1.0);
    crownBase.castShadow = true;
    head.add(crownBase);

    const crownTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.112, 0.124, 0.058, 22),
      hairMat
    );
    crownTop.position.set(0, 0.228, 0.002);
    crownTop.rotation.x = 0.04;
    crownTop.scale.set(0.96, 1.0, 1.04);
    crownTop.castShadow = true;
    head.add(crownTop);

    const crownDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.112, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      hairMat
    );
    crownDome.position.set(0, 0.252, 0.002);
    crownDome.scale.set(0.96, 0.32, 1.04);
    head.add(crownDome);
  } else if (spec.hairStyle === 'sponge_twists') {
    const crownBase = new THREE.Mesh(
      new THREE.SphereGeometry(0.143, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.54),
      hairMat
    );
    crownBase.position.set(0, 0.122, -0.010);
    crownBase.rotation.x = -0.12;
    head.add(crownBase);

    const curlGeo = new THREE.SphereGeometry(0.035, 10, 10);
    const curlOffsets: Array<[number, number, number]> = [
      [0, 0.246, 0.032],
      [-0.046, 0.240, 0.022],
      [0.046, 0.240, 0.022],
      [-0.062, 0.228, -0.015],
      [0.062, 0.228, -0.015],
      [-0.034, 0.244, -0.035],
      [0.034, 0.244, -0.035],
      [0, 0.252, -0.012]
    ];
    for (const [cx, cy, cz] of curlOffsets) {
      const curl = new THREE.Mesh(curlGeo, hairMat);
      curl.position.set(cx, cy, cz);
      curl.castShadow = true;
      head.add(curl);
    }
  } else if (spec.hairStyle === 'braided_bun') {
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.143, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMat
    );
    hairCap.position.set(0, 0.122, -0.012);
    hairCap.rotation.x = -0.16;
    head.add(hairCap);

    const highBun = new THREE.Mesh(new THREE.SphereGeometry(0.084, 18, 16), hairMat);
    highBun.position.set(0, 0.265, -0.038);
    highBun.scale.set(1.06, 0.92, 1.06);
    highBun.castShadow = true;
    head.add(highBun);

    const bunWrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.068, 0.015, 10, 22),
      sharedArtLibrary.getMaterial('gold_accessory', {
        color: 0xfacc15,
        roughness: 0.3,
        metalness: 0.75
      })
    );
    bunWrap.rotation.x = Math.PI / 2 - 0.22;
    bunWrap.position.set(0, 0.232, -0.032);
    head.add(bunWrap);
  } else if (spec.hairStyle === 'kufi_elder') {
    const kufiMat = sharedArtLibrary.getMaterial('kufi_gold_cap', {
      color: 0xd97706,
      roughness: 0.58
    });
    const kufiBandMat = sharedArtLibrary.getMaterial('kufi_band', {
      color: 0x0f172a,
      roughness: 0.68
    });

    const templeHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.140, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
      hairMat
    );
    templeHair.position.set(0, 0.118, -0.010);
    templeHair.rotation.x = -0.15;
    head.add(templeHair);

    const kufiCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.122, 0.135, 0.092, 24),
      kufiMat
    );
    kufiCap.position.set(0, 0.216, -0.004);
    kufiCap.scale.set(0.95, 1, 0.98);
    kufiCap.castShadow = true;
    head.add(kufiCap);

    const kufiCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.122, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      kufiMat
    );
    kufiCrown.position.set(0, 0.260, -0.004);
    kufiCrown.scale.set(0.95, 0.24, 0.98);
    head.add(kufiCrown);

    const kufiTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.136, 0.137, 0.026, 24),
      kufiBandMat
    );
    kufiTrim.position.set(0, 0.178, -0.004);
    kufiTrim.scale.set(0.95, 1, 0.98);
    head.add(kufiTrim);
  }

  if (spec.hasEarrings) {
    const goldMat = sharedArtLibrary.getMaterial('gold_accessory', {
      color: 0xfacc15,
      roughness: 0.28,
      metalness: 0.78
    });
    const hoopGeo = new THREE.TorusGeometry(0.022, 0.0045, 8, 18);
    for (const side of [-1, 1]) {
      const hoop = new THREE.Mesh(hoopGeo, goldMat);
      hoop.rotation.y = Math.PI / 2;
      hoop.position.set(side * 0.134, 0.072, 0.0);
      head.add(hoop);
    }
  }

  if (spec.hasBeard) {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.092, 18, 14), hairMat);
    beard.position.set(0, 0.044, 0.036);
    beard.scale.set(0.92, 0.64, 0.88);
    head.add(beard);
  }
}

function buildArticulatedArm(
  side: -1 | 1,
  geos: SharedCharacterGeometries,
  skinMat: THREE.Material,
  shirtMat: THREE.Material,
  cuffMat: THREE.Material,
  hasWristwatch: boolean
): { shoulder: THREE.Group; elbow: THREE.Group; hand: THREE.Group } {
  const shoulder = new THREE.Group();
  shoulder.name = side === -1 ? 'LeftShoulder' : 'RightShoulder';
  shoulder.position.set(side * 0.236, 0.42, 0);

  const shoulderCap = new THREE.Mesh(geos.shoulderCap, shirtMat);
  shoulder.add(shoulderCap);

  const sleeve = new THREE.Mesh(geos.sleeve, shirtMat);
  sleeve.position.y = -0.092;
  sleeve.castShadow = true;
  shoulder.add(sleeve);

  const cuffBand = new THREE.Mesh(geos.cuffBand, cuffMat);
  cuffBand.position.y = -0.182;
  shoulder.add(cuffBand);

  const upperArm = new THREE.Mesh(geos.upperArm, skinMat);
  upperArm.position.y = -0.208;
  upperArm.castShadow = true;
  shoulder.add(upperArm);

  const elbow = new THREE.Group();
  elbow.name = side === -1 ? 'LeftElbow' : 'RightElbow';
  elbow.position.set(0, -0.265, 0);
  shoulder.add(elbow);

  const elbowCap = new THREE.Mesh(geos.elbowCap, skinMat);
  elbow.add(elbowCap);

  const forearm = new THREE.Mesh(geos.forearm, skinMat);
  forearm.position.y = -0.102;
  forearm.castShadow = true;
  elbow.add(forearm);

  if (hasWristwatch) {
    const goldMat = sharedArtLibrary.getMaterial('gold_accessory', {
      color: 0xfacc15,
      roughness: 0.28,
      metalness: 0.82
    });
    const watchBand = new THREE.Mesh(geos.watchBand, goldMat);
    watchBand.position.y = -0.184;
    const watchDial = new THREE.Mesh(geos.watchDial, goldMat);
    watchDial.rotation.z = Math.PI / 2;
    watchDial.position.set(side * 0.035, -0.184, 0.006);
    elbow.add(watchBand, watchDial);
  }

  const handGroup = new THREE.Group();
  handGroup.name = side === -1 ? 'LeftHand' : 'RightHand';
  handGroup.position.set(0, -0.212, 0);
  elbow.add(handGroup);

  const wristJoint = new THREE.Mesh(geos.wristJoint, skinMat);
  handGroup.add(wristJoint);

  const palm = new THREE.Mesh(geos.palm, skinMat);
  palm.position.set(0, -0.030, 0.004);
  palm.scale.set(0.76, 1.0, 1.48);
  palm.castShadow = true;
  handGroup.add(palm);

  const fingerOffsetsZ = [0.022, 0.008, -0.006, -0.019];
  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(geos.fingers[f], skinMat);
    finger.position.set(side * -0.004, -0.068, fingerOffsetsZ[f]);
    finger.rotation.z = -side * 0.28;
    finger.rotation.x = -0.16;
    finger.castShadow = true;
    handGroup.add(finger);
  }

  const thumb = new THREE.Mesh(geos.thumb, skinMat);
  thumb.position.set(side * -0.010, -0.034, 0.034);
  thumb.rotation.x = -0.52;
  thumb.rotation.z = -side * 0.22;
  handGroup.add(thumb);

  return { shoulder, elbow, hand: handGroup };
}

function buildArticulatedLeg(
  side: -1 | 1,
  geos: SharedCharacterGeometries,
  skinMat: THREE.Material,
  trouserMat: THREE.Material,
  shoeUpperMat: THREE.Material,
  shoeSoleMat: THREE.Material,
  accentMat: THREE.Material,
  isSkirtArchetype: boolean
): { hip: THREE.Group; knee: THREE.Group; foot: THREE.Group } {
  const hip = new THREE.Group();
  hip.name = side === -1 ? 'LeftHip' : 'RightHip';
  hip.position.set(side * 0.095, -0.04, 0);

  const hipCap = new THREE.Mesh(geos.hipCap, trouserMat);
  hip.add(hipCap);

  const thigh = new THREE.Mesh(geos.thigh, trouserMat);
  thigh.position.y = -0.19;
  thigh.castShadow = true;
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.name = side === -1 ? 'LeftKnee' : 'RightKnee';
  knee.position.set(0, -0.39, 0);
  hip.add(knee);

  const kneeCap = new THREE.Mesh(
    geos.kneeCap,
    isSkirtArchetype ? skinMat : trouserMat
  );
  knee.add(kneeCap);

  const calf = new THREE.Mesh(
    geos.calf,
    isSkirtArchetype ? skinMat : trouserMat
  );
  calf.position.y = -0.175;
  calf.castShadow = true;
  knee.add(calf);

  if (!isSkirtArchetype) {
    const ankleCuff = new THREE.Mesh(geos.ankleCuff, trouserMat);
    ankleCuff.position.y = -0.335;
    knee.add(ankleCuff);
  }

  const footGroup = new THREE.Group();
  footGroup.name = side === -1 ? 'LeftFoot' : 'RightFoot';
  footGroup.position.set(0, -0.38, 0.034);
  knee.add(footGroup);

  const sole = new THREE.Mesh(geos.shoeSole, shoeSoleMat);
  sole.position.set(0, -0.037, 0.012);
  sole.castShadow = true;
  footGroup.add(sole);

  const toeCap = new THREE.Mesh(geos.toeCap, shoeSoleMat);
  toeCap.position.set(0, -0.037, 0.125);
  footGroup.add(toeCap);

  const shoeUpper = new THREE.Mesh(geos.shoeUpper, shoeUpperMat);
  shoeUpper.rotation.x = Math.PI / 2;
  shoeUpper.position.set(0, -0.002, 0.010);
  shoeUpper.scale.set(1.04, 1.0, 0.76);
  shoeUpper.castShadow = true;
  footGroup.add(shoeUpper);

  const tongue = new THREE.Mesh(geos.tongue, shoeUpperMat);
  tongue.position.set(0, 0.028, 0.015);
  tongue.rotation.x = -0.35;
  footGroup.add(tongue);

  const heelAccent = new THREE.Mesh(geos.heelAccent, accentMat);
  heelAccent.position.set(0, 0.012, -0.068);
  footGroup.add(heelAccent);

  return { hip, knee, foot: footGroup };
}

function getArchetypeSpec(id: CharacterArchetypeId): ArchetypeVisualSpec {
  switch (id) {
    case 'PLAYER_GHA_001':
      return {
        skinHex: 0x6b3e26,
        skinCss: '#6b3e26',
        lipCss: '#462415',
        hairHex: 0x141416,
        trouserHex: 0x1e293b,
        shoeUpperHex: 0xf8fafc,
        shoeSoleHex: 0xfef3c7,
        heightScale: 1.0,
        shirtTexture: sharedArtLibrary.getKenteTrimTexture(),
        collarHex: 0x059669,
        hairStyle: 'taper_fade',
        garmentCut: 'fitted_shirt',
        hasWristwatch: true
      };
    case 'NPC_MALE_001':
      return {
        skinHex: 0x5c3317,
        skinCss: '#5c3317',
        lipCss: '#3b1d0e',
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
        skinCss: '#7a482b',
        lipCss: '#881337',
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
        skinCss: '#4a2511',
        lipCss: '#32180a',
        hairHex: 0x9ca3af,
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
