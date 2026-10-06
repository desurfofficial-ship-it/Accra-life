# Accra Life — Housing Architecture & Persistence Schema

**Version:** 1.0 (Phase-1 vertical slice)
**Last updated:** 2026-10-07
**Scope:** Database + local persistence schema for player room layouts, furniture instances, and item states.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Player Browser (client)                     │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐ │
│  │ HomeSystem  │←──→│ Placement    │←──→│ FurnitureMeshes    │ │
│  │ (state +   │    │ Engine       │    │ (procedural geo)   │ │
│  │  persistence)│   │ (grid +     │    │                    │ │
│  │             │    │  collision)  │    │ Future: GLB loader │ │
│  └──────┬──────┘    └──────────────┘    └────────────────────┘ │
│         │                                                       │
│         │ localStorage (chale_life_home_v3)                     │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Wallet.saveToFirebase()                                 │   │
│  │   writes to Firestore /players/{uid}                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ (HTTPS)
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase Firestore (server)                  │
│                                                                 │
│  /players/{uid}                                                 │
│    ├── ownerId: string (== uid, immutable)                      │
│    ├── playerId: string                                         │
│    ├── displayName: string                                      │
│    ├── state: { wallet: SerializedWalletState }                 │
│    ├── phase3Economy: PersistedPhase3EconomySnapshot            │
│    ├── placedFurniture: PlacedFurnitureInstance[]   ← NEW      │
│    ├── housingTier: HousingTierId                   ← NEW      │
│    ├── unlockedTiers: HousingTierId[]               ← NEW      │
│    ├── owned: FurnitureId[]                                   │
│    └── updatedAt: serverTimestamp()                             │
│                                                                 │
│  /profiles/{uid}                                                │
│    ├── ownerId, displayName, day, career, money, location      │
│    └── updatedAt: serverTimestamp()                             │
└─────────────────────────────────────────────────────────────────┘
```

## Local Persistence Schema (localStorage)

**Key:** `chale_life_home_v3` (bumped from v2 to add `placed[]`)

**Value (JSON):**
```typescript
interface HomeState {
  housingTier: HousingTierId;        // 'single_room' | 'chamber_kitchen_bath' | ...
  unlockedTiers: HousingTierId[];   // e.g. ['single_room', 'chamber_kitchen_bath']
  owned: FurnitureId[];             // e.g. ['bed_basic', 'chair_plastic', ...]
  placed: PlacedFurnitureInstance[]; // NEW: placed-furniture instances with positions
}

interface PlacedFurnitureInstance {
  instanceId: string;       // e.g. 'furn_1696684800000_1' (timestamp + counter)
  catalogId: FurnitureId;   // e.g. 'bed_basic' (references FURNITURE_CATALOG)
  x: number;                // Room-local X (meters, center of footprint)
  z: number;                // Room-local Z (meters, center of footprint)
  rotationY: number;        // Radians (0 = facing +Z/south, π/2 = facing +X/east)
  placementState: 'placing' | 'placed';  // 'placed' = locked in
  purchasePrice: number;    // Price paid (for resale value calculation)
}
```

**Backward compatibility:** The `load()` method tries v3 first, then falls back to v2, then v1. Older snapshots without `placed[]` load fine (placed defaults to empty array).

## Cloud Persistence Schema (Firestore)

**Path:** `/players/{uid}`

**Document fields (extended from existing schema):**

```typescript
{
  // ── Existing fields (preserved) ──
  ownerId: string;                    // == request.auth.uid (enforced by rules)
  playerId: string;                   // 'accra_' + uid
  displayName: string;
  state: { wallet: SerializedWalletState };
  phase3Economy: PersistedPhase3EconomySnapshot;
  hunger: number; energy: number; fun: number; social: number; hygiene: number; bladder: number;
  updatedAt: serverTimestamp();

  // ── NEW: Housing fields (Phase-1) ──
  housingTier: HousingTierId;                   // e.g. 'single_room'
  unlockedTiers: HousingTierId[];               // e.g. ['single_room', 'chamber_kitchen_bath']
  owned: FurnitureId[];                         // e.g. ['bed_basic', 'chair_plastic']
  placedFurniture: PlacedFurnitureInstance[];   // NEW: placed instances with positions
}
```

**Firestore rules (firestore.rules):**

The `/players/{uid}` schema's `hasOnly` set needs to be extended to include `housingTier`, `unlockedTiers`, `owned`, `placedFurniture`. Currently the rules allow: `ownerId, playerId, createdAt, updatedAt, displayName, name, career, location, day, time, money, hunger, energy, fun, social, hygiene, bladder, amaAffinity, ..., recentLogs, phase3Economy, state`.

**TODO (next slice):** Add `housingTier`, `unlockedTiers`, `owned`, `placedFurniture` to the `hasOnly` set in `firestore.rules` + add type/bounds validation for each. For now, the cloud sync writes via `Wallet.saveToFirebase()` which uses `setDoc({ merge: true })` — the new fields will be silently rejected by the rules until the schema is extended. The local persistence (localStorage) works fully.

## Coordinate System

**Room-local coordinates** (used in `PlacedFurnitureInstance.x` and `.z`):

- **Origin:** room's interior-floor center (world position set via `PlacementEngine.setRoomOrigin()`)
- **+X:** east (room's right when looking south)
- **+Y:** up (floor at y=0)
- **+Z:** south (toward the door, away from the back wall)
- **Rotation:** 0 radians = facing +Z (south); π/2 = facing +X (east)

**World coordinates** (Three.js scene):

- The compound is at world `(-10.5, 0, 12.2)`.
- The interior floor is at `y = 0.24` (per `PlayerCompound.ts`).
- The room origin (for placement) is at `(-10.5, 0.24, 11.1)` — slightly south of the compound group's position because the interior is offset.

**Conversion:** `worldX = roomOrigin.x + roomLocalX`; `worldZ = roomOrigin.z + roomLocalZ`.

## Grid + Collision System

**Grid size:** 0.25m (quarter-meter snap for fine control).

**Footprint:** Each furniture item has a `dimensions.gridWidth × dimensions.gridDepth` footprint (in 1m cells). Most items are 1×1; the dining table is 2×1; the bed is 1×2.

**Collision detection:** 2D axis-aligned bounding-box (AABB) overlap in the XZ plane. When the furniture is rotated 90°, the footprint's width and depth swap. The `PlacementEngine.validatePlacement()` method checks:
1. **Room bounds:** the item's footprint must be within `tier.roomWidthM/2 - 0.15m` (wall clearance) and `tier.roomDepthM/2 - 0.15m`.
2. **Collision with other placed items:** AABB overlap check against all other `getPlaced()` instances.
3. **Door clearance:** TODO (future — currently no door-clearance check).
4. **Wall-snapping requirement:** items with `placementRules.requiresWallSnapping = true` (e.g. TV, wardrobe) must be placed within 0.3m of a wall. TODO (future — currently not enforced).

## Persistence Lifecycle

### 1. Purchase (buy)
```
Player clicks "Buy" in Home Store
  → HomeSystem.buy(id, canAfford, spend)
    → Wallet.spendMoney(cost)  (deducts cash)
    → owned.add(id)             (adds to owned set)
    → persist()                 (saves to localStorage v3)
    → notify()                  (fires onUpdate listeners)
  → Auto-enter placement mode
    → PlacementEngine.enterPlacementMode(id)
      → Spawns ghost mesh
      → Attaches pointer handlers
```

### 2. Place (place)
```
Player drags ghost to position + rotates
  → PlacementEngine.validatePlacement()  (real-time collision check)
  → Player clicks "Confirm"
    → PlacementEngine.confirmPlacement()
      → HomeSystem.placeItem(catalogId, x, z, rotationY, purchasePrice)
        → Creates PlacedFurnitureInstance
        → placed.push(instance)
        → persist()  (saves to localStorage v3)
        → notify()
      → Removes ghost mesh
      → onPlaced callback (hides placement HUD)
```

### 3. Persist to cloud (sync)
```
Player clicks "Sync to Firebase" in wallet diagnostic panel
  → Wallet.saveToFirebase(needsSystem.getState())
    → setDoc(/players/{uid}, {
        ownerId, displayName, state, phase3Economy,
        hunger, energy, fun, social, hygiene, bladder,
        updatedAt: serverTimestamp()
      }, { merge: true })
    → NOTE: housingTier + unlockedTiers + owned + placedFurniture
      are NOT yet written to Firestore (TODO: extend saveToFirebase)
```

### 4. Load on game start
```
Game loads
  → HomeSystem constructor
    → load()  (reads localStorage v3)
      → Restores housingTier, unlockedTiers, owned, placed[]
  → initHousingEngine(phase1)
    → For each placed instance:
      → buildPlacedFurnitureMesh(instance, roomOrigin)
      → scene.add(mesh)
    → PlacementEngine ready for new placements
```

## Server Validation (TODO — Phase 2)

Per the spec (section 23): "The server must validate: Player identity, Item existence, Item availability, Price, Currency, Balance, Unlock requirements, Property ownership, Purchase limits."

Currently, validation is client-side (via `HomeSystem.buy()` + `Wallet.spendMoney()`). This is acceptable for MVP but exploitable by a determined client. Phase 2 will:
1. Move purchase validation to a Firestore Cloud Function (or Firestore rules with `request.resource.data` checks).
2. Validate `placedFurniture` positions against room bounds + collision on the server (via a Cloud Function that reads the current `placedFurniture` array + validates the new instance).
3. Reject writes that fail validation.

## Multiplayer Boundary (section 40)

The housing system is **private to the player**. Other players cannot:
- Read `/players/{uid}` (only the owner can — enforced by `isOwner(userId)` rule)
- Modify `/players/{uid}` (only the owner can write)
- See another player's placed furniture (the `placedFurniture` array is in the private `/players/{uid}` doc)

Future Phase 6 (Social Homes) will add a **read-only public view** via `/profiles/{uid}/home/` (a separate collection with a sanitized snapshot of the player's home for visiting). Visitors can view but not modify.

## Performance Budget

Per the spec (section 31):
- **Initial load:** Only load the current property shell + player's placed furniture (not the entire catalog).
- **Store browsing:** Lightweight HTML cards with item name/price/dimensions (no 3D preview in the store — text-only for now). Future: thumbnail renders.
- **Placement:** Load the full procedural mesh only when entering placement mode (one mesh at a time).
- **Unused catalog assets:** Never loaded. The procedural meshes are generated on-demand by `buildFurnitureMesh(id)`.
- **Bundle size:** Procedural geometry adds ~0 KB to the bundle (no external GLB files). When GLB assets are ingested (Phase 5), they'll be lazy-loaded via `ExternalAssetLoader` (TBD).

## Future: External Asset Pipeline (Phase 5)

Per the spec (sections 4–14), CC0 assets from Quaternius, Kenney, Mastjie, LowPolyAssets, KayKit, and Quin will eventually replace the procedural meshes. The pipeline:

1. **License verification** → record in `assets/registry.json`
2. **Source registration** → `assets/external/{source}/`
3. **Pivot normalization** → bottom-center origin
4. **Scale normalization** → 1 unit = 1 meter
5. **Orientation** → forward = +Z, up = +Y
6. **Geometry optimization** → <1,500 triangles per asset
7. **Texture optimization** → ≤512×512 for small props, ≤1024×1024 for appliances
8. **GLB standard** → binary glTF 2.0
9. **Directory structure:**
   ```
   public/assets/housing/gltf/
     ├── structural/
     ├── bedroom/
     ├── seating/
     ├── tables/
     ├── storage/
     ├── kitchen/
     ├── bathroom/
     ├── appliances/
     ├── electronics/
     └── decor/
   ```
10. **Registry entry** with `assetPath` field pointing to the GLB.

The `FurnitureMeshes.ts` module will be replaced by an `ExternalAssetLoader` that loads GLBs by `assetPath`. The `PlacementEngine` API stays the same — only the mesh source changes.

## Testing Checklist (section 39)

- [x] **Purchase:** Player buys item → appears in `owned[]` + localStorage updated
- [x] **Ownership:** Item appears in Home Store as "OWNED"
- [x] **Placement:** Player places item → appears in `placed[]` + 3D mesh spawned
- [x] **Collision:** Invalid placement (out of bounds / overlap) → ghost turns red, confirm disabled
- [x] **Persistence (local):** Player reloads → placed furniture restored from localStorage
- [ ] **Persistence (cloud):** TODO — extend `Wallet.saveToFirebase()` to write `placedFurniture`
- [x] **Economy:** Money correctly deducted via `Wallet.spendMoney()`
- [x] **Gameplay:** `getAggregateGameplayEffects()` computes passive bonuses from placed furniture
- [ ] **Selling:** TODO — add `sellPlaced(instanceId)` that refunds 50% + removes instance
- [ ] **Property upgrade:** TODO — handle furniture during tier upgrade (move/store/transfer)
- [x] **Mobile:** Touch controls work (pointer events: pointerdown/pointermove/pointerup)
- [x] **Multiplayer boundary:** Other players cannot read/write `/players/{uid}` (Firestore rules)
