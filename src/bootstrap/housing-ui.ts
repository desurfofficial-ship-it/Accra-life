/**
 * Housing UI + engine — home sheet, home store, furniture placement,
 * placed-mesh sync and Firestore cloud sync (Task 18 refactor).
 */

import * as THREE from 'three';
import { container } from '../ui/dom-refs';
import { S } from './state';
import { placedFurnitureMeshes, ROOM_ORIGIN } from './state';
import { economyManager, needsSystem, homeSystem } from './services';
import { showInteractionFeedback, syncEconomyHUD } from '../ui/HUD';
import { blockIfVisiting } from './visit';
import { disposeObject3D } from './utils';
import { Phase1Scene } from '../game/Core/Phase1Scene';
import { FURNITURE_CATALOG, HOUSING_TIERS, type FurnitureId, type HomeState, type HousingTierId, type PlacedFurnitureInstance } from '../game/Home/HomeSystem';
import { PlacementEngine, buildPlacedFurnitureMesh } from '../game/Housing/PlacementEngine';
import { publishHomeShowcase } from '../game/Home/HomeShowcase';
import { rebuildPlayerCompoundForTier } from '../game/World/PlayerCompound';
import { HOME_COMPOUND_ANCHOR } from '../game/World/GridMap';

export function openHomeSheet(): void {
  if (blockIfVisiting('home sheet')) return;
  const backdrop = document.getElementById('homeModalBackdrop');
  const titleEl = document.getElementById('homeSheetTitle');
  const flexEl = document.getElementById('homeFlexScore');
  const restBtn = document.getElementById('homeRestBtn') as HTMLButtonElement | null;
  const cookBtn = document.getElementById('homeCookBtn') as HTMLButtonElement | null;
  const socialBtn = document.getElementById('homeSocialBtn') as HTMLButtonElement | null;
  const list =
    document.getElementById('homeFurnList') || document.getElementById('furnGrid');

  const currentTier = homeSystem.getHousingTier();
  // Check if relevant furniture is placed — drives dynamic button labels.
  const placedItems = homeSystem.getPlaced();
  const hasBed = placedItems.some((p) => p.catalogId === 'bed_basic' || p.catalogId === 'bed');
  const hasCooker = placedItems.some((p) => p.catalogId === 'cooker_gas');
  const hasTV = placedItems.some((p) => p.catalogId === 'tv_basic' || p.catalogId === 'tv');
  const hasSofa = placedItems.some((p) => p.catalogId === 'sofa_basic' || p.catalogId === 'sofa');
  // Sleep bonus from placed furniture (aggregate — bed_basic gives +20, etc.)
  const agg = homeSystem.getAggregateGameplayEffects();
  const bedBonus = agg.sleepEnergyBonus;
  const totalSleepRestore = Math.min(100, currentTier.sleepEnergyRestore + bedBonus);

  if (titleEl) {
    titleEl.textContent = `${currentTier.icon} ${currentTier.title} (${currentTier.sizeSqm} m²)`;
  }
  if (flexEl) {
    flexEl.textContent = `${currentTier.dimensionsLabel} · Comfort ${homeSystem.getComfortScore()}% · Flex ${homeSystem.getFlexScore()} · Storage ${homeSystem.getUsedSlotsCount()}/${homeSystem.getMaxSlotsCount()}`;
  }
  if (restBtn) {
    // Dynamic label: "Sleep in Bed" if bed placed, "Sleep on Floor" if not.
    if (hasBed) {
      restBtn.textContent = `🛏️ Sleep in Bed (+${totalSleepRestore} Energy)`;
    } else {
      restBtn.textContent = `🛏️ Sleep on Floor (+${currentTier.sleepEnergyRestore} Energy)`;
    }
  }
  if (cookBtn) {
    // Dynamic label: greyed out if no cooker placed.
    if (hasCooker) {
      cookBtn.textContent = `🍳 ${currentTier.cookLabel}`;
      cookBtn.style.opacity = '1';
      cookBtn.style.cursor = 'pointer';
    } else {
      cookBtn.textContent = `🍳 Need Gas Cooker`;
      cookBtn.style.opacity = '0.45';
      cookBtn.style.cursor = 'not-allowed';
    }
  }
  if (socialBtn) {
    const cd = homeSystem.getSocialCooldownSeconds();
    socialBtn.textContent =
      cd > 0 ? `⏳ Chill (${cd}s)` : `🎉 ${currentTier.socialActionLabel}`;
  }

  if (list) {
    list.innerHTML = '';

    // 0. Empty Room Welcome — shown only when no furniture is placed.
    // Directs the player to the Home Store for their first purchase.
    if (placedItems.length === 0) {
      const welcomeBanner = document.createElement('div');
      welcomeBanner.style.cssText = 'background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.3);border-radius:8px;padding:10px 12px;margin-bottom:8px;text-align:center';
      welcomeBanner.innerHTML = `
        <p style="margin:0 0 4px;font-size:0.82rem;font-weight:800;color:var(--gta-yellow)">Your new place. Make it yours.</p>
        <p style="margin:0;font-size:0.66rem;color:var(--gta-muted)">Empty ${currentTier.sizeSqm} m² room. What do you buy first?</p>
        <div style="margin-top:6px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
          <span style="font-size:0.6rem;color:var(--gta-muted)">🛏️ Bed (₵250)</span>
          <span style="font-size:0.6rem;color:var(--gta-muted)">🍳 Cooker (₵180)</span>
          <span style="font-size:0.6rem;color:var(--gta-muted)">🚽 Toilet (₵120)</span>
          <span style="font-size:0.6rem;color:var(--gta-muted)">🪣 Shower (₵80)</span>
          <span style="font-size:0.6rem;color:var(--gta-muted)">🪑 Chair (₵20)</span>
        </div>
      `;
      list.appendChild(welcomeBanner);
    }

    // 1. Current Room Features & Meaningful Gameplay Perks Banner
    const currentBanner = document.createElement('div');
    currentBanner.className = 'home-tier-banner';
    const featureTagsHtml = currentTier.includedFeatures
      .map((f) => `<span class="housing-feature-tag">✓ ${f}</span>`)
      .join('');
    currentBanner.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px">
        <strong style="font-size:0.78rem;color:var(--gta-yellow)">Current Living Setup (${currentTier.sizeSqm} m²)</strong>
        <span style="font-size:0.65rem;color:var(--gta-green);font-weight:800">${currentTier.comfortLabel} (${homeSystem.getComfortScore()}%)</span>
      </div>
      <p style="margin:0 0 6px;font-size:0.66rem;color:#cbd5e1">${currentTier.gameFeel}</p>
      <div class="housing-feature-tags" style="margin-bottom:6px">${featureTagsHtml}</div>
      <div style="font-size:0.62rem;color:#94a3b8;display:flex;flex-wrap:wrap;gap:8px">
        <span>🛏️ Sleep: <strong style="color:#fff">+${totalSleepRestore} Eng</strong></span>
        <span>🍳 Cook: <strong style="color:#fff">+${currentTier.cookHungerRestore} Hun</strong></span>
        <span>⚡ Fatigue: <strong style="color:#fff">-${currentTier.fatigueReductionPct}%</strong></span>
        <span>💼 Prestige Pay: <strong style="color:var(--gta-green)">+${currentTier.jobPayoutBonusPct}%</strong></span>
      </div>
    `;
    list.appendChild(currentBanner);

    // 2. Housing Progression Path (14 m² Starter -> 25 m² -> 38 m² -> 55 m² -> 80 m² -> 140 m²)
    const housingHeading = document.createElement('div');
    housingHeading.className = 'home-section-heading';
    housingHeading.textContent = 'Housing Progression (Meaningful Upgrades)';
    list.appendChild(housingHeading);

    for (const tier of HOUSING_TIERS) {
      const isCurrent = tier.id === currentTier.id;
      const isUnlocked = homeSystem.isTierUnlocked(tier.id);
      const card = document.createElement('div');
      card.className = `housing-tier-card${isCurrent ? ' active-tier' : ''}`;
      const tags = tier.includedFeatures
        .map((f) => `<span class="housing-feature-tag">${f}</span>`)
        .join('');
      const btnText = isCurrent
        ? 'Current Home'
        : isUnlocked
          ? 'Switch to Home'
          : `Upgrade · ₵${tier.costGHS.toLocaleString()}`;

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div>
            <strong style="font-size:0.82rem;color:var(--gta-white)">${tier.icon} ${tier.title}</strong>
            <span style="font-size:0.66rem;color:var(--gta-yellow);margin-left:6px;font-weight:800">${tier.sizeSqm} m²</span>
          </div>
          <span style="font-size:0.62rem;color:var(--gta-green);font-weight:700">${tier.comfortLabel}</span>
        </div>
        <p style="margin:0;font-size:0.65rem;color:#cbd5e1">${tier.gameFeel}</p>
        <div class="housing-feature-tags">${tags}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:3px">
          <span style="font-size:0.6rem;color:#94a3b8">Sleep +${tier.sleepEnergyRestore} · Cook +${tier.cookHungerRestore} · ${tier.maxFurnitureSlots} slots · +${tier.jobPayoutBonusPct}% pay</span>
          <button class="furn-buy" type="button" ${isCurrent ? 'disabled' : ''}>${btnText}</button>
        </div>
      `;

      const upgBtn = card.querySelector('button');
      if (upgBtn && !isCurrent) {
        upgBtn.addEventListener('click', () => {
          if (blockIfVisiting('upgrade')) return;
          const res = homeSystem.upgradeHousing(
            tier.id,
            (c) => economyManager.canAfford(c, 'CASH'),
            (c, title) =>
              Boolean(
                economyManager.wallet.spendMoney({
                  amount: c,
                  category: 'PURCHASE',
                  description: title,
                  channel: 'CASH'
                })
              )
          );
          showInteractionFeedback(res.message, !res.success);
          if (res.success) {
            rebuildPlayerCompoundForTier(res.tier.id);
            // Fixed-slot rendering disabled — PlacementEngine is the sole furniture renderer;
            syncEconomyHUD();
            openHomeSheet();
          }
        });
      }
      list.appendChild(card);
    }

    // 3. Extra Room Furniture & Appliances Catalog
    const furnHeading = document.createElement('div');
    furnHeading.className = 'home-section-heading';
    furnHeading.textContent = `Furniture & Appliances (${homeSystem.getUsedSlotsCount()}/${homeSystem.getMaxSlotsCount()} Storage Slots)`;
    list.appendChild(furnHeading);

    for (const item of FURNITURE_CATALOG) {
      const owned = homeSystem.owns(item.id);
      const row = document.createElement('div');
      row.className = 'furn-row' + (owned ? ' owned' : '');
      row.innerHTML = `<div class="furn-meta"><p class="furn-title">${item.title} <span style="font-size:0.62rem;color:var(--gta-green);font-weight:700">+${item.comfortBonus}% Comfort</span></p><p class="furn-blurb">${item.blurb}</p></div>`;
      const btn = document.createElement('button');
      btn.className = 'furn-buy';
      btn.type = 'button';
      btn.textContent = owned ? 'Owned' : `₵${item.costGHS}`;
      btn.disabled = owned;
      if (!owned) {
        btn.addEventListener('click', () => {
          const res = homeSystem.buy(
            item.id,
            (c) => economyManager.canAfford(c, 'CASH'),
            (c, title) =>
              Boolean(
                economyManager.wallet.spendMoney({
                  amount: c,
                  category: 'PURCHASE',
                  description: title,
                  channel: 'CASH'
                })
              )
          );
          showInteractionFeedback(res.message, !res.success);
          if (res.success) {
            // Fixed-slot rendering disabled — PlacementEngine is the sole furniture renderer;
            openHomeSheet();
            syncEconomyHUD();
          }
        });
      }
      row.appendChild(btn);
      list.appendChild(row);
    }

    // 4. Placed furniture list (Phase-1 placement engine) — shows items the
    // player has placed in the room, with a Sell button (50% resale).
    const placed = homeSystem.getPlaced();
    if (placed.length > 0) {
      const placedHeading = document.createElement('div');
      placedHeading.className = 'home-section-heading';
      placedHeading.textContent = `Placed in Room (${placed.length} items)`;
      list.appendChild(placedHeading);
      for (const inst of placed) {
        const pItem = FURNITURE_CATALOG.find((f) => f.id === inst.catalogId);
        if (!pItem) continue;
        const row = document.createElement('div');
        row.className = 'furn-row owned';
        const refund = Math.round(inst.purchasePrice * 0.5);
        row.innerHTML = `<div class="furn-meta"><p class="furn-title">${pItem.title} <span style="font-size:0.6rem;color:var(--gta-muted)">at (${inst.x.toFixed(1)}, ${inst.z.toFixed(1)})</span></p><p class="furn-blurb">Bought ₵${inst.purchasePrice} · Sell for ₵${refund} (50%)</p></div>`;
        const sellBtn = document.createElement('button');
        sellBtn.className = 'furn-buy';
        sellBtn.type = 'button';
        sellBtn.textContent = `Sell ₵${refund}`;
        sellBtn.style.background = 'rgba(239,68,68,0.15)';
        sellBtn.style.color = 'var(--gta-red)';
        sellBtn.style.borderColor = 'rgba(239,68,68,0.4)';
        sellBtn.addEventListener('click', () => {
          const res = homeSystem.sellPlaced(inst.instanceId, (amount, desc) => {
            economyManager.wallet.addFunds({
              amount,
              category: 'REWARD',
              description: desc
            });
          });
          showInteractionFeedback(res.message, !res.success);
          if (res.success) {
            // Diff-based sync removes + disposes the sold mesh immediately.
            if (S.phase1SceneRef) syncPlacedFurnitureMeshes(S.phase1SceneRef.scene);
            S.homeVisuals?.sync(homeSystem.getOwned(), homeSystem.getPlaced());
            syncEconomyHUD();
            openHomeSheet();
          }
        });
        row.appendChild(sellBtn);
        list.appendChild(row);
      }
    }

    // 5. Furniture-gated action buttons (Phase-3 gameplay depth).
    // These appear ONLY when the relevant furniture is placed — making
    // furniture purchases meaningful for gameplay, not just decoration.
    // (placedItems/hasTV/hasSofa reuse the function-scope declarations above —
    // a previous local re-declaration here shadowed them and crashed the
    // welcome-banner path with a TDZ ReferenceError at runtime.)
    const hasTV = placedItems.some((p) => p.catalogId === 'tv_basic' || p.catalogId === 'tv');
    const hasSofa = placedItems.some((p) => p.catalogId === 'sofa_basic' || p.catalogId === 'sofa');
    if (hasTV || hasSofa) {
      const actionsHeading = document.createElement('div');
      actionsHeading.className = 'home-section-heading';
      actionsHeading.textContent = 'Furniture Actions';
      list.appendChild(actionsHeading);
      const actionsRow = document.createElement('div');
      actionsRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px';
      if (hasTV) {
        const tvBtn = document.createElement('button');
        tvBtn.className = 'econ-action-btn';
        tvBtn.type = 'button';
        tvBtn.style.cssText = 'flex:1 1 45%;min-width:120px;justify-content:center;display:flex;background:rgba(56,189,248,0.16);color:#38bdf8;border-color:rgba(56,189,248,0.4)';
        tvBtn.textContent = '📺 Watch TV (+10 Energy)';
        tvBtn.addEventListener('click', () => {
          const r = needsSystem.restLight(10, '📺 Watching TV');
          showInteractionFeedback(r.message, !r.success);
          syncEconomyHUD();
          openHomeSheet();
        });
        actionsRow.appendChild(tvBtn);
      }
      if (hasSofa) {
        const sofaBtn = document.createElement('button');
        sofaBtn.className = 'econ-action-btn';
        sofaBtn.type = 'button';
        sofaBtn.style.cssText = 'flex:1 1 45%;min-width:120px;justify-content:center;display:flex;background:rgba(74,222,128,0.16);color:var(--gta-green);border-color:rgba(74,222,128,0.4)';
        sofaBtn.textContent = '🛋️ Relax (+8 Energy)';
        sofaBtn.addEventListener('click', () => {
          const r = needsSystem.restLight(8, '🛋️ Relaxing on sofa');
          showInteractionFeedback(r.message, !r.success);
          syncEconomyHUD();
          openHomeSheet();
        });
        actionsRow.appendChild(sofaBtn);
      }
      list.appendChild(actionsRow);
    }
  }
  backdrop?.classList.add('open');
}

export function closeHomeSheet(): void {
  document.getElementById('homeModalBackdrop')?.classList.remove('open');
}

// ── Phase-1 housing engine state ─────────────────────────────────────────────
/**
 * Initialize the housing engine: Home Store modal + PlacementEngine +
 * render previously-placed furniture on game start.
 *
 * Called from startGame() after Phase1Scene is created. The room origin
 * is set to the player's compound interior floor center — derived from
 * GridMap.HOME_COMPOUND_ANCHOR (mixed cell [row 2, col 0], world
 * [-32, 0]) with the floor 1.1 m south of the anchor.
 */
export function initHousingEngine(phase1: Phase1Scene): void {
  // The compound is at the GridMap.HOME_COMPOUND_ANCHOR (mixed cell
  // [row 2, col 0], world [-32, 0, 0]); the interior floor is at
  // y=0.24 (per PlayerCompound's interiorFloorMesh position). The room
  // center (where the placement engine's origin sits) is at the interior
  // floor center — slightly south of the compound group's position
  // because the interior is offset.
  S.placementEngine = new PlacementEngine(
    phase1.scene,
    phase1.thirdPersonCamera.camera,
    container ?? document.body,
    homeSystem,
    {
      onPlaced: (instanceId) => {
        hidePlacementHud();
        showInteractionFeedback('Placed! ✓', false);
        // Render the confirmed furniture immediately + remove any legacy
        // fixed-slot copy via the S.homeVisuals resync (prevents double-render).
        if (S.phase1SceneRef) syncPlacedFurnitureMeshes(S.phase1SceneRef.scene);
        S.homeVisuals?.sync(homeSystem.getOwned(), homeSystem.getPlaced());
        void instanceId;
      },
      onCancelled: () => {
        hidePlacementHud();
      },
      onValidityChange: (valid, reason) => {
        const statusEl = document.getElementById('placementStatus');
        if (statusEl) {
          statusEl.textContent = valid ? '✓ Valid placement' : `✕ ${reason}`;
          statusEl.style.color = valid ? 'var(--gta-green)' : 'var(--gta-red)';
        }
        const confirmBtn = document.getElementById('placementConfirmBtn') as HTMLButtonElement | null;
        if (confirmBtn) confirmBtn.disabled = !valid;
      }
    }
  );
  S.placementEngine.setRoomOrigin(ROOM_ORIGIN.x, ROOM_ORIGIN.y, ROOM_ORIGIN.z);

  // Render previously-placed furniture on game start (persistence) via the
  // single diff-based sync (boot / place / sell / cloud restore all use it).
  syncPlacedFurnitureMeshes(phase1.scene);

  // Wire Home Store button.
  document.getElementById('homeStoreBtn')?.addEventListener('click', () => {
    closeHomeSheet();
    openHomeStore();
  });
  document.getElementById('homeStoreCloseBtn')?.addEventListener('click', () => closeHomeStore());
  document.getElementById('homeStoreBackdrop')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('homeStoreBackdrop')) closeHomeStore();
  });
  // Category tabs.
  for (const btn of document.querySelectorAll<HTMLButtonElement>('#homeStoreTabs .modal-tab-btn')) {
    btn.addEventListener('click', () => {
      S.currentStoreCategory = btn.dataset.storeCat || 'all';
      for (const b of document.querySelectorAll<HTMLButtonElement>('#homeStoreTabs .modal-tab-btn')) {
        b.classList.toggle('active', b === btn);
      }
      renderHomeStoreBody();
    });
  }
  // Placement HUD buttons.
  document.getElementById('placementRotateBtn')?.addEventListener('click', () => {
    S.placementEngine?.rotateGhost();
  });
  document.getElementById('placementConfirmBtn')?.addEventListener('click', () => {
    const ok = S.placementEngine?.confirmPlacement() ?? false;
    if (!ok) showInteractionFeedback('Cannot place here.', true);
  });
  document.getElementById('placementCancelBtn')?.addEventListener('click', () => {
    S.placementEngine?.cancelPlacement();
  });
}

export function openHomeStore(): void {
  if (blockIfVisiting('the Home Store')) return;
  document.getElementById('homeStoreBackdrop')?.classList.add('open');
  renderHomeStoreBody();
}

export function closeHomeStore(): void {
  document.getElementById('homeStoreBackdrop')?.classList.remove('open');
}

export function renderHomeStoreBody(): void {
  const body = document.getElementById('homeStoreBody');
  if (!body) return;
  const cash = economyManager.wallet.getCashBalance();
  const items = FURNITURE_CATALOG.filter((f) => {
    if (S.currentStoreCategory === 'all') return true;
    return f.category === S.currentStoreCategory;
  });
  body.innerHTML = items.map((item) => {
    const owned = homeSystem.owns(item.id);
    const canAfford = cash >= item.costGHS;
    const dims = item.dimensions
      ? `${item.dimensions.widthMeters}×${item.dimensions.depthMeters}×${item.dimensions.heightMeters}m`
      : '—';
    const effects = item.gameplayEffects
      ? Object.entries(item.gameplayEffects)
          .filter(([, v]) => v !== undefined && v !== 1)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ')
      : '';
    const rarityColor = item.rarity === 'luxury' ? '#f59e0b' : item.rarity === 'premium' ? '#a855f7' : item.rarity === 'rare' ? '#3b82f6' : item.rarity === 'uncommon' ? '#22c55e' : 'var(--gta-muted)';
    return `
      <div class="furn-row" data-furn-id="${item.id}" style="display:flex;gap:10px;align-items:center;padding:10px;border-bottom:1px solid var(--border-subtle)">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px">
            <strong style="color:var(--gta-white)">${item.title}</strong>
            ${item.rarity ? `<span style="font-size:.6rem;color:${rarityColor};text-transform:uppercase;font-weight:800">${item.rarity}</span>` : ''}
            ${owned ? '<span style="font-size:.6rem;color:var(--gta-green);font-weight:800">OWNED</span>' : ''}
          </div>
          <div style="font-size:.7rem;color:var(--gta-muted);margin-top:2px">${item.blurb}</div>
          <div style="font-size:.62rem;color:var(--gta-muted);margin-top:3px;display:flex;gap:8px;flex-wrap:wrap">
            <span>📐 ${dims}</span>
            ${effects ? `<span>⚡ ${effects}</span>` : ''}
            <span>🏠 ${item.zone}</span>
          </div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          <span style="font-weight:900;color:${canAfford ? 'var(--gta-green)' : 'var(--gta-red)'}">₵${item.costGHS}</span>
          ${owned
            ? `<button class="econ-action-btn place-furn-btn" data-furn-id="${item.id}" type="button" style="font-size:.7rem;padding:4px 10px">Place</button>`
            : `<button class="econ-action-btn buy-furn-btn" data-furn-id="${item.id}" type="button" ${canAfford ? '' : 'disabled'} style="font-size:.7rem;padding:4px 10px;${canAfford ? '' : 'opacity:.4;cursor:not-allowed'}">${canAfford ? 'Buy' : 'Need ₵' + item.costGHS}</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  // Wire buy + place buttons.
  body.querySelectorAll<HTMLButtonElement>('.buy-furn-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.furnId as FurnitureId;
      const res = homeSystem.buy(
        id,
        (c) => economyManager.canAfford(c, 'CASH'),
        (c, title) =>
          Boolean(
            economyManager.wallet.spendMoney({
              amount: c,
              category: 'PURCHASE',
              description: title,
              channel: 'CASH'
            })
          )
      );
      showInteractionFeedback(res.message, !res.success);
      if (res.success) {
        syncEconomyHUD();
        renderHomeStoreBody();
        // Auto-enter placement mode after purchase.
        closeHomeStore();
        enterPlacementMode(id);
      }
    });
  });
  body.querySelectorAll<HTMLButtonElement>('.place-furn-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.furnId as FurnitureId;
      closeHomeStore();
      enterPlacementMode(id);
    });
  });
}

export function enterPlacementMode(catalogId: FurnitureId): void {
  if (blockIfVisiting('placement')) return;
  if (!S.placementEngine) return;
  // Set room origin again in case the housing tier changed (room moves).
  // ROOM_ORIGIN derives from GridMap.HOME_COMPOUND_ANCHOR — the compound's
  // real cell (was hardcoded to the pre-map compound coords, which sent
  // every placement ghost ~22 m away from the visible compound).
  const tier = homeSystem.getHousingTier();
  S.placementEngine.setRoomOrigin(ROOM_ORIGIN.x, ROOM_ORIGIN.y, ROOM_ORIGIN.z);
  void tier; // room origin is fixed for now; future: vary by tier.roomWidthM/roomDepthM
  const ok = S.placementEngine.enterPlacementMode(catalogId);
  if (!ok) {
    showInteractionFeedback('Cannot enter placement mode.', true);
    return;
  }
  // Show placement HUD.
  const hud = document.getElementById('placementHud');
  const nameEl = document.getElementById('placementItemName');
  const item = FURNITURE_CATALOG.find((f) => f.id === catalogId);
  if (hud) hud.style.display = 'flex';
  if (nameEl && item) nameEl.textContent = `Placing: ${item.title}`;
}

export function hidePlacementHud(): void {
  const hud = document.getElementById('placementHud');
  if (hud) hud.style.display = 'none';
}

export function syncPlacedFurnitureMeshes(scene: THREE.Scene): void {
  const placed = homeSystem.getPlaced();
  const liveIds = new Set(placed.map((p) => p.instanceId));
  // Remove stale meshes (sold or replaced instances).
  for (const [instanceId, mesh] of placedFurnitureMeshes) {
    if (!liveIds.has(instanceId)) {
      scene.remove(mesh);
      disposeObject3D(mesh);
      placedFurnitureMeshes.delete(instanceId);
    }
  }
  // Spawn meshes for instances we haven't rendered yet.
  for (const inst of placed) {
    if (placedFurnitureMeshes.has(inst.instanceId)) continue;
    const mesh = buildPlacedFurnitureMesh(inst, ROOM_ORIGIN);
    scene.add(mesh);
    placedFurnitureMeshes.set(inst.instanceId, mesh);
  }
}

/**
 * Drive the #liveEventPill HUD from the active Accra Live Event.
 * Called on every LiveEventsSystem notify — caches by event id + shown
 * second so the DOM is only touched when something actually changed.
 * Fires a toast whenever a NEW event starts.
 */
export function scheduleHousingCloudSync(state: HomeState): void {
  if (!S.isAccountMode) return;
  if (S.housingCloudSyncTimer) clearTimeout(S.housingCloudSyncTimer);
  S.housingCloudSyncTimer = setTimeout(() => {
    S.housingCloudSyncTimer = null;
    void economyManager.wallet.syncHousingToFirebase({
      housingTier: state.housingTier,
      unlockedTiers: state.unlockedTiers,
      owned: state.owned,
      placed: state.placed
    });
    // Public showcase (visit-ready copy at /homes/{uid}) — same debounce
    // cadence as the private save so friends always visit the real layout.
    void publishHomeShowcase({
      housingTier: state.housingTier,
      placed: state.placed
    });
  }, 4000);
}

/**
 * Restore housing state from the player's private /players/{uid} doc after
 * sign-in, then rebuild the 3D compound + furniture meshes to match.
 * No-ops for guests and for accounts with no cloud housing snapshot.
 */
export async function restoreHousingFromCloud(): Promise<void> {
  const cloud = await economyManager.wallet.loadHousingFromFirebase();
  if (!cloud) return;
  const changed = homeSystem.hydrateCloudState({
    housingTier: cloud.housingTier as HousingTierId,
    unlockedTiers: cloud.unlockedTiers as HousingTierId[],
    owned: cloud.owned as FurnitureId[],
    placed: cloud.placed as PlacedFurnitureInstance[]
  });
  if (changed && S.phase1SceneRef) {
    rebuildPlayerCompoundForTier(homeSystem.getHousingTierId());
    S.homeVisuals?.sync(homeSystem.getOwned(), homeSystem.getPlaced());
    syncPlacedFurnitureMeshes(S.phase1SceneRef.scene);
    showInteractionFeedback('🏠 Home restored from cloud save.');
  }
}

/**
 * Boot multiplayer presence + location chat for this player.
 *
 * Guests (no uid) get read-only chat: they can see what's happening but
 * cannot post until they sign in. Accounts get full presence (write their
 * own doc + subscribe to nearby) and chat.
 */
