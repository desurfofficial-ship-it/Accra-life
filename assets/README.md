# Accra Life — Asset Strategy

This directory is the **single source of truth** for every visual asset in
Accra Life. Every asset — procedural or external — must have an entry in
`registry.json`.

## Principle

> Use generic CC0 assets to build the system first, then replace/augment
> with culturally specific Accra art as the product develops. Do not allow
> generic asset packs to define Accra Life's visual identity. Priority:
> a playable + coherent Accra Life over an enormous asset collection.

## Approved sources (priority order)

| Source | URL | License | Preferred for |
|--------|-----|---------|----------------|
| **Kenney** | https://kenney.nl/assets | CC0 | Prototype kits — street, city, furniture, vehicles |
| **OpenGameArt** | https://opengameart.org/ | varies (CC0 / CC-BY / GPL) | Verify per-asset; prefer CC0 |
| **itch.io free/CC0** | https://itch.io/game-assets/free/tag-cc0 | CC0 (verify per-pack) | Low-poly street kits, modular storefronts |
| Sketchfab Ghana tags | https://sketchfab.com/search?q=ghana | varies | Localized references; many are non-commercial |
| Meshy AI | https://www.meshy.ai/ | AI-generated | Rapid prototyping ONLY; replace before launch |

## Workflow (for every external asset)

1. **Verify license** before incorporating (CC0 preferred for MVP).
2. **Save** the asset under `assets/external/<source>/` or `assets/accra/<category>/`.
3. **Register** the asset in `assets/registry.json` with: id, name, source, url, license, author, intended_use, status.
4. **Load** via `src/game/Art/ExternalAssetLoader.ts` (TODO — see roadmap).
5. **Normalize** scale + perspective + lighting to match the existing world's units:
   - 1 unit = 1 meter
   - +Y up
   - Scene background color `#dcebfa` (set in `Phase1Scene.ts`)
   - Fog: `FogExp2(0xdcebfa, 0.012)`
6. **Do not** mix radically different art styles unnecessarily.
7. **Reuse** assets consistently instead of downloading many visually redundant packs.

## Prototype vs final art

External generic assets are acceptable for:
- prototyping
- placeholder environments
- furniture
- UI components
- generic props
- temporary characters
- development / testing

These must eventually receive a **distinctive Accra Life visual treatment**:
- Player characters
- Accra streets
- Buildings
- Major landmarks
- Trotros
- Local food
- Shops
- Signage
- Housing
- Transport
- Important NPCs
- Major locations

## Directory layout

```
assets/
├── registry.json         ← single source of truth (this dir's index)
├── README.md             ← this file
├── external/             ← CC0 assets downloaded from external sources
│   ├── kenney/
│   ├── opengameart/
│   └── itch/
└── accra/                 ← hand-crafted Accra-specific art
    ├── characters/        ← player + NPC replacements
    ├── buildings/         ← shopfronts, kiosks, religious buildings
    ├── vehicles/          ← trotros, okadas, market trucks
    ├── food/              ← waakye pots, kelewele pans, sachet water racks
    ├── landmarks/         ← Black Star Square, Jamestown Lighthouse, etc.
    └── props/             ← MoMo umbrellas, hawker tables, cool chests, etc.
```

## Current asset inventory

See `registry.json` for the complete inventory. Quick counts:

- **Procedural assets** (built in `src/game/` via Three.js geometry): all current world props + 4 character rigs (the Mate and the visible R3F player avatar are procedural too — no character GLB exists yet)
- **Runtime model packs** (shipped under `public/assets/`, loaded by `src/r3f/*`): GLB vehicles (trotro van trio), buildings/interiors/props, 9 market food GLBs, furniture, beach, ~50 MB residential showroom (CC-BY-4.0 — attribution required), FBX trees/farm, OBJ houses/offices

**Object → file mapping:** every runtime asset is mapped per game object in
[`docs/ASSET_MAPPING.md`](../docs/ASSET_MAPPING.md) — check it before any
visual work; never invent a path and never revert a mapped model to a box.

## Important note about the legacy `assets/index-*.js`

The repo previously committed a stale Vite build artifact at
`assets/index-Zq4SFBkZ.js` for the GitHub Pages deploy. That file was removed
during the rebase of the multiplayer slice and is no longer tracked. New
builds output to `dist/` (per `vite.config.ts: build.outDir = 'dist'`), so
the repo-root `assets/` directory is free to be used for this registry
without conflict.

If you see `assets/index-*.js` again in a fresh clone, it was likely
re-added by an old deploy script. Delete it.

## Roadmap

See `registry.json > roadmap` for the planned sequence:
1. ✅ Immediate (this slice): 7 procedural Accra props + registry + README.
2. ⏳ External asset loader: `src/game/Art/ExternalAssetLoader.ts` using GLTFLoader.
3. ⏳ Trotro replacement: hand-crafted Accra trotro with route-board, scratched paint.
4. ⏳ Building replacements: hand-crafted Adabraka shopfronts.
5. ⏳ Landmark integration: Black Star Square, Jamestown Lighthouse, Kwame Nkrumah Mausoleum.

## Agent priority

> Do not spend hours searching for the perfect asset while core gameplay
> is unfinished. If a suitable licensed placeholder exists: use it →
> integrate it → continue building → replace it later.
