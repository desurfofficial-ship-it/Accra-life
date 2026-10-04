import * as THREE from 'three';

interface ScreenPoint2D {
  x: number;
  y: number;
}

interface ProjectedBoxFace {
  points: [ScreenPoint2D, ScreenPoint2D, ScreenPoint2D, ScreenPoint2D];
  depth: number;
  fillStyle: string;
  strokeStyle: string;
}

type SixFaceShades = [string, string, string, string, string, string];

/**
 * Emergency software 3D perspective compatibility renderer using HTML5 Canvas2D.
 * Used automatically whenever WebGL / WebGL2 shader compilation is unavailable
 * or the WebGL context is lost. Preallocates and pools face/point structures,
 * sky gradients, and shaded color strings to avoid per-frame GC churn.
 */
export class Canvas3DFallbackRenderer {
  public readonly domElement: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private pixelRatio = 1;

  private skyGradient: CanvasGradient | null = null;
  private readonly viewProjMatrix = new THREE.Matrix4();
  private readonly worldMatrix = new THREE.Matrix4();
  private readonly scratchCorner = new THREE.Vector3();
  private readonly scratchCenter = new THREE.Vector3();
  private readonly currentCamPos = new THREE.Vector3();

  // Reusable object pool for projected faces and active render list
  private readonly facePool: ProjectedBoxFace[] = [];
  private readonly activeFaces: ProjectedBoxFace[] = [];
  private poolCursor = 0;

  // Cache of 6 pre-shaded RGB strings keyed by material hex color
  private readonly shadeColorCache: Map<number, SixFaceShades> = new Map();

  // 8 corners of a bounding box in world/projected space
  private readonly corners: THREE.Vector3[] = Array.from({ length: 8 }, () => new THREE.Vector3());
  private readonly screenPts: Array<{ x: number; y: number; z: number; visible: boolean }> =
    Array.from({ length: 8 }, () => ({ x: 0, y: 0, z: 0, visible: false }));

  // 6 faces of a box (indices into corners 0..7)
  private static readonly BOX_FACES: Array<{ indices: [number, number, number, number]; shade: number }> = [
    { indices: [0, 1, 2, 3], shade: 0.78 }, // Back (-Z)
    { indices: [4, 5, 6, 7], shade: 0.96 }, // Front (+Z)
    { indices: [0, 4, 7, 3], shade: 0.82 }, // Left (-X)
    { indices: [1, 5, 6, 2], shade: 0.90 }, // Right (+X)
    { indices: [3, 2, 6, 7], shade: 1.08 }, // Top (+Y)
    { indices: [0, 1, 5, 4], shade: 0.65 }  // Bottom (-Y)
  ];

  private static readonly DEFAULT_STROKE = 'rgba(15, 23, 42, 0.14)';
  private static readonly depthComparator = (a: ProjectedBoxFace, b: ProjectedBoxFace): number =>
    b.depth - a.depth;

  constructor(width: number, height: number) {
    this.domElement = document.createElement('canvas');
    this.domElement.style.display = 'block';
    this.domElement.style.width = '100%';
    this.domElement.style.height = '100%';
    const context = this.domElement.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.ctx = context;
    this.setSize(width, height);
  }

  public setPixelRatio(ratio: number): void {
    this.pixelRatio = Math.min(Math.max(1, ratio), 2);
    this.setSize(this.width, this.height);
  }

  public setSize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.domElement.width = Math.round(this.width * this.pixelRatio);
    this.domElement.height = Math.round(this.height * this.pixelRatio);
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#c7e2fa');
    grad.addColorStop(0.55, '#dfeffc');
    grad.addColorStop(1, '#d9b99b');
    this.skyGradient = grad;
  }

  public render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    this.viewProjMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.currentCamPos.copy(camera.position);

    // 1. Draw cached sky & ground gradient
    this.ctx.fillStyle = this.skyGradient || '#dfeffc';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Reset pool cursor and active face list without allocating new arrays
    this.poolCursor = 0;
    this.activeFaces.length = 0;

    scene.traverseVisible(this.traverseSceneObject);

    // 3. Sort active faces back-to-front by distance to camera
    this.activeFaces.sort(Canvas3DFallbackRenderer.depthComparator);

    this.ctx.lineWidth = 0.65;
    for (let i = 0; i < this.activeFaces.length; i++) {
      const f = this.activeFaces[i];
      const pts = f.points;

      this.ctx.beginPath();
      this.ctx.moveTo(pts[0].x, pts[0].y);
      this.ctx.lineTo(pts[1].x, pts[1].y);
      this.ctx.lineTo(pts[2].x, pts[2].y);
      this.ctx.lineTo(pts[3].x, pts[3].y);
      this.ctx.closePath();
      this.ctx.fillStyle = f.fillStyle;
      this.ctx.fill();
      this.ctx.strokeStyle = f.strokeStyle;
      this.ctx.stroke();
    }
  }

  private readonly traverseSceneObject = (obj: THREE.Object3D): void => {
    if (!(obj instanceof THREE.Mesh)) return;
    const geom = obj.geometry as THREE.BufferGeometry;
    if (!geom) return;

    if (!geom.boundingBox) {
      geom.computeBoundingBox();
    }
    const bbox = geom.boundingBox;
    if (!bbox) return;

    // Skip huge ground plane so we draw it cleanly behind all 3D objects
    const sizeX = bbox.max.x - bbox.min.x;
    const sizeZ = bbox.max.z - bbox.min.z;
    if (sizeX > 75 && sizeZ > 75) return;

    const baseHex = this.extractMeshColorHex(obj);
    this.projectMeshBoundingBox(obj, bbox, baseHex);
  };

  private acquirePooledFace(): ProjectedBoxFace {
    if (this.poolCursor < this.facePool.length) {
      const existing = this.facePool[this.poolCursor++];
      return existing;
    }
    const created: ProjectedBoxFace = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ],
      depth: 0,
      fillStyle: '#cccccc',
      strokeStyle: Canvas3DFallbackRenderer.DEFAULT_STROKE
    };
    this.facePool.push(created);
    this.poolCursor++;
    return created;
  }

  private getShadedColorsForHex(baseHex: number): SixFaceShades {
    let shades = this.shadeColorCache.get(baseHex);
    if (!shades) {
      const rBase = (baseHex >> 16) & 255;
      const gBase = (baseHex >> 8) & 255;
      const bBase = baseHex & 255;
      const computed: string[] = [];
      for (let f = 0; f < Canvas3DFallbackRenderer.BOX_FACES.length; f++) {
        const shade = Canvas3DFallbackRenderer.BOX_FACES[f].shade;
        const r = Math.min(255, Math.round(rBase * shade));
        const g = Math.min(255, Math.round(gBase * shade));
        const b = Math.min(255, Math.round(bBase * shade));
        computed.push(`rgb(${r},${g},${b})`);
      }
      shades = computed as SixFaceShades;
      this.shadeColorCache.set(baseHex, shades);
    }
    return shades;
  }

  private extractMeshColorHex(mesh: THREE.Mesh): number {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (mat && 'color' in mat && mat.color instanceof THREE.Color) {
      return mat.color.getHex();
    }
    return 0xcccccc;
  }

  private projectMeshBoundingBox(
    mesh: THREE.Mesh,
    bbox: THREE.Box3,
    baseHex: number
  ): void {
    this.worldMatrix.copy(mesh.matrixWorld);
    const min = bbox.min;
    const max = bbox.max;

    // 8 local corners transformed into world space
    this.corners[0].set(min.x, min.y, min.z).applyMatrix4(this.worldMatrix);
    this.corners[1].set(max.x, min.y, min.z).applyMatrix4(this.worldMatrix);
    this.corners[2].set(max.x, max.y, min.z).applyMatrix4(this.worldMatrix);
    this.corners[3].set(min.x, max.y, min.z).applyMatrix4(this.worldMatrix);
    this.corners[4].set(min.x, min.y, max.z).applyMatrix4(this.worldMatrix);
    this.corners[5].set(max.x, min.y, max.z).applyMatrix4(this.worldMatrix);
    this.corners[6].set(max.x, max.y, max.z).applyMatrix4(this.worldMatrix);
    this.corners[7].set(min.x, max.y, max.z).applyMatrix4(this.worldMatrix);

    let anyVisible = false;
    for (let i = 0; i < 8; i++) {
      this.scratchCorner.copy(this.corners[i]).applyMatrix4(this.viewProjMatrix);
      const isInFront = this.scratchCorner.z >= -1 && this.scratchCorner.z <= 1;
      const sx = (this.scratchCorner.x * 0.5 + 0.5) * this.width;
      const sy = (-this.scratchCorner.y * 0.5 + 0.5) * this.height;
      this.screenPts[i].x = sx;
      this.screenPts[i].y = sy;
      this.screenPts[i].z = this.scratchCorner.z;
      this.screenPts[i].visible = isInFront;
      if (isInFront) anyVisible = true;
    }

    if (!anyVisible) return;

    const shades = this.getShadedColorsForHex(baseHex);
    const isFlatSlab = max.y - min.y < 0.22;

    for (let f = 0; f < Canvas3DFallbackRenderer.BOX_FACES.length; f++) {
      if (isFlatSlab && f !== 4) continue;

      const idx = Canvas3DFallbackRenderer.BOX_FACES[f].indices;
      if (
        !this.screenPts[idx[0]].visible ||
        !this.screenPts[idx[1]].visible ||
        !this.screenPts[idx[2]].visible ||
        !this.screenPts[idx[3]].visible
      ) {
        continue;
      }

      // Face center in world space for accurate camera depth sorting
      this.scratchCenter
        .copy(this.corners[idx[0]])
        .add(this.corners[idx[1]])
        .add(this.corners[idx[2]])
        .add(this.corners[idx[3]])
        .multiplyScalar(0.25);

      const pooled = this.acquirePooledFace();
      pooled.points[0].x = this.screenPts[idx[0]].x;
      pooled.points[0].y = this.screenPts[idx[0]].y;
      pooled.points[1].x = this.screenPts[idx[1]].x;
      pooled.points[1].y = this.screenPts[idx[1]].y;
      pooled.points[2].x = this.screenPts[idx[2]].x;
      pooled.points[2].y = this.screenPts[idx[2]].y;
      pooled.points[3].x = this.screenPts[idx[3]].x;
      pooled.points[3].y = this.screenPts[idx[3]].y;
      pooled.depth = this.scratchCenter.distanceToSquared(this.currentCamPos);
      pooled.fillStyle = shades[f];
      pooled.strokeStyle = Canvas3DFallbackRenderer.DEFAULT_STROKE;

      this.activeFaces.push(pooled);
    }
  }
}
