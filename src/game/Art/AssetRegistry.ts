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
  skinRoughness: 0.54,
  skinMetalness: 0.04,
  hairRoughness: 0.82,
  clothRoughness: 0.68,
  textureResolutionPx: 256,
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
    locationDescription: 'Dynamic player spawn (0, 0, 5.8)',
    dimensionsMeters: [0.56, 1.74, 0.36],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  NPC_MALE_001: {
    assetId: 'NPC_MALE_001',
    category: 'character',
    name: 'Kojo — Contemporary Ghanaian Young Adult Male',
    purpose: 'Phase 2 NPC visual archetype testing young adult male proportions, fabric print, and idle rig',
    locationDescription: 'Outside ACC_SHOP_001 Provision Store (-7.4, 0, -6.4)',
    dimensionsMeters: [0.56, 1.75, 0.36],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  NPC_FEMALE_001: {
    assetId: 'NPC_FEMALE_001',
    category: 'character',
    name: 'Ama — Contemporary Ghanaian Young Adult Female',
    purpose: 'Phase 2 NPC visual archetype testing young adult female silhouette, Ankara peplum, and braided hair',
    locationDescription: 'Near ACC_RESTAURANT_001 Waakye & Jollof patio (10.3, 0, -6.5)',
    dimensionsMeters: [0.52, 1.68, 0.34],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  NPC_OLDER_001: {
    assetId: 'NPC_OLDER_001',
    category: 'character',
    name: 'Uncle Mensah — Older Ghanaian Adult',
    purpose: 'Phase 2 NPC visual archetype testing older adult proportions, woven smock tunic, kufi cap, and beard',
    locationDescription: 'Near ACC_PROP_001 Trotro Stop & Compound walkway (6.8, 0, 4.9)',
    dimensionsMeters: [0.58, 1.71, 0.38],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ACC_HOUSE_001: {
    assetId: 'ACC_HOUSE_001',
    category: 'building',
    name: 'Contemporary Accra Gated Compound House',
    purpose: 'Player residence featuring breeze-block walls, security gate, arched veranda, louver windows, and Polytank',
    locationDescription: 'South-West residential plot (-10.5, 0, 12.2)',
    dimensionsMeters: [9.6, 4.5, 8.4],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ACC_SHOP_001: {
    assetId: 'ACC_SHOP_001',
    category: 'building',
    name: 'Adabraka Blue Provision Store & MoMo Kiosk',
    purpose: 'Neighborhood retail kiosk with corrugated overhang, painted signboard, security grille, and stocked shelves',
    locationDescription: 'North-West commercial plot (-9.5, 0, -10.4)',
    dimensionsMeters: [6.2, 3.8, 5.0],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ACC_RESTAURANT_001: {
    assetId: 'ACC_RESTAURANT_001',
    category: 'building',
    name: 'Sister Akosua Waakye & Jollof Joint',
    purpose: 'Roadside Ghanaian food vendor with wooden sieve showcase, aluminum cauldrons, coal pot, and shaded patio',
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
    purpose: 'Iconic white-and-blue commercial commuter van parked at the South-East trotro layby',
    locationDescription: 'South-East road layby (13.4, 0, 2.3)',
    dimensionsMeters: [4.6, 2.25, 1.95],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ENV_TREE_001: {
    assetId: 'ENV_TREE_001',
    category: 'environment',
    name: 'Accra Neem & Tropical Mango Street Tree',
    purpose: 'Multi-cluster organic shade foliage along pedestrian walkways',
    locationDescription: 'Avenue sidewalks',
    dimensionsMeters: [3.2, 4.4, 3.2],
    originConvention: 'bottom-center',
    hasCollision: true
  },
  ENV_POLE_001: {
    assetId: 'ENV_POLE_001',
    category: 'environment',
    name: 'ECG Precast Concrete Utility & Streetlight Pole (ACC_PROP_002)',
    purpose: 'Roadside electrical distribution pole with cross-arm insulators, overhead lines, and cobra-head lamp',
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

/**
 * Shared Procedural Texture & Material Cache
 * Generates crisp 256px canvas textures once at startup and caches them.
 */
class SharedArtLibrary {
  private textures: Map<string, THREE.CanvasTexture> = new Map();
  private materials: Map<string, THREE.MeshStandardMaterial> = new Map();

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

  public getKenteTrimTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('kente_trim', 256, 256, (ctx) => {
      // Rich amber-gold woven base with emerald, crimson, and black geometric Kente bands
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, 256, 256);

      // Subtle vertical weave lines
      ctx.fillStyle = 'rgba(180, 83, 9, 0.18)';
      for (let x = 0; x < 256; x += 4) {
        ctx.fillRect(x, 0, 2, 256);
      }

      // Woven Kente geometric border strip near hem and chest
      const drawKenteBand = (y: number, h: number) => {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, y, 256, h);
        const step = 32;
        for (let x = 0; x < 256; x += step) {
          ctx.fillStyle = (x / step) % 2 === 0 ? '#059669' : '#dc2626';
          ctx.fillRect(x + 3, y + 3, step - 6, h - 6);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(x + 10, y + 6, step - 20, h - 12);
        }
      };

      drawKenteBand(18, 26);
      drawKenteBand(210, 28);
    });
  }

  public getAnkaraPatternTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('ankara_peplum', 256, 256, (ctx) => {
      ctx.fillStyle = '#047857';
      ctx.fillRect(0, 0, 256, 256);

      const cell = 64;
      for (let y = 0; y < 256; y += cell) {
        for (let x = 0; x < 256; x += cell) {
          const cx = x + cell / 2;
          const cy = y + cell / 2;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(cx, cy, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }

  public getTerracottaShirtTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('terracotta_shirt', 256, 256, (ctx) => {
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 3;
      for (let x = 16; x < 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 216, 256, 18);
    });
  }

  public getNorthernSmockTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('northern_smock', 256, 256, (ctx) => {
      // Hand-loomed indigo/slate cotton strip-weave (Fugu / Batakari texture)
      const stripW = 16;
      for (let x = 0; x < 256; x += stripW) {
        const idx = x / stripW;
        ctx.fillStyle = idx % 3 === 0 ? '#1e293b' : idx % 3 === 1 ? '#f8fafc' : '#0284c7';
        ctx.fillRect(x, 0, stripW, 256);
      }
      // Embroidered neckline plaque
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(88, 12, 80, 76);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(98, 22, 60, 56);
    });
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
      ctx.font = '900 40px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 256, 62);

      ctx.fillStyle = borderColor;
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
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
