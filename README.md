# Chalé Life

Phone-first life sim set in Accra.

## Restart (v2)

Legacy dual-world build is preserved:

- **Tag:** `legacy-v1`
- **Branch:** `legacy`
- **Keepers:** `salvage/` (review before re-use)
- **Assets:** `public/assets/` (compressed GLBs + DRACO)

### Architecture

- **One 3D world** — React Three Fiber (`src/r3f/`)
- **One game store** — `src/store/gameStore.ts` (position, wallet, needs, job, home, time)
- **Pure rules** — plain modules + tests (no 3D inside)
- **Content as data** — jobs, foods, furniture, tiers
- **CI budgets** — labels, asset paths, asset size

### Build steps (one PR each)

1. **Walk** — one street block, joystick, follow camera, smooth on iPhone  
2. **Earn and eat** — ₵20, Aunty Ba, Act, payout, buy waakye  
3. **Your room** — 14 m² dollhouse, place furniture, save  
4. **Grow** — jobs, trotro, housing tiers  
5. **Social** — sign-in, cloud save, friends, chat  

### Dev

```bash
npm ci
npm run dev
```

Open with phone emulation or a real device. Base path: `/Accra-life/`.
