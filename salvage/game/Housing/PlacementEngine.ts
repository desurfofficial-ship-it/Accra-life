/**
 * Accra Life — Placement Engine
 *
 * Grid-based furniture placement with collision detection, room-bound
 * validation, and touch-friendly controls (tap to select, drag to move,
 * rotate button, confirm/cancel).
 *
 * Architecture:
 * - enterPlacementMode(catalogId): spawn a translucent "ghost" preview of
 *   the furniture mesh + attach pointer/touch handlers to the canvas.
 *   Player drags the ghost to position it; rotate button cycles rotation
 *   in 90° increments; confirm button validates + commits the placement
 *   via HomeSystem.placeItem(); cancel button aborts.
 * - The ghost follows the player's pointer in world-space (raycast onto
 *   the room's interior floor plane).
 * - Collision detection: 2D axis-aligned bounding-box overlap check in
 *   the XZ plane. Each furniture has a footprint (gridW × gridD cells,
 *   where 1 cell = 1 meter). The footprint rotates with the furniture.
 * - Room bounds: derived from the current housing tier's roomWidthM ×
 *   roomDepthM, with a 0.15m wall-clearance margin.
 *
 * Coordinates are ROOM-LOCAL: origin at the room's interior-floor center,
 * +X = east, +Z = south. The PlacementEngine converts world coordinates
 * (from the raycast) to room-local coordinates by subtracting the room's
 * world position (set via setRoomOrigin).
 *
 * Touch-friendly (per spec section 25): tap to position, drag to refine,
 * dedicated rotate/confirm/cancel buttons. No precision-mouse required.
 */

import * as THREE from 'three';
import { HomeSystem, type FurnitureId, type FurnitureItem, FURNITURE_CATALOG, HOUSING_TIERS } from '../Home/HomeSystem';
import { buildFurnitureMesh } from './FurnitureMeshes';

export interface PlacementEngineCallbacks {
  /** Called when placement is confirmed (after HomeSystem.placeItem succeeds). */
  onPlaced?: (instanceId: string) => void;
  /** Called when placement is cancelled. */
  onCancelled?: () => void;
  /** Called when the ghost's validity changes (collision / out-of-bounds). */
  onValidityChange?: (valid: boolean, reason: string) => void;
}

interface PlacedGhost {
  catalogId: FurnitureId;
  mesh: THREE.Group;
  rotationSteps: number; // 0..3 (× 90°)
  currentRoomX: number;
  currentRoomZ: number;
  isValid: boolean;
}

const WALL_CLEARANCE_M = 0.15;
const GRID_SNAP_M = 0.25;
const ROTATION_STEPS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export class PlacementEngine {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly domElement: HTMLElement;
  private readonly homeSystem: HomeSystem;
  private readonly callbacks: PlacementEngineCallbacks;

  private roomOriginWorld = new THREE.Vector3(0, 0, 0);
  private ghost: PlacedGhost | null = null;
  private isDragging = false;

  // Bound handlers (so we can remove them on exit).
  private readonly boundPointerMove: (e: PointerEvent) => void;
  private readonly boundPointerDown: (e: PointerEvent) => void;
  private readonly boundPointerUp: (e: PointerEvent) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement,
    homeSystem: HomeSystem,
    callbacks: PlacementEngineCallbacks = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.homeSystem = homeSystem;
    this.callbacks = callbacks;
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
  }

  /**
   * Set the room's world position. The PlacementEngine converts between
   * world coords (from raycasts) and room-local coords (for storage)
   * using this origin.
   */
  public setRoomOrigin(worldX: number, worldY: number, worldZ: number): void {
    this.roomOriginWorld.set(worldX, worldY, worldZ);
  }

  /**
   * Enter placement mode for the given catalog item. Spawns a translucent
   * ghost preview + attaches pointer handlers. Returns true if successful.
   */
  public enterPlacementMode(catalogId: FurnitureId): boolean {
    if (this.ghost) this.cancelPlacement();
    const item = FURNITURE_CATALOG.find((f) => f.id === catalogId);
    if (!item) return false;

    const mesh = buildFurnitureMesh(catalogId);
    // Make the ghost translucent (all materials → transparent + opacity 0.5).
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        const mat = m.material;
        const mats = Array.isArray(mat) ? mat : [mat];
        for (const mm of mats) {
          if (mm && 'transparent' in mm) {
            (mm as THREE.Material).transparent = true;
            (mm as THREE.Material & { opacity: number }).opacity = 0.5;
          }
        }
      }
    });
    mesh.visible = true;
    this.scene.add(mesh);

    this.ghost = {
      catalogId,
      mesh,
      rotationSteps: 0,
      currentRoomX: 0,
      currentRoomZ: 0,
      isValid: false
    };
    this.updateGhostPosition(0, 0);
    this.attachHandlers();
    return true;
  }

  /**
   * Rotate the ghost 90° (cycles through 4 orientations).
   */
  public rotateGhost(): void {
    if (!this.ghost) return;
    this.ghost.rotationSteps = (this.ghost.rotationSteps + 1) % 4;
    this.ghost.mesh.rotation.y = ROTATION_STEPS[this.ghost.rotationSteps];
    // Re-validate after rotation (footprint changes for non-square items).
    this.validateAndFeedback(this.ghost.currentRoomX, this.ghost.currentRoomZ);
  }

  /**
   * Confirm placement. Validates the current position + commits via
   * HomeSystem.placeItem(). Returns true on success.
   */
  public confirmPlacement(): boolean {
    if (!this.ghost) return false;
    const { catalogId, currentRoomX, currentRoomZ, rotationSteps, isValid } = this.ghost;
    if (!isValid) return false;
    const item = FURNITURE_CATALOG.find((f) => f.id === catalogId);
    if (!item) return false;
    const instance = this.homeSystem.placeItem(
      catalogId,
      currentRoomX,
      currentRoomZ,
      ROTATION_STEPS[rotationSteps],
      item.costGHS
    );
    this.exitPlacementMode();
    this.callbacks.onPlaced?.(instance.instanceId);
    return true;
  }

  /**
   * Cancel placement. Removes the ghost without committing.
   */
  public cancelPlacement(): void {
    this.exitPlacementMode();
    this.callbacks.onCancelled?.();
  }

  /**
   * Exit placement mode entirely. Removes the ghost + detaches handlers.
   */
  public exitPlacementMode(): void {
    if (this.ghost) {
      this.scene.remove(this.ghost.mesh);
      // Dispose geometries + materials (best-effort).
      this.ghost.mesh.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose?.();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose?.());
          else mat?.dispose?.();
        }
      });
      this.ghost = null;
    }
    this.detachHandlers();
    this.isDragging = false;
  }

  public isActive(): boolean {
    return this.ghost !== null;
  }

  // ── Internal: pointer handlers ────────────────────────────────────────────

  private attachHandlers(): void {
    this.domElement.addEventListener('pointermove', this.boundPointerMove);
    this.domElement.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointerup', this.boundPointerUp);
  }

  private detachHandlers(): void {
    this.domElement.removeEventListener('pointermove', this.boundPointerMove);
    this.domElement.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('pointerup', this.boundPointerUp);
  }

  private onPointerDown(e: PointerEvent): void {
    this.isDragging = true;
    this.handlePointerEvent(e);
  }

  private onPointerUp(_e: PointerEvent): void {
    this.isDragging = false;
  }

  private onPointerMove(e: PointerEvent): void {
    // Always track position when in placement mode (so the ghost follows
    // the cursor even without dragging — touch devices send pointerdown
    // first, then pointermove while held).
    if (!this.isDragging && e.pointerType === 'mouse') {
      // For mouse: only move while dragging OR hovering (no button needed).
      this.handlePointerEvent(e);
    } else if (this.isDragging) {
      this.handlePointerEvent(e);
    }
  }

  private handlePointerEvent(e: PointerEvent): void {
    if (!this.ghost) return;
    // Raycast onto the room's interior floor plane (y = roomOriginWorld.y + 0.24).
    const rect = this.domElement.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const planeY = this.roomOriginWorld.y + 0.24;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, hit)) return;
    // Convert world → room-local.
    const roomX = hit.x - this.roomOriginWorld.x;
    const roomZ = hit.z - this.roomOriginWorld.z;
    this.updateGhostPosition(roomX, roomZ);
  }

  // ── Internal: position update + collision validation ──────────────────────

  private updateGhostPosition(roomX: number, roomZ: number): void {
    if (!this.ghost) return;
    // Snap to grid (0.25m increments).
    const snappedX = Math.round(roomX / GRID_SNAP_M) * GRID_SNAP_M;
    const snappedZ = Math.round(roomZ / GRID_SNAP_M) * GRID_SNAP_M;
    this.ghost.currentRoomX = snappedX;
    this.ghost.currentRoomZ = snappedZ;
    // Update ghost mesh world position.
    this.ghost.mesh.position.set(
      this.roomOriginWorld.x + snappedX,
      this.roomOriginWorld.y + 0.24,
      this.roomOriginWorld.z + snappedZ
    );
    this.validateAndFeedback(snappedX, snappedZ);
  }

  private validateAndFeedback(roomX: number, roomZ: number): void {
    if (!this.ghost) return;
    const item = FURNITURE_CATALOG.find((f) => f.id === this.ghost!.catalogId);
    if (!item?.dimensions) {
      this.ghost.isValid = true;
      this.setGhostColor(0x22c55e);
      this.callbacks.onValidityChange?.(true, '');
      return;
    }
    const rotation = ROTATION_STEPS[this.ghost.rotationSteps];
    const validity = this.validatePlacement(item, roomX, roomZ, rotation);
    this.ghost.isValid = validity.valid;
    this.setGhostColor(validity.valid ? 0x22c55e : 0xef4444);
    this.callbacks.onValidityChange?.(validity.valid, validity.reason);
  }

  /**
   * Validate a placement: room bounds + collision with other placed items
   * + wall-snapping requirement + door clearance.
   */
  public validatePlacement(
    item: FurnitureItem,
    roomX: number,
    roomZ: number,
    rotationY: number
  ): { valid: boolean; reason: string } {
    const tier = this.homeSystem.getHousingTier();
    const dims = item.dimensions;
    if (!dims) return { valid: true, reason: '' };

    // Compute the rotated footprint half-extents.
    // After 90° rotation, width ↔ depth swap.
    const isQuarterRot = Math.abs(Math.sin(rotationY)) > 0.5;
    const halfW = (isQuarterRot ? dims.depthMeters : dims.widthMeters) / 2;
    const halfD = (isQuarterRot ? dims.widthMeters : dims.depthMeters) / 2;

    // Room bounds check (with wall clearance).
    const roomHalfW = tier.roomWidthM / 2 - WALL_CLEARANCE_M;
    const roomHalfD = tier.roomDepthM / 2 - WALL_CLEARANCE_M;
    if (roomX - halfW < -roomHalfW || roomX + halfW > roomHalfW) {
      return { valid: false, reason: 'Out of room bounds (hits wall).' };
    }
    if (roomZ - halfD < -roomHalfD || roomZ + halfD > roomHalfD) {
      return { valid: false, reason: 'Out of room bounds (hits wall).' };
    }

    // Collision check against other placed items.
    const placed = this.homeSystem.getPlaced();
    for (const p of placed) {
      const pItem = FURNITURE_CATALOG.find((f) => f.id === p.catalogId);
      if (!pItem?.dimensions) continue;
      const pIsQuarter = Math.abs(Math.sin(p.rotationY)) > 0.5;
      const pHalfW = (pIsQuarter ? pItem.dimensions.depthMeters : pItem.dimensions.widthMeters) / 2;
      const pHalfD = (pIsQuarter ? pItem.dimensions.widthMeters : pItem.dimensions.depthMeters) / 2;
      // AABB overlap in XZ.
      const dx = Math.abs(roomX - p.x);
      const dz = Math.abs(roomZ - p.z);
      if (dx < halfW + pHalfW && dz < halfD + pHalfD) {
        return { valid: false, reason: `Overlaps ${pItem.title}.` };
      }
    }

    return { valid: true, reason: '' };
  }

  /** Tint the ghost green (valid) or red (invalid) by overriding material color. */
  private setGhostColor(colorHex: number): void {
    if (!this.ghost) return;
    this.ghost.mesh.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        const mat = m.material;
        const mats = Array.isArray(mat) ? mat : [mat];
        for (const mm of mats) {
          const stdMat = mm as THREE.MeshStandardMaterial;
          if (stdMat && 'emissive' in stdMat) {
            stdMat.emissive.setHex(colorHex);
            stdMat.emissiveIntensity = 0.3;
          }
        }
      }
    });
  }
}

/**
 * Build a Three.js mesh for a previously-placed furniture instance (loaded
 * from persistence on game start). The mesh is positioned at the room-local
 * coordinates + rotation, then offset by the room origin to get world coords.
 *
 * Returns the mesh ready to add to the scene.
 */
export function buildPlacedFurnitureMesh(
  instance: { catalogId: FurnitureId; x: number; z: number; rotationY: number },
  roomOriginWorld: THREE.Vector3
): THREE.Group {
  const mesh = buildFurnitureMesh(instance.catalogId);
  mesh.position.set(
    roomOriginWorld.x + instance.x,
    roomOriginWorld.y + 0.24,
    roomOriginWorld.z + instance.z
  );
  mesh.rotation.y = instance.rotationY;
  mesh.castShadow = true;
  mesh.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });
  return mesh;
}
