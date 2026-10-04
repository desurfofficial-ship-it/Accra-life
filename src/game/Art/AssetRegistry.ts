import * as THREE from 'three';

export interface CharacterStyleStandard {
  standardHeightMeters: number;
  headToBodyRatio: number;
  eyeHeightMeters: number;
  eyeSpacingMeters: number;
  handDimensionsMeters: [number, number, number];
  footDimensionsMeters: [number, number, number];
  skinRoughness: number;
  skinMetalness: number;
  hairRoughness: number;
  clothRoughness: number;
  textureResolutionPx: number;
  rigJointNames: string[];
}

export const CHARACTER_STYLE_STANDARD: CharacterStyleStandard = {
  standardHeightMeters: 1.74,
  headToBodyRatio: 1 / 6.2,
  eyeHeightMeters: 1.53,
  eyeSpacingMeters: 0.104,
  handDimensionsMeters: [0.09, 0.11, 0.05],
  footDimensionsMeters: [0.11, 0.08, 0.24],
  skinRoughness: 0.52,
  skinMetalness: 0.04,
  hairRoughness: 0.80,
  clothRoughness: 0.65,
  textureResolutionPx: 512,
  rigJointNames: [
    'Root',
    'Pelvis',
    'Torso',
    'Neck',
    'Head',
    'LeftShoulder',
    'LeftElbow',
    'LeftHand',
    'RightShoulder',
    'RightElbow',
    'RightHand',
    'LeftHip',
    'LeftKnee',
    'LeftFoot',
    'RightHip',
    'RightKnee',
    'RightFoot'
  ]
};

export interface RegisteredAssetMetadata {
  assetId: string;
  category: 'character' | 'building' | 'vehicle' | 'prop' | 'environment';
  name: string;
  purpose: string;
  locationDescription: string;
  dimensionsMeters: [number, number, number];
  originConvention: 'bottom-center';
  hasCollision: boolean;
}

export const PHASE2_ASSET_REGISTRY: Record<string, RegisteredAssetMetadata> = {
  PLAYER_GHA_001: {
    assetId: 'PLAYER_GHA_001',
    category: 'character',
    name: 'Protagonist — Kwame (Contemporary Accra Young Adult)',
    purpose: 'Primary playable third-person character establishing the CHALÉ LIFE character standard',
    locationDescription: 'Dynamic player spawn (0, 0.08, 5.8)',
    dimensionsMeters: [0.56, 1.74, 0.36],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  NPC_MALE_001: {
    assetId: 'NPC_MALE_001',
    category: 'character',
    name: 'Kojo — Contemporary Ghanaian Young Adult Male',
    purpose: 'Phase 2 NPC visual archetype testing young adult male proportions, fabric print, and idle rig',
    locationDescription: 'Outside ACC_SHOP_001 Provision Store (-6.1, 0.08, -6.2)',
    dimensionsMeters: [0.56, 1.75, 0.36],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  NPC_FEMALE_001: {
    assetId: 'NPC_FEMALE_001',
    category: 'character',
    name: 'Ama — Contemporary Ghanaian Young Adult Female',
    purpose: 'Phase 2 NPC visual archetype testing young adult female silhouette, Ankara peplum, and braided hair',
    locationDescription: 'Near ACC_RESTAURANT_001 Waakye & Jollof patio (11.4, 0.08, -6.2)',
    dimensionsMeters: [0.52, 1.68, 0.34],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  NPC_OLDER_001: {
    assetId: 'NPC_OLDER_001',
    category: 'character',
    name: 'Uncle Mensah — Older Ghanaian Adult',
    purpose: 'Phase 2 NPC visual archetype testing older adult proportions, woven smock tunic, kufi cap, and beard',
    locationDescription: 'Near ACC_PROP_001 Trotro Stop & Compound walkway (5.4, 0.08, 5.4)',
    dimensionsMeters: [0.58, 1.71, 0.38],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ACC_HOUSE_001: {
    assetId: 'ACC_HOUSE_001',
    category: 'building',
    name: 'Contemporary Accra Gated Compound House',
    purpose: 'Player residence featuring breeze-block walls, double iron gates, pillared veranda, hipped roof, louver windows, and steel-truss Polytank tower',
    locationDescription: 'South-West residential plot (-10.5, 0, 12.2)',
    dimensionsMeters: [9.6, 4.6, 8.4],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ACC_SHOP_001: {
    assetId: 'ACC_SHOP_001',
    category: 'building',
    name: 'Adabraka Blue Provision Store & MoMo Kiosk',
    purpose: 'Neighborhood retail kiosk with corrugated overhang, open shutters, stocked interior shelves, and MoMo agent counter',
    locationDescription: 'North-West commercial plot (-9.5, 0, -10.4)',
    dimensionsMeters: [6.2, 3.8, 5.0],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ACC_RESTAURANT_001: {
    assetId: 'ACC_RESTAURANT_001',
    category: 'building',
    name: 'Sister Akosua Waakye & Jollof Joint',
    purpose: 'Roadside Ghanaian food vendor with framed wooden sieve showcase, aluminum cauldrons on coal pot, and shaded patio table with stools',
    locationDescription: 'North-East commercial plot (8.5, 0, -10.4)',
    dimensionsMeters: [7.2, 3.6, 5.8],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ACC_PROP_001: {
    assetId: 'ACC_PROP_001',
    category: 'prop',
    name: 'Accra Trotro Commuter Shelter & Route Board',
    purpose: 'Covered roadside transit shelter with passenger bench and Osu/Circle route signboard',
    locationDescription: 'South-East roadside curb (9.0, 0, 6.2)',
    dimensionsMeters: [4.8, 2.8, 2.5],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ACC_TROTRO_001: {
    assetId: 'ACC_TROTRO_001',
    category: 'vehicle',
    name: 'Stationary Accra Trotro Minibus',
    purpose: 'Contoured white-and-cobalt commercial commuter van with sloped windshield, route placard, roof rack, and sliding door parked at the layby',
    locationDescription: 'South-East road layby (14.6, 0.02, 2.25)',
    dimensionsMeters: [4.6, 2.28, 1.95],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ENV_TREE_001: {
    assetId: 'ENV_TREE_001',
    category: 'environment',
    name: 'Accra Neem & Tropical Mango Street Tree',
    purpose: 'Branching trunk and multi-cluster organic shade foliage along pedestrian walkways',
    locationDescription: 'Avenue sidewalks',
    dimensionsMeters: [3.2, 4.4, 3.2],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ENV_POLE_001: {
    assetId: 'ENV_POLE_001',
    category: 'environment',
    name: 'ECG Precast Concrete Utility & Streetlight Pole (ACC_PROP_002)',
    purpose: 'Roadside electrical distribution pole with cross-arm insulators, overhead catenary lines, and cobra-head lamp',
    locationDescription: 'North and South street curbs',
    dimensionsMeters: [0.4, 5.6, 1.3],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ENV_DRAIN_001: {
    assetId: 'ENV_DRAIN_001',
    category: 'environment',
    name: 'Roadside Open Concrete Storm Gutter & Slabs (ACC_PROP_003)',
    purpose: 'Authentic Accra open storm drainage channels with reinforced concrete entrance crossover bridges',
    locationDescription: 'North and South road shoulders (Z = ±4.05)',
    dimensionsMeters: [68.0, 0.35, 0.85],
    originConvention: 'bottom-center',
    hasCollision: false
  }
};

class SharedArtLibrary {
  private textures: Map<string, THREE.CanvasTexture> = new Map();
  private materials: Map<string, THREE.MeshStandardMaterial> = new Map();
  private basicMaterials: Map<string, THREE.MeshBasicMaterial> = new Map();

  public getMaterial(
    key: string,
    options: THREE.MeshStandardMaterialParameters
  ): THREE.MeshStandardMaterial {
    let mat = this.materials.get(key);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial(options);
      this.materials.set(key, mat);
    }
    return mat;
  }

  public getBasicMaterial(
    key: string,
    options: THREE.MeshBasicMaterialParameters
  ): THREE.MeshBasicMaterial {
    let mat = this.basicMaterials.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial(options);
      this.basicMaterials.set(key, mat);
    }
    return mat;
  }

  /**
   * High-resolution stylized facial feature texture mapped onto the front (+Z) curved face shell.
   * Uses a soft radial destination-in alpha feather and exact base skin tone so the facial features
   * integrate invisibly into the 3D cranium without any sticker edge or border ring.
   */
  public getCharacterFaceTexture(
    key: string,
    skinCss: string,
    lipCss: string,
    isFemale: boolean
  ): THREE.CanvasTexture {
    return this.getOrCreateTexture(`face_${key}`, 512, 512, (ctx) => {
      ctx.clearRect(0, 0, 512, 512);

      // Base skin fill matching the 3D cranium material
      ctx.fillStyle = skinCss;
      ctx.fillRect(0, 0, 512, 512);

      // Subtle center-face warmth (fades to 0 before the outer boundary so edges match skinCss 100%)
      const cheekGrad = ctx.createRadialGradient(256, 248, 18, 256, 256, 175);
      cheekGrad.addColorStop(0, 'rgba(255, 215, 175, 0.12)');
      cheekGrad.addColorStop(1, 'rgba(255, 215, 175, 0.0)');
      ctx.fillStyle = cheekGrad;
      ctx.fillRect(0, 0, 512, 512);

      // Subtle nose bridge highlight & nostril shadow cues
      ctx.fillStyle = 'rgba(255, 235, 205, 0.13)';
      ctx.beginPath();
      ctx.roundRect(244, 205, 24, 86, 12);
      ctx.fill();

      ctx.fillStyle = 'rgba(20, 8, 4, 0.24)';
      ctx.beginPath();
      ctx.ellipse(240, 298, 9, 5, 0.25, 0, Math.PI * 2);
      ctx.ellipse(272, 298, 9, 5, -0.25, 0, Math.PI * 2);
      ctx.fill();

      // Expressive eyes centered at (176, 218) and (336, 218)
      const eyePositions = [176, 336];
      for (let i = 0; i < 2; i++) {
        const ex = eyePositions[i];
        const ey = 218;
        const side = i === 0 ? -1 : 1;

        // Upper orbital crease
        ctx.strokeStyle = 'rgba(18, 9, 5, 0.34)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(ex, ey + 4, 36, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();

        // Sculpted eyebrow with tapered arch
        ctx.fillStyle = '#141416';
        ctx.beginPath();
        ctx.moveTo(ex - 42, ey - 34 + side * 4);
        ctx.quadraticCurveTo(ex - 4 * side, ey - 54, ex + 42, ey - 32 - side * 4);
        ctx.quadraticCurveTo(ex - 4 * side, ey - 40, ex - 42, ey - 26 + side * 4);
        ctx.closePath();
        ctx.fill();

        // Eye sclera (warm ivory almond shape)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 33, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rich warm dark-brown iris with subtle lower rim warmth
        const irisGrad = ctx.createRadialGradient(ex, ey + 3, 2, ex, ey, 16);
        irisGrad.addColorStop(0, '#1c0d06');
        irisGrad.addColorStop(0.55, '#452210');
        irisGrad.addColorStop(1, '#1e0e06');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ex, ey, 15.5, 0, Math.PI * 2);
        ctx.fill();

        // Deep pupil
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(ex, ey, 8.2, 0, Math.PI * 2);
        ctx.fill();

        // Dual specular catchlights for lively expression
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 5, ey - 5.5, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + 5.5, ey + 4.5, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Crisp upper lash line
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = isFemale ? 7.5 : 5.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, ey + 3, 33, Math.PI * 1.06, Math.PI * 1.94);
        ctx.stroke();

        // Subtle lower lid definition
        ctx.strokeStyle = 'rgba(20, 10, 6, 0.30)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ex, ey - 3, 32, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
      }

      // Sculpted upper & lower lips with warm confident expression
      ctx.fillStyle = lipCss;
      ctx.beginPath();
      ctx.moveTo(212, 344);
      ctx.quadraticCurveTo(238, 330, 256, 336);
      ctx.quadraticCurveTo(274, 330, 300, 344);
      ctx.quadraticCurveTo(256, 366, 212, 344);
      ctx.closePath();
      ctx.fill();

      // Lip corner & center smile line
      ctx.strokeStyle = 'rgba(15, 8, 5, 0.62)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(210, 343);
      ctx.quadraticCurveTo(256, 352, 302, 343);
      ctx.stroke();

      // Lower lip soft sheen
      ctx.fillStyle = 'rgba(255, 225, 200, 0.16)';
      ctx.beginPath();
      ctx.ellipse(256, 353, 20, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Smooth radial alpha feather so the outer rim dissolves seamlessly into the 3D head
      ctx.globalCompositeOperation = 'destination-in';
      const featherMask = ctx.createRadialGradient(256, 256, 155, 256, 256, 244);
      featherMask.addColorStop(0, 'rgba(0, 0, 0, 1)');
      featherMask.addColorStop(0.75, 'rgba(0, 0, 0, 0.95)');
      featherMask.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = featherMask;
      ctx.fillRect(0, 0, 512, 512);
      ctx.globalCompositeOperation = 'source-over';
    });
  }

  public getKenteTrimTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('kente_trim', 512, 512, (ctx) => {
      // Rich amber-gold tailored cotton base with crisp Kente woven chest & hem bands
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, 512, 512);

      // Fine vertical fabric weave
      ctx.fillStyle = 'rgba(180, 83, 9, 0.13)';
      for (let x = 0; x < 512; x += 6) {
        ctx.fillRect(x, 0, 2, 512);
      }

      const drawKenteBand = (y: number, h: number) => {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, y, 512, h);
        const step = 48;
        for (let x = 0; x < 512; x += step) {
          ctx.fillStyle = Math.floor(x / step) % 2 === 0 ? '#059669' : '#dc2626';
          ctx.fillRect(x + 4, y + 4, step - 8, h - 8);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(x + 14, y + 10, step - 28, h - 20);
        }
      };

      drawKenteBand(46, 44);
      drawKenteBand(422, 52);

      // Center front button placket (aligned to u = 0.5 on rotated LatheGeometry)
      ctx.fillStyle = '#111827';
      ctx.fillRect(246, 0, 20, 235);
      ctx.fillStyle = '#facc15';
      for (let by = 45; by <= 205; by += 48) {
        ctx.beginPath();
        ctx.arc(256, by, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  public getAnkaraPatternTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('ankara_peplum', 512, 512, (ctx) => {
      ctx.fillStyle = '#047857';
      ctx.fillRect(0, 0, 512, 512);

      const cell = 96;
      for (let y = 0; y < 512; y += cell) {
        for (let x = 0; x < 512; x += cell) {
          const cx = x + cell / 2;
          const cy = y + cell / 2;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(cx, cy, 38, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(cx, cy, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(cx, cy, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }

  public getTerracottaShirtTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('terracotta_shirt', 512, 512, (ctx) => {
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 5;
      for (let x = 24; x < 512; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 430, 512, 36);
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 4;
      ctx.strokeRect(274, 96, 46, 52);
    });
  }

  public getNorthernSmockTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('northern_smock', 512, 512, (ctx) => {
      const stripW = 24;
      for (let x = 0; x < 512; x += stripW) {
        const idx = Math.floor(x / stripW);
        ctx.fillStyle = idx % 3 === 0 ? '#1e293b' : idx % 3 === 1 ? '#f8fafc' : '#0284c7';
        ctx.fillRect(x, 0, stripW, 512);
      }
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(190, 18, 132, 148);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(206, 34, 100, 116);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.strokeRect(216, 44, 80, 96);
    });
  }

  public getCorrugatedRoofTexture(baseHex: string, shadowHex: string): THREE.CanvasTexture {
    const tex = this.getOrCreateTexture(`roof_${baseHex}`, 256, 256, (ctx) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = shadowHex;
      for (let x = 0; x < 256; x += 16) {
        ctx.fillRect(x, 0, 6, 256);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      for (let x = 6; x < 256; x += 16) {
        ctx.fillRect(x, 0, 4, 256);
      }
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    return tex;
  }

  public getBreezeBlockWallTexture(): THREE.CanvasTexture {
    const tex = this.getOrCreateTexture('breeze_block_wall', 512, 256, (ctx) => {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = 'rgba(180, 83, 9, 0.12)';
      ctx.lineWidth = 2;
      for (let y = 96; y < 206; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, 512, 24);

      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, 28, 512, 48);
      for (let x = 16; x < 512; x += 48) {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(x + 16, 34);
        ctx.lineTo(x + 30, 52);
        ctx.lineTo(x + 16, 70);
        ctx.lineTo(x + 2, 52);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 206, 512, 50);
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  public getSidewalkPaverTexture(): THREE.CanvasTexture {
    const tex = this.getOrCreateTexture('sidewalk_pavers', 256, 256, (ctx) => {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      const step = 64;
      for (let y = 0; y < 256; y += step) {
        const offset = (y / step) % 2 === 0 ? 0 : 32;
        for (let x = -32; x < 256; x += step) {
          ctx.strokeRect(x + offset, y, step, step);
        }
      }
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 2);
    return tex;
  }

  public getLateriteEarthTexture(): THREE.CanvasTexture {
    const tex = this.getOrCreateTexture('laterite_earth', 256, 256, (ctx) => {
      ctx.fillStyle = '#d6b087';
      ctx.fillRect(0, 0, 256, 256);

      // Subtle deterministic warm laterite soil grain variations
      for (let y = 0; y < 256; y += 16) {
        for (let x = 0; x < 256; x += 16) {
          const hash = ((x * 37 + y * 73) % 29) / 29;
          ctx.fillStyle =
            hash > 0.65
              ? 'rgba(180, 118, 68, 0.14)'
              : hash < 0.35
                ? 'rgba(242, 208, 168, 0.12)'
                : 'rgba(154, 88, 42, 0.08)';
          ctx.fillRect(x, y, 14, 14);
        }
      }
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 18);
    return tex;
  }

  public getSignboardTexture(
    key: string,
    bgColor: string,
    borderColor: string,
    title: string,
    subtitle: string,
    textColor = '#0f172a'
  ): THREE.CanvasTexture {
    return this.getOrCreateTexture(`sign_${key}`, 512, 160, (ctx) => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 512, 160);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 10;
      ctx.strokeRect(8, 8, 496, 144);

      ctx.fillStyle = textColor;
      ctx.font = '900 38px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 256, 60);

      ctx.fillStyle = borderColor;
      ctx.font = '800 23px system-ui, -apple-system, sans-serif';
      ctx.fillText(subtitle, 256, 114);
    });
  }

  private getOrCreateTexture(
    key: string,
    width: number,
    height: number,
    painter: (ctx: CanvasRenderingContext2D) => void
  ): THREE.CanvasTexture {
    let tex = this.textures.get(key);
    if (!tex) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        painter(ctx);
      }
      tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      this.textures.set(key, tex);
    }
    return tex;
  }
}

export const sharedArtLibrary = new SharedArtLibrary();
