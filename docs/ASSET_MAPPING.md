# Accra Life — Asset Mapping (Master Reference)

`version: 1.1.0` · `updated: 2026-10-08` · `maintainer: every agent that
touches visuals`

This document maps **every game object to its asset file path**. It is the
single place an agent checks before touching anything visual. The
provenance/licensing ledger is [`assets/registry.json`](../assets/registry.json)
(strategy + approved sources); the skill-layer contracts quote the same
paths in their `[ASSETS]` sections
([`skills/tro-tro-system.md`](../skills/tro-tro-system.md) v4.10,
[`skills/vendor-system.md`](../skills/vendor-system.md) v1.1).

## The rules (read before ANY visual work)

1. **Check this map first.** If an object appears in a table below with a
   real model, you MUST use that model. Never revert a mapped model back
   to a box, capsule or untextured cube.
2. **Never invent an asset path.** If a path is not in this document (or
   in the `[ASSETS]` section of the relevant skill), the file does not
   exist. Section 12 lists paths that are RESERVED but must NOT be
   referenced yet.
3. **Order of record for new assets**: verify license → save the file →
   register in `assets/registry.json` → add a row here → only then wire
   the loader in `src/`. An unregistered model in `src/` is a bug.
4. **Fallbacks are fallbacks.** Procedural components that exist as
   Suspense fallbacks (e.g. `ProceduralVan`) must never become the
   primary visual.

## How assets load (repo conventions)

- Files live under `public/assets/…` and are served at URL `/assets/…`
  (Vite serves `public/` at the root — the URL and the repo path differ
  by exactly the `public` prefix).
- **GLB/GLTF** → `useGLTF` from `@react-three/drei` inside `<Suspense>`,
  cloned via `scene.clone(true)`, then a `traverse` sets
  `castShadow`/`receiveShadow` on every mesh. Module-scope
  `useGLTF.preload(...)` warms the cache for small/critical models.
- **FBX** → `useLoader(FBXLoader, url)` (`CityTrees.tsx`,
  `LandscapeProps.tsx`).
- **OBJ** → `useLoader(MTLLoader, …)` + `useLoader(OBJLoader, …)`
  (`SuburbHouses.tsx`, `LandscapeProps.tsx`).
- Oversized packs are **Box3-fitted at load** instead of hand-tuned
  (ResidentialShowroom fits to an 11 m footprint; InteriorFurniture fits
  the furniture lineups to 7/10/6 m) — measure, never guess.
- Per-model scale tables beat magic numbers (`VAN_SCALES` in
  `LivingTrotro.tsx`).
- Placement uses `cellCenter(row, col)` from `AccraCityGrid.tsx`
  (5×5 grid, 12 m cells, 4 m roads, 84 m total). Reserved cells
  `AccraCityGrid.RESERVED_CELLS` (`'2,0'`, `'3,1'`) skip generic district
  buildings so landmarks never intersect.
- World constants: 1 unit = 1 m, +Y up, scene background `#dcebfa`,
  fog `FogExp2(0xdcebfa, 0.012)`.

## Grid quick reference (districts → cells used by assets)

| District | Cells with mapped assets | What sits there |
|---|---|---|
| Adabraka | `[0,0]`, `[1,0]` | suburb houses, furniture lineup packs, house/apartment GLBs |
| Makola Market | `[1,1]`, `[2,2]` + vendor stand (cell `[2,1]` NE corner, world [-12.6, 2.6]) | food stall GLBs, vendor water bottle, the procedural vendor stand |
| Circle | station cell `{x:2, z:3}` (world [0, 16]) | the LivingTrotro van, stop shelter |
| Osu | `[3,3]` | cinema seat GLB |
| Labadi | `[4,0]`, `[4,1]` | beach GLBs + farm FBX |
| Mixed | `[2,4]`, `[0,3]` | office GLBs + office OBJ buildings |
| Community | `[3,1]` (reserved) | residential showroom diorama |
| Home | `[2,0]` (reserved) | procedural compound (HomeCompound) |

`src/game/World/GridMap.ts` is the canonical cell/anchor source — this
table is a reading aid, not the authority.

---

## 1. Vehicles (GLB)

| Game object | Asset file (URL) | Size | Loaded by | Placement / notes |
|---|---|---|---|---|
| **Trotro van ACC_TROTRO_001 (PRIMARY)** | `/assets/glb/vehicles/small_van.glb` | 2.7 MB | `LivingTrotro.tsx` `GLBVan` (useGLTF) | Station cell; scale 0.5; tinted MTN yellow `#f59e0b`; door mesh auto-detected by name (`door`/`slide`/`passenger`), swung open in IDLE_AT_STOP/BOARDING; preloaded |
| Trotro van alt variant | `/assets/glb/vehicles/european_delivery_van.glb` | 35 MB | same, `vanModel="european_delivery_van"` | on-demand only (NOT preloaded); scale 0.3 |
| Trotro van alt variant | `/assets/glb/vehicles/retro_anime_vintage_volkswagen_van.glb` | 2.6 MB | same, `vanModel="retro_vw"` | scale 0.4; preloaded |
| Van loading fallback | — procedural — | — | `LivingTrotro.tsx` `ProceduralVan` | Suspense fallback ONLY (box van, same door animation) |

## 2. Buildings & interiors (GLB)

All placed by `BuildingAssets.tsx` (useGLTF + Suspense, cast/receive
shadow, per-model scale):

| Game object | Asset file (URL) | Size | Placement | Scale |
|---|---|---|---|---|
| Adabraka residential exterior | `/assets/glb/buildings/house_exterior.glb` | 373 KB | Adabraka `[0,0]` offset (−3, 0, +3), rot 0.5 | 0.4 |
| Apartment interior furniture | `/assets/glb/interior/room_apartment_furniture.glb` | 9 MB | Adabraka `[0,0]` offset (+1, 0, −2), rot −0.3 | 0.3 |
| Bathroom fixtures | `/assets/glb/interior/room_bathroom.glb` | 484 KB | Adabraka `[0,0]` offset (+4, 0, +1), rot 1.2 | 0.25 |
| 1st-floor interior | `/assets/glb/interior/house_1f_interior.glb` | 6.7 MB | Adabraka `[1,0]` center | 0.3 |
| Office window room | `/assets/glb/buildings/building_office_room_window.glb` | 7.3 MB | Mixed `[2,4]` center, rot 0.5 | 0.35 |
| Office curtain room | `/assets/glb/buildings/building_office_room_curtain.glb` | 7.3 MB | Mixed `[0,3]` center, rot −0.3 | 0.35 |
| Cinema/theater seat | `/assets/glb/interior/cinemamovie_theater_seat.glb` | 419 KB | Osu `[3,3]` offset (−1, 0, +2), rot 1.5 | 0.4 |

Preloads (module scope): `plastic_water_bottle.glb`,
`house_exterior.glb`.

## 3. Market & food (GLB)

| Game object | Asset file (URL) | Loaded by | Placement / notes |
|---|---|---|---|
| Makola stall produce (9 items: banana, apple, bread, beet, avocado, barrel, bowl, bottle-ketchup, bag) | `/assets/glb/food/{file}.glb` | `MarketStalls.tsx` | 2 stalls × 9 items at cells `[1,1]` + `[2,2]`, on procedural `StallTable`s; per-item scale 0.6–0.8; all 9 preloaded |
| Food GLB texture dependency | `/assets/glb/food/Textures/colormap.png` | referenced internally by every food GLB | ships with the pack — if the folder moves, every food model 404s its only texture silently (fixed once already, v4.4) |
| Vendor water bottle | `/assets/glb/props/plastic_water_bottle.glb` | `BuildingAssets.tsx` | Makola `[1,1]` offset (+2, 0.8, −1), rot 0.8, scale 0.5; preloaded |

The **vendor stand itself is procedural** (`LivingVendor.tsx` — wooden
table, tomato spheres, yam cylinders, crate, umbrella pole; the [E]
prompt/bubble/shift bar are DOM overlays). No vendor-stall GLB exists
yet — see section 12.

## 4. Furniture packs (GLB)

Placed by `InteriorFurniture.tsx` as auto-fitted yard lineups
(Box3-measured, NOT fixed scales):

| Game object | Asset file (URL) | Placement | Fitted to |
|---|---|---|---|
| Furniture set | `/assets/glb/furniture/furniture_set.glb` | Adabraka `[0,0]` offset (−1, 0, +3), rot 0.3 | 7 m |
| Furniture (assorted) | `/assets/glb/furniture/some_furniture.glb` | Adabraka `[1,0]` offset (+1, 0, −2), rot −0.5 | 10 m |
| Chair/table/wardrobe/suitcase set | `/assets/glb/furniture/chair_table_wardrobe_suitcase_furniture.glb` | Adabraka `[0,0]` offset (+3, 0, −1), rot 1.2 | 6 m |

`some_furniture.glb` is preloaded. Present-but-unmapped furniture GLBs:
`indian_furniture.glb`, `living_room_furniture_-_one_colour.glb` (section
13).

## 5. Beach — Labadi (GLB)

Placed by `BeachProps.tsx`:

| Game object | Asset file (URL) | Placement | Scale |
|---|---|---|---|
| Beach ball | `/assets/glb/beach/beach_ball.glb` | Labadi `[4,0]` offset (+1, 0.5, 0) | 0.5 |
| Beach table | `/assets/glb/beach/beach_table.glb` | Labadi `[4,0]` offset (−2, 0, +1), rot 0.5 | 0.6 |
| Beach kit | `/assets/glb/beach/beach_kit.glb` | Labadi `[4,1]` offset (−1, 0, 0) | 0.5 |
| Beach reef | `/assets/glb/beach/beach_reef.glb` | Labadi `[4,1]` offset (+2, 0, +2) | 0.4 |

## 6. Landscape — trees, farm, offices

| Game object | Asset file (URL) | Loaded by | Placement / notes |
|---|---|---|---|
| Street trees (5 variants) | `/assets/fbx/trees/Tree_temp_climate_001/003/005/007/009.FBX` | `CityTrees.tsx` (`FBXLoader`) | deterministic `srand` placement along road edges (grid lines 0–5), scale 0.015–0.025, random Y-rotation |
| Roadside bushes (3 variants) | `/assets/fbx/trees/Bush_temp_climate_001/003/005.fbx` | same | seeded clusters near the first 12 trees |
| Farm building | `/assets/fbx/farm/farm2_textured.FBX` (+ `FarmDiffuseMap.png`) | `LandscapeProps.tsx` | Labadi `[4,1]` center, rot 0.8, scale 0.02 |
| Small office building (2×) | `/assets/obj/landscape/building-office-small.obj` + `.mtl` | `LandscapeProps.tsx` (`OBJLoader`+`MTLLoader`) | Mixed `[2,4]` (scale 0.3, rot 0.5) + Mixed `[0,3]` (scale 0.25, rot −0.3) |

## 7. Suburb houses (OBJ + MTL)

Placed by `SuburbHouses.tsx` (`OBJLoader` + `MTLLoader`, seeded
rotations):

| Game object | Asset file (URL) | Placement | Scale |
|---|---|---|---|
| Small house | `/assets/obj/houses/house-small.obj` + `.mtl` | Adabraka `[0,0]` offset (−3, 0, −2) | 0.35 |
| Mid house | `/assets/obj/houses/house-mid.obj` + `.mtl` | Adabraka `[0,0]` offset (+2, 0, −1) | 0.35 |
| Gas station | `/assets/obj/houses/gas-station.obj` + `.mtl` | Adabraka `[0,0]` offset (+3, 0, +3) | 0.3 |
| Modern house | `/assets/obj/houses/house-modern.obj` + `.mtl` | Adabraka `[1,0]` offset (−2, 0, 0) | 0.3 |
| Luxurious house | `/assets/obj/houses/house-luxurious.obj` + `.mtl` | Adabraka `[1,0]` offset (+2, 0, +2) | 0.28 |

Present-but-unmapped house OBJs: `house-country`, `house-hill-normal`,
`house-hill-small` (section 13).

## 8. Residential showroom (GLTF + attribution REQUIRED)

| Game object | Asset file (URL) | Loaded by | Placement / notes |
|---|---|---|---|
| "Residential Furniture" model-home diorama | `/assets/glb/residential/scene.gltf` + `scene.bin` (~50 MB) + `license.txt` | `ResidentialShowroom.tsx` (useGLTF, Suspense) | reserved cell `[3,1]` (world [-16, 16]); bounding-box measured once, footprint auto-fit to 11 m, base at y=0 |

> **License: CC-BY-4.0.** "Residential Furniture" by ATD-London
> (https://sketchfab.com/3d-models/residential-furniture-622e5089f251459fb8fc321646432e22).
> Attribution is mandatory — the credit block lives in the
> `ResidentialShowroom.tsx` header; keep it when refactoring. Do not
> ship without it.

## 9. Characters — ALL PROCEDURAL TODAY

There are **no character GLBs in the repo**. Every human you see is
code:

| Character | Source | Notes |
|---|---|---|
| Player avatar (R3F visible) | `StreetCanvas.tsx` `PlayerAvatar` — capsule mesh | this is the capsule the roadmap wants replaced by a real person |
| Player character rig (systems layer) | `src/game/Art/CharacterBuilder.ts` `buildStylizedGhanaianCharacter()` | registry `PLAYER_GHA_001`, status production |
| NPC Kojo (male) | `CharacterBuilder.ts` | registry `NPC_MALE_001`, Osu north sidewalk |
| NPC Ama (female) | `CharacterBuilder.ts` | registry `NPC_FEMALE_001`, Osu north sidewalk |
| NPC Uncle Mensah (older) | `CharacterBuilder.ts` | registry `NPC_OLDER_001`, south sidewalk errand-giver |
| The trotro Mate (visual) | `LivingTrotro.tsx` `MateCharacter` — capsule + sphere head + yellow vest box | bob/bounce animation via useFrame; mounted only in IDLE_AT_STOP + BOARDING |
| The trotro Mate (voice) | Web Speech API (`playMateShout`, no file) | rate 1.2, pitch 0.9, volume 0.7 + `[trotro] Mate shouts:` console line |

Planned replacements are in section 12 — none of those files exist yet.

## 10. Procedural world objects (no external asset — by design)

Registered in `assets/registry.json` → `assets.procedural` (project-owned,
status production). Source files are the "asset paths":

| Game object | Registry id | Source file |
|---|---|---|
| Player compound house | `ACC_HOUSE_001` | `src/game/World/PlayerCompound.ts` (+ `src/r3f/HomeCompound.tsx`) |
| Adabraka Provisions kiosk | `ACC_SHOP_001` | `src/game/World/NeighborhoodProvision.ts` |
| Sister Akosua's Waakye Joint | `ACC_RESTAURANT_001` | `src/game/World/NeighborhoodFood.ts` |
| Trotro stop shelter + boarding pad | `ACC_PROP_001` | `src/game/World/NeighborhoodTrotro.ts` |
| Roadside gutters/sidewalks/crossovers | `ENV_DRAIN_001` | `src/game/World/NeighborhoodGutters.ts` |
| Road, lane markings, bollards | `ENV_NEIGHBORHOOD_BLOCK` | `src/game/World/NeighborhoodBlock.ts` |
| Utility pole + cables | `ENV_UTILITY_POLE` | `src/game/World/NeighborhoodStreet.ts` |
| Shade trees (procedural set) | `ENV_SHADE_TREE` | `src/game/World/NeighborhoodStreet.ts` |
| MoMo umbrella (MTN-yellow booth) | `ACC_MOMO_UMBRELLA` | `src/game/World/NeighborhoodExtras.ts` |
| Market hawker table | `ACC_HAWKER_TABLE` | `src/game/World/NeighborhoodExtras.ts` |
| Cool chest | `ACC_COOL_CHEST` | `src/game/World/NeighborhoodExtras.ts` |
| Susu collection kiosk | `ACC_SUSU_KIOSK` | `src/game/World/NeighborhoodExtras.ts` |
| Concrete park bench | `ACC_PARK_BENCH` | `src/game/World/NeighborhoodExtras.ts` |
| Chale Wote graffiti panel | `ACC_CHALE_WOTE_PANEL` | `src/game/World/NeighborhoodExtras.ts` |
| Billboard gantry | `ACC_BILLBOARD_GANTRY` | `src/game/World/NeighborhoodExtras.ts` |
| Makola vendor stand (visible) | — (not yet registered) | `src/r3f/LivingVendor.tsx` |
| Tro-tro stop sign (R3F) | — | `src/r3f/TroTroStop.tsx` |
| Stall tables (market) | — | `src/r3f/MarketStalls.tsx` `StallTable` |
| Generic district buildings/landmarks | — | `src/r3f/AccraCityGrid.tsx` `Cell` (deterministic per-cell generation; skipped on RESERVED_CELLS) |

## 11. World audio (no files)

| Sound | Implementation |
|---|---|
| Mate shouts | Web Speech API — `LivingTrotro.tsx` `playMateShout()` |
| Vendor sale chime | WebAudio oscillator — `LivingVendor.tsx` |
| Boarding/transit feedback | console + DOM beats (no audio files yet) |

Ambient soundscape (trotro horns, market chatter, street music) is the
next polish layer — when it lands, audio files go under
`public/assets/audio/…` and get a section here.

## 12. PLANNED / RESERVED paths — DO NOT REFERENCE YET

These paths appear in code comments or the registry roadmap but **the
files do not exist**. An agent that loads them gets a 404 and a broken
visual. Listed so nobody "discovers" them and ships the reference:

| Reserved path | Intended for | Where it appears |
|---|---|---|
| `/assets/glb/trotro_van.glb` | dedicated Accra trotro van GLB | `TrotroService.ts` `loadTrotroAssets()` comment (`vanModelUrl = null`) |
| `/assets/glb/trotro_mate.glb` | Mate character GLB | `TrotroService.ts` `loadTrotroAssets()` comment (`mateModelUrl = null`) |
| `assets/accra/vehicles/*.glb` | hand-crafted Accra trotro art (route-board, scratched paint) | registry roadmap step 3 (`trotro-001.glb` target name) |
| `assets/accra/buildings/*` | hand-crafted shopfronts replacing provisions/waakye/compound | registry roadmap step 4 |
| `assets/accra/landmarks/*` | Black Star Square, Jamestown Lighthouse, Nkrumah Mausoleum | registry roadmap step 5 |
| `assets/accra/props/*` | hand-crafted MoMo umbrella, hawker table, vendor stall, stop sign | registry `categories.props` + directory layout |
| `assets/accra/characters/*` | production character art replacing procedural rigs | registry `categories.characters` |
| `assets/accra/food/*` | waakye pots, kelewele pans, sachet water racks | registry `categories.food` |
| `src/game/Art/ExternalAssetLoader.ts` | future unified loader | registry workflow step 4 (TBD) |

When one of these lands: registry entry → row in this document → wire
the loader → QA. In that order.

## 13. Present but UNMAPPED (shipped files with no current loader)

These ride along in `public/assets/` but nothing in `src/` loads them.
They are fair-game inventory for future work — add a mapping row before
wiring:

| Pack | Files | Notes |
|---|---|---|
| Food GLBs | ~200 models in `public/assets/glb/food/` (only the 9 in section 3 are wired) | all depend on `Textures/colormap.png` |
| Furniture GLBs | `indian_furniture.glb`, `living_room_furniture_-_one_colour.glb` | same family as the wired three |
| House OBJs | `house-country`, `house-hill-normal`, `house-hill-small` (`.obj`+`.mtl`) | same family as the wired five |
| Road OBJs | `public/assets/obj/roads/` | not referenced anywhere in `src/` |
| Tree/bush FBX full set | 21 trees + 13 bushes in `public/assets/fbx/trees/` (5+3 wired) | seeded placement can take more variants for free |

### FIXED 2026-10-08: texture 404s on boot (was: 2 per boot, cosmetic)

The OBJ packs' MTL files referenced texture images that were **never
committed** (`/obj/houses/textures/buildings-houses_v1.jpg` via `map_Kd`
in every `public/assets/obj/houses/*.mtl`, and `/obj/textures/basetexture.jpg`
via `public/assets/obj/landscape/building-office-small.mtl`). Three.js fell
back to the MTL's flat Kd color, so the houses/offices rendered
untextured-but-colored — no crash, but the browser console showed two 404s
each boot.

**Resolution (v4.11):** the dead `map_Kd` lines were stripped from all 15
affected MTLs (16 references), so boots are now 404-free. Materials render
their Kd diffuse color — visually identical to the previous fallback.

**Resurrection targets (unchanged):** if the art pass lands the real
textures, commit the JPEGs at the two paths above and re-add one
`map_Kd <relative-path>` line per material (house MTLs ->
`textures/buildings-houses_v1.jpg`; office MTL -> `../textures/basetexture.jpg`).
The Blender export `print_buildings-houses_v1.blend` documents the original
materials.

## 14. Licensing summary

| Asset set | License | Attribution |
|---|---|---|
| Procedural world + characters | project-owned | — |
| Van GLBs, food/furniture/beach/props GLBs, tree/farm FBX, house/office OBJ | shipped with repo — verify pack README/licenses before commercial release | record new findings in `assets/registry.json` |
| Residential showroom | **CC-BY-4.0** — ATD-London | REQUIRED — credit in `ResidentialShowroom.tsx` header + `license.txt` ships beside the model |
| Approved sources policy | CC0 preferred (Kenney / OpenGameArt / itch) | see `assets/README.md` priority table |

## 15. QA checklist for any visual change

1. `tsc` passes (`bunx tsc --noEmit` or the repo's check script).
2. Build serves without 404s: every `/assets/…` URL referenced in the
   diff resolves to a file under `public/`.
3. The affected object still renders with its mapped model (screenshot
   QA against the tables above — a box where a GLB belongs is a FAIL).
4. Interactions still work with the real model in place (GTA [E] prompt,
   boarding at the station, vendor shift at Makola).
5. Registry row added/updated (`assets/registry.json`), mapping row
   added/updated (this file), skill `[ASSETS]` section touched if the
   object is under a skill contract.
