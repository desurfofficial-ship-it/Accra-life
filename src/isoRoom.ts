export type HairstyleType = 'lowcut' | 'bald' | 'curls' | 'afro' | 'locs' | 'braids' | 'classic';
export type BodyGender = 'woman' | 'man';

export interface SimLook {
  gender: BodyGender;
  hairstyle: HairstyleType;
  outfitColor: string;
  skinTone: string;
}

export interface HomeDesign {
  wallColor: string;
  floorStyle: 'checkered' | 'warm' | 'marble' | 'wood';
  ownedFurniture: string[];
  activeFurniture: string[];
  outfitColor: string;
  visits: number;
  look?: SimLook;
  housingTier?: 'nima' | 'madina' | 'east_legon';
}

export interface FurnitureItemDef {
  id: string;
  name: string;
  emoji: string;
  price: number;
  room: string;
  gx: number;
  gy: number;
  actionKey: string;
  desc: string;
}

export const WALL_SWATCHES: { id: string; name: string; base: string; shade: string; top: string }[] = [
  { id: 'gold', name: 'Accra Ochre', base: '#cfa756', shade: '#b58b3c', top: '#e8c97d' },
  { id: 'lavender', name: 'Lavender', base: '#b9a6c9', shade: '#a38eb5', top: '#d8cae6' },
  { id: 'mint', name: 'Osu Mint', base: '#9ec5b5', shade: '#85b09f', top: '#c4e3d6' },
  { id: 'terracotta', name: 'Terracotta', base: '#d49a89', shade: '#bd8170', top: '#ebd6ce' },
  { id: 'coastal', name: 'Labadi Blue', base: '#9ab7d3', shade: '#81a1c1', top: '#c6dbf0' }
];

export const FLOOR_SWATCHES: { id: 'checkered' | 'warm' | 'marble' | 'wood'; name: string; c1: string; c2: string }[] = [
  { id: 'warm', name: 'Terracotta Tile', c1: '#a6754b', c2: '#96663e' },
  { id: 'checkered', name: 'Cool Tile', c1: '#d1dce5', c2: '#c5d1db' },
  { id: 'marble', name: 'East Legon Marble', c1: '#edf2f7', c2: '#e2e8f0' },
  { id: 'wood', name: 'Teak Parquet', c1: '#c8a27a', c2: '#ba9269' }
];

export const FURNITURE_CATALOG: FurnitureItemDef[] = [
  { id: 'bed_corner', name: 'Corner Bed & Poster', emoji: '🛏️', price: 0, room: 'Bedroom', gx: 1.8, gy: 2.2, actionKey: 'sleep', desc: 'Cozy bed with red blanket & wall lamp' },
  { id: 'radio_table', name: 'Side Table & Radio', emoji: '📻', price: 0, room: 'Bedroom', gx: 1.5, gy: 0.9, actionKey: 'watch', desc: 'Plays Citi FM & Highlife classics' },
  { id: 'stove_cooler', name: 'Stove & Blue Cooler', emoji: '🍳', price: 0, room: 'Kitchen', gx: 4.5, gy: 1.2, actionKey: 'cook', desc: 'Two-burner stove & cold water cooler' },
  { id: 'red_chair', name: 'Red Plastic Chair', emoji: '🪑', price: 0, room: 'Living', gx: 3.3, gy: 5.2, actionKey: 'watch', desc: 'Iconic Ghanaian plastic chair' },
  { id: 'toilet_barrels', name: 'WC & Kufuor Gallons', emoji: '🚽', price: 0, room: 'Bath', gx: 8.2, gy: 7.5, actionKey: 'clean', desc: 'Toilet, Polytank drum & water gallons' },
  { id: 'corner_plant', name: 'Indoor Agave Plant', emoji: '🪴', price: 0, room: 'Living', gx: 8.8, gy: 1.2, actionKey: 'watch', desc: 'Fresh green corner plant' },
  { id: 'sofa_set', name: 'Executive L-Sofa', emoji: '🛋️', price: 4500, room: 'Living', gx: 2.4, gy: 7.2, actionKey: 'watch', desc: 'Plush dark lounge sofa' },
  { id: 'rug_living', name: 'Kente Circle Rug', emoji: '🟠', price: 1800, room: 'Living', gx: 4.8, gy: 5.5, actionKey: 'watch', desc: 'Warm woven centerpiece rug' },
  { id: 'tv_console', name: 'Smart TV & Soundbar', emoji: '📺', price: 6500, room: 'Living', gx: 6.8, gy: 3.2, actionKey: 'watch', desc: '55-inch 4K screen for Black Stars matches' },
  { id: 'study_desk', name: 'MacBook Workstation', emoji: '💻', price: 8500, room: 'Bedroom', gx: 6.8, gy: 1.2, actionKey: 'code', desc: 'Remote tech hustle & coding setup' },
  { id: 'standing_fan', name: 'Binatone Standing Fan', emoji: '🪭', price: 1200, room: 'Bedroom', gx: 0.9, gy: 4.2, actionKey: 'sleep', desc: 'Essential Accra breeze' },
  { id: 'solar_inverter', name: 'ECG Dumsor Inverter', emoji: '🔋', price: 12000, room: 'Kitchen', gx: 7.5, gy: 1.2, actionKey: 'clean', desc: 'Keeps lights shining during Dumsor' }
];

export function createDefaultHomeDesign(): HomeDesign {
  return {
    wallColor: 'gold',
    floorStyle: 'warm',
    ownedFurniture: ['bed_corner', 'radio_table', 'stove_cooler', 'red_chair', 'toilet_barrels', 'corner_plant'],
    activeFurniture: ['bed_corner', 'radio_table', 'stove_cooler', 'red_chair', 'toilet_barrels', 'corner_plant'],
    outfitColor: '#eab308',
    visits: 1300,
    look: {
      gender: 'man',
      hairstyle: 'braids',
      outfitColor: '#eab308',
      skinTone: '#5c3317'
    },
    housingTier: 'madina'
  };
}

interface FloatingEffect {
  text: string;
  gx: number;
  gy: number;
  alpha: number;
  dy: number;
}

const TILE_W = 36;
const TILE_H = 19;
const GRID_SIZE = 10;

let playerGx = 4.6;
let playerGy = 5.0;
let targetGx = 4.6;
let targetGy = 5.0;
let walkPhase = 0;
let fanAngle = 0;
let activeSpeechBubble: { text: string; expiresAt: number } | null = null;
const floatingEffects: FloatingEffect[] = [];

export function triggerRoomFloatText(text: string): void {
  floatingEffects.push({
    text,
    gx: playerGx,
    gy: playerGy,
    alpha: 1,
    dy: 0
  });
}

export function triggerPlayerSpeechBubble(text: string): void {
  activeSpeechBubble = {
    text: text.slice(0, 80),
    expiresAt: Date.now() + 6500
  };
}

export function walkPlayerTo(gx: number, gy: number): void {
  targetGx = Math.max(0.8, Math.min(9.0, gx));
  targetGy = Math.max(0.8, Math.min(9.0, gy));
}

function isoProject(gx: number, gy: number, gz: number, cx: number, cy: number): { x: number; y: number } {
  return {
    x: cx + (gx - gy) * TILE_W,
    y: cy + (gx + gy) * TILE_H - gz
  };
}

function drawIsoPrism(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  gx: number,
  gy: number,
  gw: number,
  gd: number,
  z0: number,
  zh: number,
  topColor: string,
  leftColor: string,
  rightColor: string
): void {
  const p00 = isoProject(gx, gy, z0 + zh, cx, cy);
  const p10 = isoProject(gx + gw, gy, z0 + zh, cx, cy);
  const p11 = isoProject(gx + gw, gy + gd, z0 + zh, cx, cy);
  const p01 = isoProject(gx, gy + gd, z0 + zh, cx, cy);

  const b10 = isoProject(gx + gw, gy, z0, cx, cy);
  const b11 = isoProject(gx + gw, gy + gd, z0, cx, cy);
  const b01 = isoProject(gx, gy + gd, z0, cx, cy);

  // Left face
  ctx.fillStyle = leftColor;
  ctx.beginPath();
  ctx.moveTo(p01.x, p01.y);
  ctx.lineTo(p11.x, p11.y);
  ctx.lineTo(b11.x, b11.y);
  ctx.lineTo(b01.x, b01.y);
  ctx.closePath();
  ctx.fill();

  // Right face
  ctx.fillStyle = rightColor;
  ctx.beginPath();
  ctx.moveTo(p10.x, p10.y);
  ctx.lineTo(p11.x, p11.y);
  ctx.lineTo(b11.x, b11.y);
  ctx.lineTo(b10.x, b10.y);
  ctx.closePath();
  ctx.fill();

  // Top face
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(p00.x, p00.y);
  ctx.lineTo(p10.x, p10.y);
  ctx.lineTo(p11.x, p11.y);
  ctx.lineTo(p01.x, p01.y);
  ctx.closePath();
  ctx.fill();
}

function drawIsoEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  gx: number,
  gy: number,
  rx: number,
  ry: number,
  fill: string,
  stroke?: string,
  lineWidth = 4
): void {
  const p = isoProject(gx, gy, 1, cx, cy);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawHairstyle(
  ctx: CanvasRenderingContext2D,
  x: number,
  headY: number,
  r: number,
  style: HairstyleType
): void {
  ctx.fillStyle = '#0f172a';
  if (style === 'bald') return;

  if (style === 'lowcut') {
    ctx.beginPath();
    ctx.arc(x, headY - r * 0.15, r * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    return;
  }

  if (style === 'afro') {
    ctx.beginPath();
    ctx.arc(x, headY - r * 0.35, r * 1.55, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (style === 'curls') {
    ctx.beginPath();
    ctx.arc(x, headY - r * 0.25, r * 1.2, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(x + i * (r * 0.42), headY - r * 0.9, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (style === 'locs' || style === 'braids') {
    // Headband / top cap
    ctx.beginPath();
    ctx.arc(x, headY - r * 0.2, r * 1.12, Math.PI * 0.92, Math.PI * 2.08);
    ctx.fill();
    // Hanging locs / braids on sides
    const len = style === 'braids' ? r * 1.65 : r * 1.45;
    for (let side of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const bx = x + side * (r * 0.65 + j * r * 0.18);
        ctx.fillRect(bx - r * 0.14, headY - r * 0.3, r * 0.26, len);
      }
    }
    return;
  }

  // 'classic'
  ctx.beginPath();
  ctx.arc(x, headY - r * 0.2, r * 1.1, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
}

function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  gx: number,
  gy: number,
  outfitColor: string,
  label: string,
  phase: number,
  hairstyle: HairstyleType = 'braids',
  showCrown = true,
  speechText?: string | null
): void {
  const p = isoProject(gx, gy, 0, cx, cy);
  const bob = Math.sin(phase) * 2.5;
  const legSwing = Math.sin(phase) * 4.5;

  ctx.save();
  // Ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 3, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Red sneakers (matching Screenshot 1-5)
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.ellipse(p.x - 4.5 + legSwing * 0.4, p.y + 1, 4.2, 2.4, 0, 0, Math.PI * 2);
  ctx.ellipse(p.x + 4.5 - legSwing * 0.4, p.y + 1, 4.2, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark tailored trousers (matching Screenshot 5)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p.x - 4, p.y - 22 + bob);
  ctx.lineTo(p.x - 4.5 + legSwing * 0.4, p.y - 1);
  ctx.moveTo(p.x + 4, p.y - 22 + bob);
  ctx.lineTo(p.x + 4.5 - legSwing * 0.4, p.y - 1);
  ctx.stroke();

  // Torso (Patterned Ankara / Gold shirt matching Screenshot 1-5)
  ctx.fillStyle = outfitColor || '#eab308';
  ctx.beginPath();
  ctx.roundRect(p.x - 9, p.y - 42 + bob, 18, 21, 5);
  ctx.fill();

  // Subtle geometric Ankara pattern dots on shirt
  ctx.fillStyle = 'rgba(180, 83, 9, 0.45)';
  for (let py = -38; py <= -26; py += 4) {
    for (let px = -6; px <= 6; px += 4) {
      ctx.fillRect(p.x + px, p.y + py + bob, 2, 2);
    }
  }

  // Arms
  ctx.strokeStyle = '#5c3317';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x - 9, p.y - 39 + bob);
  ctx.lineTo(p.x - 12, p.y - 24 + bob - legSwing * 0.4);
  ctx.moveTo(p.x + 9, p.y - 39 + bob);
  ctx.lineTo(p.x + 12, p.y - 24 + bob + legSwing * 0.4);
  ctx.stroke();

  // Head
  const headY = p.y - 50 + bob;
  ctx.fillStyle = '#5c3317';
  ctx.beginPath();
  ctx.arc(p.x, headY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Hairstyle
  drawHairstyle(ctx, p.x, headY, 8, hairstyle);

  // Floating Gold Crown (matching Screenshot 5!)
  if (showCrown) {
    const cyCrown = headY - 15 + Math.sin(Date.now() * 0.005) * 1.5;
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 6, cyCrown);
    ctx.lineTo(p.x - 7, cyCrown - 6);
    ctx.lineTo(p.x - 3, cyCrown - 3);
    ctx.lineTo(p.x, cyCrown - 8);
    ctx.lineTo(p.x + 3, cyCrown - 3);
    ctx.lineTo(p.x + 7, cyCrown - 6);
    ctx.lineTo(p.x + 6, cyCrown);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Name tag
  if (label) {
    ctx.font = '700 10px Outfit, sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.beginPath();
    ctx.roundRect(p.x - tw / 2 - 6, headY - 35, tw + 12, 14, 7);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(label, p.x, headY - 25);
  }

  // Speech bubble if player said something out loud
  if (speechText) {
    ctx.font = '600 11px Outfit, sans-serif';
    const maxW = Math.min(180, ctx.measureText(speechText).width + 20);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(p.x - maxW / 2, headY - 62, maxW, 22, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(speechText, p.x, headY - 47);
  }

  ctx.restore();
}

export function renderAvatarPortrait(outfitColor: string, hairstyle: HairstyleType = 'braids'): void {
  const canvas = document.getElementById('avatarPortraitCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Soft studio green-tinted backdrop matching Screenshot 5 & 6
  const grad = ctx.createRadialGradient(30, 30, 6, 30, 30, 30);
  grad.addColorStop(0, '#f0fdf4');
  grad.addColorStop(1, '#dcfce7');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(30, 30, 30, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders / Patterned Yellow-Gold Shirt
  ctx.fillStyle = outfitColor || '#eab308';
  ctx.beginPath();
  ctx.roundRect(12, 37, 36, 25, 11);
  ctx.fill();

  // Pattern dots on portrait shirt
  ctx.fillStyle = 'rgba(180, 83, 9, 0.35)';
  for (let x = 16; x <= 42; x += 5) {
    for (let y = 41; y <= 55; y += 5) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Neck
  ctx.fillStyle = '#5c3317';
  ctx.fillRect(25, 29, 10, 10);

  // Face (low-poly stylized)
  ctx.fillStyle = '#6b3e20';
  ctx.beginPath();
  ctx.roundRect(20, 13, 20, 20, 7);
  ctx.fill();

  // Hairstyle
  drawHairstyle(ctx, 30, 21, 10.5, hairstyle);

  // Eyes & subtle nose bridge
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(24, 21, 3, 2);
  ctx.fillRect(33, 21, 3, 2);
  ctx.fillStyle = '#4a2810';
  ctx.fillRect(29, 22, 2, 5);
}

// 3D Low-Poly Full-Body Preview for the 5-Step Character Creation Wizard (IMG_1272 - IMG_1277)
export function renderCreatorSimPreview(
  canvasId: string,
  look: SimLook,
  spinAngleRad: number
): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const cx = w * 0.5;
  const baseY = h - 38;

  // Pedestal ellipse ("Drag to spin")
  ctx.fillStyle = '#dce3e8';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 8, 96, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 2, 42, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  const turnX = Math.sin(spinAngleRad) * 6;
  const torsoW = look.gender === 'woman' ? 42 : 48;

  // Legs (Dark navy trousers)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 11 + turnX * 0.3, baseY - 92);
  ctx.lineTo(cx - 14, baseY - 8);
  ctx.moveTo(cx + 11 + turnX * 0.3, baseY - 92);
  ctx.lineTo(cx + 12, baseY - 8);
  ctx.stroke();

  // Red sneakers with white soles
  ctx.fillStyle = '#881337';
  ctx.beginPath();
  ctx.roundRect(cx - 24, baseY - 12, 20, 12, 5);
  ctx.roundRect(cx + 4, baseY - 12, 22, 12, 5);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(cx - 24, baseY - 3, 20, 3);
  ctx.fillRect(cx + 4, baseY - 3, 22, 3);

  // Arms (Low-poly muscular/sculpted brown skin)
  ctx.strokeStyle = look.skinTone || '#5c3317';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(cx - torsoW * 0.52, baseY - 154);
  ctx.lineTo(cx - torsoW * 0.68 - turnX * 0.4, baseY - 94);
  ctx.moveTo(cx + torsoW * 0.52, baseY - 154);
  ctx.lineTo(cx + torsoW * 0.68 - turnX * 0.4, baseY - 94);
  ctx.stroke();

  // Short sleeves
  ctx.strokeStyle = look.outfitColor || '#eab308';
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(cx - torsoW * 0.48, baseY - 158);
  ctx.lineTo(cx - torsoW * 0.58, baseY - 134);
  ctx.moveTo(cx + torsoW * 0.48, baseY - 158);
  ctx.lineTo(cx + torsoW * 0.58, baseY - 134);
  ctx.stroke();

  // Torso (Patterned yellow-gold Ankara top)
  ctx.fillStyle = look.outfitColor || '#eab308';
  ctx.beginPath();
  ctx.roundRect(cx - torsoW / 2 + turnX * 0.2, baseY - 166, torsoW, 76, 14);
  ctx.fill();

  // Geometric diamond pattern on shirt (matching IMG_1272!)
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.45)';
  ctx.lineWidth = 1.3;
  for (let py = baseY - 156; py < baseY - 96; py += 10) {
    for (let px = cx - torsoW / 2 + 8; px < cx + torsoW / 2 - 6; px += 9) {
      ctx.strokeRect(px + turnX * 0.2, py, 5, 6);
    }
  }

  // Neck
  ctx.fillStyle = look.skinTone || '#5c3317';
  ctx.fillRect(cx - 8 + turnX * 0.2, baseY - 182, 16, 18);

  // Sculpted Low-Poly Head
  const headY = baseY - 200;
  ctx.fillStyle = look.skinTone || '#5c3317';
  ctx.beginPath();
  ctx.roundRect(cx - 17 + turnX * 0.35, headY - 18, 34, 38, 10);
  ctx.fill();

  // Facial features (eyes, nose bridge, mouth)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cx - 10 + turnX * 0.6, headY - 4, 5, 3);
  ctx.fillRect(cx + 5 + turnX * 0.6, headY - 4, 5, 3);
  ctx.fillStyle = '#3e1f0d';
  ctx.fillRect(cx - 2 + turnX * 0.7, headY - 3, 4, 10);
  ctx.fillRect(cx - 5 + turnX * 0.6, headY + 11, 10, 2.5);

  // Hairstyle
  drawHairstyle(ctx, cx + turnX * 0.35, headY - 2, 18, look.hairstyle);

  // "Drag to spin" caption on pedestal
  ctx.fillStyle = '#64748b';
  ctx.font = '600 13px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Drag to spin', cx, baseY + 20);
}

export function setupIsoRoomEngine(
  getDesign: () => HomeDesign,
  getHostInfo: () => {
    name: string;
    isVisiting: boolean;
    visitorName: string;
    dumsor: boolean;
    locationKey: string;
    locationName: string;
  },
  onTriggerAction: (actionKey: string, label: string) => void
): void {
  const canvas = document.getElementById('isoRoomCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  const handlePointer = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.25;

    const dx = (mx - cx) / TILE_W;
    const dy = (my - cy) / TILE_H;
    const gx = (dx + dy) * 0.5;
    const gy = (dy - dx) * 0.5;

    if (gx >= 0.4 && gx <= 9.6 && gy >= 0.4 && gy <= 9.6) {
      targetGx = Math.max(0.8, Math.min(9.1, gx));
      targetGy = Math.max(0.8, Math.min(9.1, gy));

      const hostInfo = getHostInfo();
      if (hostInfo.locationKey !== 'home' && !hostInfo.isVisiting) {
        return;
      }

      const design = getDesign();
      const activeSet = new Set(design.activeFurniture || []);
      let matchedItem: FurnitureItemDef | null = null;
      let bestDist = 1.85;

      for (const item of FURNITURE_CATALOG) {
        if (!activeSet.has(item.id)) continue;
        const dist = Math.hypot(gx - item.gx, gy - item.gy);
        if (dist < bestDist) {
          bestDist = dist;
          matchedItem = item;
        }
      }

      if (matchedItem) {
        onTriggerAction(matchedItem.actionKey, matchedItem.name);
      }
    }
  };

  canvas.addEventListener('click', (e) => {
    handlePointer(e.clientX, e.clientY);
  });

  const renderFrame = () => {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const hostInfo = getHostInfo();
      if (hostInfo.locationKey !== 'home' && !hostInfo.isVisiting) {
        drawOutdoorVenueScene(ctx, canvas.width, canvas.height, getDesign(), hostInfo);
      } else {
        drawRoomScene(ctx, canvas.width, canvas.height, getDesign(), hostInfo);
      }
    }
    requestAnimationFrame(renderFrame);
  };

  requestAnimationFrame(renderFrame);
}

// Outdoor 3D/Isometric Scene when visiting Freedom Park / Kwame Nkrumah Park / Labadi Beach / Makola (matches IMG_1279!)
function drawOutdoorVenueScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  design: HomeDesign,
  hostInfo: { name: string; locationKey: string; locationName: string }
): void {
  ctx.clearRect(0, 0, width, height);
  const cx = width * 0.5;
  const cy = height * 0.22;

  // Lush park green ground (matches IMG_1279!)
  ctx.fillStyle = '#4d6b3c';
  ctx.fillRect(0, 0, width, height);

  // Diagonal paved walkways & park lawn
  for (let ix = 0; ix < GRID_SIZE; ix++) {
    for (let iy = 0; iy < GRID_SIZE; iy++) {
      const isPath = ix === 4 || iy === 5;
      const p00 = isoProject(ix, iy, 0, cx, cy);
      const p10 = isoProject(ix + 1, iy, 0, cx, cy);
      const p11 = isoProject(ix + 1, iy + 1, 0, cx, cy);
      const p01 = isoProject(ix, iy + 1, 0, cx, cy);

      ctx.fillStyle = isPath
        ? ((ix + iy) % 2 === 0 ? '#657d50' : '#5c7448')
        : ((ix + iy) % 2 === 0 ? '#557542' : '#4e6d3b');
      ctx.beginPath();
      ctx.moveTo(p00.x, p00.y);
      ctx.lineTo(p10.x, p10.y);
      ctx.lineTo(p11.x, p11.y);
      ctx.lineTo(p01.x, p01.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Exhibition Art Boards at top-right (matching IMG_1279!)
  for (let b = 0; b < 3; b++) {
    const bx = 2.2 + b * 1.4;
    const by = 0.8;
    // Posts
    drawIsoPrism(ctx, cx, cy, bx, by, 0.1, 0.1, 0, 28, '#cbd5e1', '#94a3b8', '#64748b');
    drawIsoPrism(ctx, cx, cy, bx + 0.7, by, 0.1, 0.1, 0, 28, '#cbd5e1', '#94a3b8', '#64748b');
    // White canvas board
    drawIsoPrism(ctx, cx, cy, bx - 0.05, by - 0.05, 0.9, 0.15, 16, 20, '#f8fafc', '#e2e8f0', '#cbd5e1');
    // Art painting inside board
    const artColor = b === 0 ? '#991b1b' : (b === 1 ? '#1e40af' : '#d97706');
    drawIsoPrism(ctx, cx, cy, bx + 0.1, by - 0.02, 0.55, 0.16, 19, 13, artColor, artColor, artColor);
  }

  // Park Stage / Pavilion structure on left & right
  drawIsoPrism(ctx, cx, cy, 0.3, 2.0, 2.2, 2.0, 0, 12, '#94a3b8', '#64748b', '#475569');
  drawIsoPrism(ctx, cx, cy, 8.2, 2.5, 1.6, 1.8, 0, 42, '#dc2626', '#991b1b', '#7f1d1d');

  // Wooden Park Benches (matching IMG_1279 bottom-left)
  drawIsoPrism(ctx, cx, cy, 1.2, 7.2, 0.7, 2.0, 0, 10, '#92400e', '#78350f', '#451a03');
  drawIsoPrism(ctx, cx, cy, 7.5, 7.4, 2.0, 0.7, 0, 10, '#92400e', '#78350f', '#451a03');

  // Low-Poly Trees (matching IMG_1279!)
  const treeCoords = [
    { gx: 6.8, gy: 6.4 },
    { gx: 8.6, gy: 1.2 },
    { gx: 1.1, gy: 5.0 }
  ];
  treeCoords.forEach(t => {
    // Trunk
    drawIsoPrism(ctx, cx, cy, t.gx, t.gy, 0.35, 0.35, 0, 22, '#78350f', '#5c2408', '#451a03');
    // Low-poly faceted canopy
    drawIsoPrism(ctx, cx, cy, t.gx - 0.55, t.gy - 0.55, 1.45, 1.45, 22, 34, '#34d399', '#059669', '#065f46');
    drawIsoPrism(ctx, cx, cy, t.gx - 0.35, t.gy - 0.35, 1.05, 1.05, 56, 16, '#6ee7b7', '#10b981', '#047857');
  });

  // Other Accra residents strolling / chilling in the venue
  drawCharacterSprite(ctx, cx, cy, 3.3, 1.8, '#9333ea', '@ama', 0, 'afro', false);
  drawCharacterSprite(ctx, cx, cy, 1.6, 7.8, '#2563eb', '@kofi', 0, 'lowcut', false);
  drawCharacterSprite(ctx, cx, cy, 8.4, 5.8, '#ea580c', '@abena', 0, 'braids', false);

  // Update & draw player character
  const dx = targetGx - playerGx;
  const dy = targetGy - playerGy;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.06) {
    playerGx += (dx / dist) * 0.048;
    playerGy += (dy / dist) * 0.048;
    walkPhase += 0.28;
  } else {
    walkPhase = 0;
  }

  const bubble = activeSpeechBubble && Date.now() < activeSpeechBubble.expiresAt
    ? activeSpeechBubble.text
    : null;

  drawCharacterSprite(
    ctx,
    cx,
    cy,
    playerGx,
    playerGy,
    design.outfitColor,
    hostInfo.name,
    walkPhase,
    design.look?.hairstyle || 'braids',
    true,
    bubble
  );

  // Floating feedback
  for (let i = floatingEffects.length - 1; i >= 0; i--) {
    const ef = floatingEffects[i];
    const fp = isoProject(ef.gx, ef.gy, 65 + ef.dy, cx, cy);
    ctx.save();
    ctx.font = '800 14px Outfit, sans-serif';
    ctx.fillStyle = `rgba(34, 197, 94, ${ef.alpha})`;
    ctx.strokeStyle = `rgba(15, 23, 42, ${ef.alpha})`;
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(ef.text, fp.x, fp.y);
    ctx.fillText(ef.text, fp.x, fp.y);
    ctx.restore();
    ef.dy += 0.8;
    ef.alpha -= 0.022;
    if (ef.alpha <= 0) floatingEffects.splice(i, 1);
  }
}

// Authentic Isometric Single-Room + Upgradeable Home (matches IMG_1278!)
function drawRoomScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  design: HomeDesign,
  hostInfo: { name: string; isVisiting: boolean; visitorName: string; dumsor: boolean }
): void {
  ctx.clearRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.25;

  // 1. Deep night sky & olive-sage ground island (matches IMG_1278!)
  ctx.save();
  ctx.fillStyle = '#4a5535';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 220, 520, 270, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const wallSwatch = WALL_SWATCHES.find(w => w.id === design.wallColor) || WALL_SWATCHES[0];
  const floorSwatch = FLOOR_SWATCHES.find(f => f.id === design.floorStyle) || FLOOR_SWATCHES[0];
  const activeSet = new Set(design.activeFurniture || []);

  // 2. Foundation & Checkered Floor Tiles (matching IMG_1278 terracotta brown tiles!)
  drawIsoPrism(ctx, cx, cy, 0, 0, GRID_SIZE, GRID_SIZE, -8, 8, floorSwatch.c1, '#6b4c30', '#543b24');

  for (let ix = 0; ix < GRID_SIZE; ix++) {
    for (let iy = 0; iy < GRID_SIZE; iy++) {
      const tileColor = (ix + iy) % 2 === 0 ? floorSwatch.c1 : floorSwatch.c2;
      const p00 = isoProject(ix, iy, 0, cx, cy);
      const p10 = isoProject(ix + 1, iy, 0, cx, cy);
      const p11 = isoProject(ix + 1, iy + 1, 0, cx, cy);
      const p01 = isoProject(ix, iy + 1, 0, cx, cy);

      ctx.fillStyle = tileColor;
      ctx.beginPath();
      ctx.moveTo(p00.x, p00.y);
      ctx.lineTo(p10.x, p10.y);
      ctx.lineTo(p11.x, p11.y);
      ctx.lineTo(p01.x, p01.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 3. Back Cutaway Walls (Warm Ochre/Gold walls matching IMG_1278!)
  const wallH = 82;
  // Left back wall (gx = 0, gy = 0..10)
  drawIsoPrism(ctx, cx, cy, -0.24, 0, 0.24, GRID_SIZE, 0, wallH, wallSwatch.top, wallSwatch.shade, wallSwatch.base);
  // Right back wall (gx = 0..10, gy = 0)
  drawIsoPrism(ctx, cx, cy, 0, -0.24, GRID_SIZE, 0.24, 0, wallH, wallSwatch.top, wallSwatch.base, wallSwatch.shade);

  // Glowing Wall Sconces with warm radial light halos (matching IMG_1278!)
  if (!hostInfo.dumsor || activeSet.has('solar_inverter')) {
    const sconce1 = isoProject(0.05, 4.2, 58, cx, cy);
    const sconce2 = isoProject(2.4, 0.05, 62, cx, cy);
    [sconce1, sconce2].forEach(sp => {
      const rad = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, 44);
      rad.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
      rad.addColorStop(0.4, 'rgba(253, 224, 71, 0.35)');
      rad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 44, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Wall Poster / Calendar on left wall (matching IMG_1278!)
  drawIsoPrism(ctx, cx, cy, 0.02, 5.2, 0.06, 0.85, 34, 22, '#ffffff', '#e2e8f0', '#f8fafc');
  drawIsoPrism(ctx, cx, cy, 0.04, 5.3, 0.06, 0.65, 46, 6, '#ef4444', '#dc2626', '#b91c1c');

  // Barred Louver Window on right back wall (matching IMG_1278!)
  drawIsoPrism(ctx, cx, cy, 5.6, 0.02, 2.3, 0.1, 34, 34, '#64748b', '#94a3b8', '#cbd5e1');
  const winP1 = isoProject(5.7, 0.06, 64, cx, cy);
  const winP2 = isoProject(7.8, 0.06, 38, cx, cy);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo((winP1.x + winP2.x) / 2, winP1.y - 4);
  ctx.lineTo((winP1.x + winP2.x) / 2, winP2.y + 4);
  ctx.stroke();

  // 4. Starter & Upgraded Furniture Items
  // Corner Bed with Red Blanket & White Pillow (matching IMG_1278!)
  if (activeSet.has('bed_corner')) {
    // Bed frame & headboard
    drawIsoPrism(ctx, cx, cy, 0.3, 0.3, 1.5, 0.25, 0, 28, '#d6b88e', '#a38358', '#bfa074');
    drawIsoPrism(ctx, cx, cy, 0.3, 0.55, 1.5, 2.7, 0, 12, '#e2c799', '#b89768', '#cfa977');
    // White sheet & pillow
    drawIsoPrism(ctx, cx, cy, 0.35, 0.6, 1.4, 0.8, 12, 3, '#f8fafc', '#cbd5e1', '#e2e8f0');
    drawIsoPrism(ctx, cx, cy, 0.55, 0.65, 1.0, 0.45, 15, 3, '#ffffff', '#e2e8f0', '#cbd5e1');
    // Red-orange blanket
    drawIsoPrism(ctx, cx, cy, 0.35, 1.35, 1.4, 1.85, 12, 3.5, '#c2410c', '#9a3412', '#b45309');
  }

  // Bedside Table & Vintage Radio (matching IMG_1278!)
  if (activeSet.has('radio_table')) {
    drawIsoPrism(ctx, cx, cy, 2.1, 0.35, 1.0, 0.8, 0, 18, '#cfa977', '#9c784c', '#b58e5e');
    // Radio box on top
    drawIsoPrism(ctx, cx, cy, 2.25, 0.45, 0.7, 0.45, 18, 9, '#94a3b8', '#475569', '#64748b');
  }

  // Two-Burner Stove Table & Blue Ice Cooler (matching IMG_1278!)
  if (activeSet.has('stove_cooler')) {
    // Stove table
    drawIsoPrism(ctx, cx, cy, 3.7, 0.35, 1.2, 0.85, 0, 18, '#cfa977', '#9c784c', '#b58e5e');
    // Dark green/black cooking pot on stove
    drawIsoPrism(ctx, cx, cy, 4.05, 0.5, 0.55, 0.55, 18, 8, '#14532d', '#0f172a', '#1e293b');
    // Blue Ice Cooler with white lid right next to it
    drawIsoPrism(ctx, cx, cy, 5.3, 0.45, 1.15, 0.85, 0, 14, '#1d4ed8', '#1e3a8a', '#1e40af');
    drawIsoPrism(ctx, cx, cy, 5.28, 0.43, 1.19, 0.89, 14, 3, '#f8fafc', '#cbd5e1', '#e2e8f0');
  }

  // Corner Potted Agave Plant (matching IMG_1278 top-right corner!)
  if (activeSet.has('corner_plant')) {
    drawIsoPrism(ctx, cx, cy, 8.9, 0.45, 0.65, 0.65, 0, 14, '#b45309', '#78350f', '#92400e');
    drawIsoPrism(ctx, cx, cy, 9.0, 0.55, 0.45, 0.45, 14, 20, '#16a34a', '#15803d', '#14532d');
  }

  // Red Plastic Chair in the room (matching IMG_1278!)
  if (activeSet.has('red_chair')) {
    // Seat
    drawIsoPrism(ctx, cx, cy, 2.8, 4.8, 0.85, 0.85, 0, 12, '#b91c1c', '#7f1d1d', '#991b1c');
    // Backrest
    drawIsoPrism(ctx, cx, cy, 2.8, 4.8, 0.2, 0.85, 12, 14, '#dc2626', '#7f1d1d', '#991b1c');
  }

  // Upgraded Kente Circle Rug
  if (activeSet.has('rug_living')) {
    drawIsoEllipse(ctx, cx, cy, 5.2, 5.6, 56, 28, '#ea580c', '#facc15', 5);
  }

  // Upgraded L-Sofa
  if (activeSet.has('sofa_set')) {
    drawIsoPrism(ctx, cx, cy, 1.2, 6.2, 1.0, 2.3, 0, 14, '#1f2937', '#0f172a', '#111827');
    drawIsoPrism(ctx, cx, cy, 1.2, 6.2, 0.3, 2.3, 14, 9, '#374151', '#111827', '#1f2937');
  }

  // Upgraded Smart TV
  if (activeSet.has('tv_console')) {
    drawIsoPrism(ctx, cx, cy, 6.5, 2.2, 1.8, 0.6, 0, 12, '#cfa977', '#9c784c', '#b58e5e');
    drawIsoPrism(ctx, cx, cy, 6.7, 2.3, 1.4, 0.15, 12, 22, '#38bdf8', '#0f172a', '#1e293b');
  }

  // Upgraded Laptop Workstation
  if (activeSet.has('study_desk')) {
    drawIsoPrism(ctx, cx, cy, 6.8, 0.4, 1.4, 0.85, 0, 18, '#e2c799', '#b89768', '#cfa977');
    drawIsoPrism(ctx, cx, cy, 7.2, 0.55, 0.55, 0.4, 18, 4, '#e2e8f0', '#64748b', '#94a3b8');
  }

  // Upgraded Standing Fan
  if (activeSet.has('standing_fan')) {
    fanAngle += 0.18;
    const fp = isoProject(0.8, 4.2, 0, cx, cy);
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(fp.x, fp.y, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fp.x, fp.y);
    ctx.lineTo(fp.x, fp.y - 28);
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(fp.x, fp.y - 30, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Update & Draw Characters
  const dx = targetGx - playerGx;
  const dy = targetGy - playerGy;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.06) {
    playerGx += (dx / dist) * 0.045;
    playerGy += (dy / dist) * 0.045;
    walkPhase += 0.28;
  } else {
    walkPhase = 0;
  }

  const bubble = activeSpeechBubble && Date.now() < activeSpeechBubble.expiresAt
    ? activeSpeechBubble.text
    : null;

  if (hostInfo.isVisiting) {
    drawCharacterSprite(ctx, cx, cy, 3.8, 4.4, '#f59e0b', hostInfo.name, 0, 'afro', true);
    drawCharacterSprite(
      ctx,
      cx,
      cy,
      playerGx,
      playerGy,
      design.outfitColor,
      hostInfo.visitorName,
      walkPhase,
      design.look?.hairstyle || 'braids',
      true,
      bubble
    );
  } else {
    drawCharacterSprite(
      ctx,
      cx,
      cy,
      playerGx,
      playerGy,
      design.outfitColor,
      hostInfo.name,
      walkPhase,
      design.look?.hairstyle || 'braids',
      true,
      bubble
    );
  }

  // 6. Bottom-Right Corner: Toilet + Blue Polytank Water Barrel + Yellow Kufuor Gallons (matching IMG_1278!)
  if (activeSet.has('toilet_barrels')) {
    // Tall Blue Water Drum / Polytank
    drawIsoPrism(ctx, cx, cy, 8.6, 5.8, 0.95, 0.95, 0, 32, '#1e3a8a', '#172554', '#1e40af');
    // Yellow Kufuor Gallons (Jerrycans)
    drawIsoPrism(ctx, cx, cy, 7.8, 6.2, 0.65, 0.55, 0, 14, '#eab308', '#a16207', '#ca8a04');
    drawIsoPrism(ctx, cx, cy, 8.2, 6.8, 0.5, 0.5, 0, 12, '#ca8a04', '#854d0e', '#a16207');
    // Smaller Blue Bucket & Red Bowl
    drawIsoPrism(ctx, cx, cy, 8.6, 7.1, 0.75, 0.75, 0, 18, '#1d4ed8', '#1e3a8a', '#2563eb');
    drawIsoPrism(ctx, cx, cy, 7.9, 7.6, 0.6, 0.6, 0, 6, '#dc2626', '#991b1b', '#b91c1c');
    // White Ceramic Toilet in bottom-right corner
    drawIsoPrism(ctx, cx, cy, 8.5, 8.2, 0.9, 0.55, 0, 24, '#f8fafc', '#cbd5e1', '#e2e8f0');
    drawIsoPrism(ctx, cx, cy, 8.4, 8.5, 1.0, 1.0, 0, 13, '#ffffff', '#cbd5e1', '#e2e8f0');
  }

  // 7. Cutaway Low Front Perimeter Rim (matching IMG_1278!)
  drawIsoPrism(ctx, cx, cy, 0, 9.82, GRID_SIZE, 0.18, 0, 7, wallSwatch.top, wallSwatch.base, wallSwatch.shade);
  drawIsoPrism(ctx, cx, cy, 9.82, 0, 0.18, GRID_SIZE, 0, 7, wallSwatch.top, wallSwatch.shade, wallSwatch.base);

  // 8. ECG Dumsor Dark Overlay
  if (hostInfo.dumsor && !activeSet.has('solar_inverter')) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 0, width, height);
  }

  // 9. Floating Feedback Text
  for (let i = floatingEffects.length - 1; i >= 0; i--) {
    const ef = floatingEffects[i];
    const fp = isoProject(ef.gx, ef.gy, 65 + ef.dy, cx, cy);
    ctx.save();
    ctx.font = '800 14px Outfit, sans-serif';
    ctx.fillStyle = `rgba(34, 197, 94, ${ef.alpha})`;
    ctx.strokeStyle = `rgba(15, 23, 42, ${ef.alpha})`;
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(ef.text, fp.x, fp.y);
    ctx.fillText(ef.text, fp.x, fp.y);
    ctx.restore();
    ef.dy += 0.8;
    ef.alpha -= 0.022;
    if (ef.alpha <= 0) floatingEffects.splice(i, 1);
  }
}
