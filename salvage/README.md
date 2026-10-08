# Salvage from legacy-v1

Copied from `main` at tag `legacy-v1` before the clean restart.
**Do not import these paths at runtime** until a step PR re-integrates them
into the new structure (data files + pure rules modules).

| Path | Purpose |
|------|---------|
| `r3f/fitModel.ts` | Uniform footprint scaling for GLBs |
| `r3f/worldLabel.ts` | Safe labels under OrthographicCamera (no distanceFactor) |
| `scripts/check-*.sh` | CI guards for labels, asset paths, budget |
| `game/Jobs/` | JobManager, JobRegistry, VendorService (Aunty Ba, prices, steps) |
| `game/Needs/` | NeedsSystem drain rates |
| `game/Housing/` | PlacementEngine, FurnitureMeshes, tiers |
| `onboarding/` | Character builder (name, look, trait, origin) |
| `ui/HUD.tsx` | Visual reference (dark glass, yellow accent) — not the live HUD |
| `firebase/firestore.rules` | Secured rules baseline |

3D assets stay in `public/assets/` on main (not duplicated here).

Full history: branch `legacy`, tag `legacy-v1`.
