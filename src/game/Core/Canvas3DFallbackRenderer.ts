import * as THREE from 'three';

interface ProjectedBoxFace {
  points: Array<{ x: number; y: number }>;
  depth: number;
  fillStyle: string;
  strokeStyle: string;
}

/**
 * Software 3D perspective renderer using HTML5 Canvas2D.
 * Used automatically whenever WebGL / WebGL2 shader compilation is unavailable
 * or the WebGL context is lost, ensuring zero WebGL shader errors and full playability.
 */
export class Canvas3DFallbackRenderer {
  public readonly domElement: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private pixelRatio = 1;

  private readonly viewProjMatrix = new THREE.Matrix4();
  private readonly worldMatrix = new THREE.Matrix4();
  private readonly scratchCorner = new THREE.Vector3();
  private readonly scratchCenter = new THREE.Vector3();
  private readonly scratchBox = new THREE.Box3();

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
  }

  public render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    this.viewProjMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    // 1. Sky & warm horizon gradient
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#c7e2fa');
    skyGrad.addColorStop(0.55, '#dfeffc');
    skyGrad.addColorStop(1, '#d9b99b');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const faces: ProjectedBoxFace[] = [];

    scene.traverseVisible((obj) => {
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
      this.projectMeshBoundingBox(obj, bbox, baseHex, camera.position, faces);
    });

    // Painter's algorithm: sort faces back-to-front by distance to camera
    faces.sort((a, b) => b.depth - a.depth);

    for (let i = 0; i < faces.length; i++) {
      const f = faces[i];
      const pts = f.points;
      if (pts.length < 3) continue;

      this.ctx.beginPath();
      this.ctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length; j++) {
        this.ctx.lineTo(pts[j].x, pts[j].y);
      }
      this.ctx.closePath();
      this.ctx.fillStyle = f.fillStyle;
      this.ctx.fill();
      this.ctx.strokeStyle = f.strokeStyle;
      this.ctx.lineWidth = 0.65;
      this.ctx.stroke();
    }
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
    baseHex: number,
    camPos: THREE.Vector3,
    outFaces: ProjectedBoxFace[]
  ): void {
    this.worldMatrix.copy(mesh.matrixWorld);
    const min = bbox.min;
    const max = bbox.max;

    // 8 local corners
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

    const rBase = (baseHex >> 16) & 255;
    const gBase = (baseHex >> 8) & 255;
    const bBase = baseHex & 255;

    // Flat ring/ground slab optimization: if height is very thin, only render top face
    const isFlatSlab = max.y - min.y < 0.22;

    for (let f = 0; f < Canvas3DFallbackRenderer.BOX_FACES.length; f++) {
      if (isFlatSlab && f !== 4) continue;

      const faceDef = Canvas3DFallbackRenderer.BOX_FACES[f];
      const idx = faceDef.indices;

      let validVerts = 0;
      for (let k = 0; k < 4; k++) {
        if (this.screenPts[idx[k]].visible) validVerts++;
      }
      if (validVerts < 4) continue;

      // Face center in world space for accurate camera depth sorting
      this.scratchCenter
        .copy(this.corners[idx[0]])
        .add(this.corners[idx[1]])
        .add(this.corners[idx[2]])
        .add(this.corners[idx[3]])
        .multiplyScalar(0.25);

      const depth = this.scratchCenter.distanceToSquared(camPos);
      const r = Math.min(255, Math.round(rBase * faceDef.shade));
      const g = Math.min(255, Math.round(gBase * faceDef.shade));
      const b = Math.min(255, Math.round(bBase * faceDef.shade));
      const fill = `rgb(${r},${g},${b})`;

      outFaces.push({
        points: [
          { x: this.screenPts[idx[0]].x, y: this.screenPts[idx[0]].y },
          { x: this.screenPts[idx[1]].x, y: this.screenPts[idx[1]].y },
          { x: this.screenPts[idx[2]].x, y: this.screenPts[idx[2]].y },
          { x: this.screenPts[idx[3]].x, y: this.screenPts[idx[3]].y }
        ],
        depth,
        fillStyle: fill,
        strokeStyle: 'rgba(15, 23, 42, 0.14)'
      });
    }
  }
}
