# Accra Life — Housing Economic Balance Sheet

**Version:** 1.0 (Phase-1 vertical slice)
**Last updated:** 2026-10-07
**Scope:** Starter-item balancing for the first vertical slice of the housing engine. Covers cost, gameplay effects, rarity tiers, and progression curves.

## Design Principles

1. **Empty-room start.** The player starts with a 14 m² room + ₵1,000 cash + zero furniture. They cannot buy everything immediately — they must choose what matters first.
2. **Bed is the obvious first buy** (energy regen is critical for working). But toilet/shower/cooker are equally urgent for survival. No single correct build.
3. **Comfort is the long-tail stat.** Each furniture adds comfort → unlocks housing-tier upgrades → unlocks more furniture slots → compounding progression.
4. **No pay-to-win.** Premium furniture gives comfort + flex points, not gameplay advantages. A plastic chair works as well as a wooden chair for sitting — the wooden chair just looks better + gives more comfort.
5. **Resale at 50% of purchase price** (standard for the catalog). The player can sell furniture they no longer want.

## Starting Conditions

| Property | Value |
|----------|-------|
| Starting cash | ₵1,000 (DBee origin) or ₵0 (Aunty Ba origin) |
| Starting room | 14 m² Single Room (tier 1) |
| Starting furniture | ZERO (empty room) |
| Starting comfort | 28% (tier base) |
| Storage slots | 4 (tier 1 maxFurnitureSlots) |

## Starter Furniture Catalog (Phase 1 — 25 items)

### Tier 1 — Basic (common, ₵20–₵120)

| Item | Cost (₵) | Comfort | Gameplay Effect | First-priority? |
|------|----------|---------|-----------------|-----------------|
| Plastic Monobloc Chair | 20 | +1 | comfort:1 | No — comfort only |
| Bucket Shower | 80 | +2 | hygieneRestore:50 | **YES** — hygiene survival |
| Squat Toilet | 120 | +2 | bladderRestore:80 | **YES** — bladder survival |
| Small Wooden Table | 90 | +3 | comfort:3 | No — comfort only |
| 2-Burner Gas Cooker | 180 | +4 | (enables cooking) | **YES** — cook at home |
| Basic Bed Frame | 250 | +8 | sleepEnergyBonus:20, energyDecay×0.95 | **YES** — sleep survival |
| Standing Fan | 110 | +3 | energyDecay×0.9 | No — comfort + cooling |
| Carved Wooden Stool | 40 | +2 | comfort:2 | No — comfort only |
| Terracotta Planters | 35 | +3 | comfort:3 | No — decorative |
| Woven Floor Rug | 120 | +5 | comfort:5 | No — decorative |

### Tier 2 — Standard (uncommon, ₵220–₵650)

| Item | Cost (₵) | Comfort | Gameplay Effect | First-priority? |
|------|----------|---------|-----------------|-----------------|
| Wooden Wardrobe | 220 | +5 | comfort:5 | No — storage |
| Dining Table (4-seater) | 280 | +6 | funRestore:5 | No — social hosting |
| Basic 2-Seater Sofa | 320 | +9 | funRestore:8, energyDecay×0.92 | No — comfort + fun |
| Flatscreen TV | 480 | +8 | funDecay×0.85, funRestore:15 | No — passive fun lift |
| Single-Door Fridge | 650 | +10 | (food storage) | No — mid-game |
| Kente Wall Tapestry | 150 | +6 | comfort:6 | No — decorative |
| Highlife Hi-Fi System | 600 | +9 | comfort:9 | No — comfort |
| Plastic Chair (legacy) | 25 | +1 | comfort:1 | No — duplicate |
| Veranda Table (legacy) | 80 | +3 | comfort:3 | No — duplicate |
| Orthopedic Queen Bed (legacy) | 400 | +12 | sleepEnergy:20 | No — premium bed |

### Tier 3 — Premium (rare, ₵800+)

| Item | Cost (₵) | Comfort | Gameplay Effect | First-priority? |
|------|----------|---------|-----------------|-----------------|
| Double-Door Fridge (legacy) | 800 | +12 | comfort:12 | No — premium |
| Backup Generator | 1200 | +15 | (dumsor immunity) | No — late-game |

## Early-Game Decision Tree

**Player has ₵1,000. Cannot buy everything. What matters first?**

### Survival priority (recommended first ₵500)
1. **Basic Bed Frame (₵250)** — sleep energy +20, energy decay ×0.95. Without this, sleeping on the floor gives only base energy.
2. **Squat Toilet (₵120)** — bladder restore +80. Without this, the player has to leave home to find a toilet.
3. **Bucket Shower (₵80)** — hygiene restore +50. Without this, the player has to leave home to shower.
4. **2-Burner Gas Cooker (₵180)** — enables cooking at home (₵5/meal, hunger +38). Without this, the player must buy waakye (₵12/meal) at the food joint.

**Total survival bundle: ₵630.** Leaves ₵370 for comfort/decor.

### Comfort priority (next ₵300)
5. **Standing Fan (₵110)** — energy decay ×0.9 (passive cooling). Reduces fatigue accumulation.
6. **Plastic Monobloc Chair (₵20)** — basic seating.
7. **Small Wooden Table (₵90)** — meals + work surface.
8. **Woven Floor Rug (₵120)** — comfort +5 (decorative lift).

**Total comfort bundle: ₵340.** Player has spent ₵970 of ₵1,000.

### Late-game (after earning more)
9. **Basic 2-Seater Sofa (₵320)** — comfort +9, fun restore +8.
10. **Flatscreen TV (₵480)** — fun decay ×0.85 (passive mood lift).
11. **Single-Door Fridge (₵650)** — comfort +10, food storage.
12. **Wooden Wardrobe (₵220)** — storage + comfort +5.

## Progression Curves

### Comfort → Housing Tier Unlock

| Comfort % | Tier Unlocked | Cost (₵) | Size (m²) | Slots |
|-----------|---------------|---------|-----------|-------|
| 28% (base) | Single Room | 0 | 14 | 4 |
| 48%+ | Chamber + Kitchen/Bath | 650 | 25 | 6 |
| 65%+ | Self-Contained | 1,600 | 38 | 8 |
| 80%+ | 1-Bedroom Apartment | 3,600 | 55 | 10 |
| 92%+ | Premium Apartment | 7,800 | 80 | 12 |
| 100% | Luxury House | 16,000 | 140 | 12 |

### Energy Regen Curve (sleep)

| Setup | Sleep Energy Restore | Notes |
|-------|---------------------|-------|
| Floor (no bed) | 55 (tier base) | Baseline — sleep on the floor |
| Basic Bed Frame | 55 + 20 = 75 | +20 from bed_basic.sleepEnergyBonus |
| Orthopedic Queen Bed | 55 + 20 = 75 (same bonus, but comfort +12 vs +8) | Premium bed = same energy, more comfort |
| Chamber + Kitchen/Bath tier | 72 (tier sleepEnergyRestore) | Tier upgrade lifts base |
| Self-Contained tier | 84 | Tier upgrade lifts base further |
| 1-Bedroom Apartment tier | 94 | Tier upgrade lifts base further |
| Premium Apartment tier | 100 | Capped |

### Fun Decay Multiplier (passive)

| Setup | Multiplier | Notes |
|-------|------------|-------|
| Empty room | 1.0 (normal) | No furniture bonuses |
| + Flatscreen TV | 0.85 | TV lifts mood passively |
| + Basic 2-Seater Sofa | 0.92 (compounds: 0.85 × 0.92 = 0.78) | Sofa + TV together |
| + Standing Fan | (no fun effect — fan affects energy only) | — |
| + Highlife Hi-Fi System | (no funDecay effect — gives comfort only) | — |

### Energy Decay Multiplier (passive)

| Setup | Multiplier | Notes |
|-------|------------|-------|
| Empty room | 1.0 (normal) | No furniture bonuses |
| + Basic Bed Frame | 0.95 | Bed reduces fatigue |
| + Standing Fan | 0.9 (compounds: 0.95 × 0.9 = 0.855) | Fan cools |
| + Basic 2-Seater Sofa | 0.92 (compounds: 0.855 × 0.92 = 0.787) | Sofa relaxes |
| + Tier fatigueReductionPct (e.g. 12% for chamber_kitchen_bath) | 0.88 (compounds with above) | Tier upgrade bonus |

## Resale Values

All furniture resells at **50% of purchase price**. This is a money sink — the player loses half their investment on resale, encouraging thoughtful purchases rather than constant flipping.

## Money Sinks

The housing system is a major economic sink:
- **Furniture purchases:** ₵20 (chair) to ₵1,200 (generator) per item
- **Housing tier upgrades:** ₵650 to ₵16,000 per tier
- **Resale loss:** 50% of purchase price (sink)
- **Total to fully furnish a Luxury House:** ~₵25,000+ (furniture + tier upgrades)

This balances against the player's earning potential from jobs/hustles (₵50–₵500 per shift).

## Future Tiers (Phase 2+)

- **Tier 4 — Premium/Luxury furniture** (₵1,500–₵5,000): designer beds, premium sofas, large entertainment setups, high-end kitchen appliances. Comfort +15 to +25. Purely cosmetic + status — no gameplay advantage over Tier 2/3.
- **Seasonal furniture** (limited-time drops): Chale Wote festival items, Christmas decor, Easter items. Cosmetic only.
- **Rare furniture** (drop-based): unique items that can't be bought — only earned via events/achievements.

## Anti-Pay-to-Win Guardrails

- All gameplay-effect furniture (bed, toilet, shower, cooker, fridge, fan) is **Tier 1–2** (affordable within the first session).
- Premium/luxury furniture gives **comfort + flex points only** — no energy/fun/hygiene advantage over basic items.
- The player cannot buy gameplay advantages with money — they can only buy comfort + status.
