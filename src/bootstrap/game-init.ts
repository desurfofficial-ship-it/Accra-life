/**
 * Game bootstrap (Task 18 modular refactor).
 *
 * startGame(): creates Phase1Scene, wires world bindings, home actions,
 * the RAF tick loop (needs/heat/clock/live-events/nearby avatars), HUD
 * buttons, joystick + sprint controls, and hands off to initMultiplayer.
 * Agent-facing wiring lives in agent-runtime.ts.
 */

import { container, promptEl, resetCameraBtn, sprintToggleBtn, interactTriggerBtn, joystickZone, joystickKnob, cancelObjectiveBtn, walletOpenBtn, workMenuOpenBtn, economyModalBackdrop, modalCloseBtn, modalTabBtns, placeRecoveryBtn } from '../ui/dom-refs';
import { S, type ModalTabId } from './state';
import { COMPOUND_GATE_SPAWN } from './state';
import { economyManager, jobSystem, crimeSystem, needsSystem, homeSystem } from './services';
import { updateInteractionPromptUI, showInteractionFeedback, syncEconomyHUD } from '../ui/HUD';
import { openEconomyModal, closeEconomyModal, renderModalTabContent, updateLiveJobModalCooldowns } from './economy-modal';
import { openHomeSheet, closeHomeSheet, initHousingEngine, openHomeStore, scheduleHousingCloudSync } from './housing-ui';
import { handleWorldTargetInteracted } from './interactions';
import { initAgentRuntime, initLiveEventsPill } from './agent-runtime';
import { initMultiplayer } from './multiplayer';
import { closeChatSheet, performPlaceRecoveryAction, updatePlaceRecoveryButton } from './chat';
import { Phase1Scene } from '../game/Core/Phase1Scene';
import { type OnboardingResult } from '../onboarding';
import { gameClock } from '../game/Time/GameClock';
import { HomeFurnitureVisuals } from '../game/Home/HomeFurnitureVisuals';
import { rebuildPlayerCompoundForTier, isPlayerInCompoundCutaway } from '../game/World/PlayerCompound';

export function startGame(profile: OnboardingResult): void {
  if (profile.origin === 'dbee' && economyManager.wallet.getCashBalance() === 0) {
    economyManager.wallet.addFunds({
      amount: 500,
      category: 'REWARD',
      description: 'DBee start'
    });
  }

  if (container) {
    // Custom map integration: #r3f-root hosts the live 5x5 Accra grid
    // (src/r3f — the player-facing world). Preserve it across the wipe so
    // the custom map keeps rendering above the systems-hosting scene.
    const r3fRoot = document.getElementById('r3f-root');
    if (r3fRoot) r3fRoot.remove();
    container.innerHTML = '';
    if (r3fRoot) container.appendChild(r3fRoot);
    const phase1 = new Phase1Scene(
      container,
      {
        onTargetChanged: (target) => updateInteractionPromptUI(target),
        onTargetInteracted: (target) => handleWorldTargetInteracted(target)
      },
      { look: { skin: profile.skin, hair: profile.hair } }
    );
    S.phase1SceneRef = phase1;
    initAgentRuntime(phase1);
    rebuildPlayerCompoundForTier(homeSystem.getHousingTierId());
    S.homeVisuals = new HomeFurnitureVisuals(phase1.scene);
    // Fixed-slot rendering disabled — PlacementEngine is the sole furniture renderer;
    S.playerDisplayName = profile.displayName || 'Chale';
    S.playerTrait = profile.trait || 'hustler';

    document.getElementById('identityHomeCard')?.addEventListener('click', () => openHomeSheet());
    document.getElementById('homeModalClose')?.addEventListener('click', () => closeHomeSheet());
    document.getElementById('homeModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('homeModalBackdrop')) closeHomeSheet();
    });
    document.getElementById('homeRestBtn')?.addEventListener('click', () => {
      const tier = homeSystem.getHousingTier();
      // Use aggregate sleepEnergyBonus from ALL placed furniture (bed_basic,
      // bed, etc.) — not just the legacy 'bed' ownership check.
      const agg = homeSystem.getAggregateGameplayEffects();
      const bedBonus = agg.sleepEnergyBonus;
      let totalSleepRestore = Math.min(100, tier.sleepEnergyRestore + bedBonus);
      // ECG Dumsor: power outage makes sleep worse — unless a Backup
      // Generator is placed in the compound (+15 instead of -15).
      const dumsorEv = S.liveEvents?.getActiveEvent()?.event ?? null;
      if (dumsorEv?.isDumsor) {
        const hasGenerator = homeSystem.getPlaced().some((p) => p.catalogId === 'generator');
        totalSleepRestore = Math.max(20, totalSleepRestore + (hasGenerator ? 15 : -15));
      }
      const rest = needsSystem.sleep(bedBonus, totalSleepRestore);
      showInteractionFeedback(rest.message, !rest.success);
      syncEconomyHUD();
      openHomeSheet();
    });
    document.getElementById('homeCookBtn')?.addEventListener('click', () => {
      // GATE: cooking at home requires a placed gas cooker (Phase-3
      // gameplay depth — furniture must be placed to unlock actions).
      const hasCooker = homeSystem.getPlaced().some((p) => p.catalogId === 'cooker_gas');
      if (!hasCooker) {
        showInteractionFeedback('Need a gas cooker. Buy one at the Home Store →', true);
        closeHomeSheet();
        openHomeStore();
        return;
      }
      const tier = homeSystem.getHousingTier();
      if (tier.cookCostGHS > 0 && !economyManager.canAfford(tier.cookCostGHS, 'CASH')) {
        showInteractionFeedback(`Need ₵${tier.cookCostGHS} for ingredients to cook at home.`, true);
        return;
      }
      if (tier.cookCostGHS > 0) {
        economyManager.wallet.spendMoney({
          amount: tier.cookCostGHS,
          category: 'FOOD',
          description: `Home Cooking (${tier.shortLabel})`,
          channel: 'CASH'
        });
      }
      const meal = needsSystem.eatMeal(
        `Home-cooked meal (${tier.shortLabel})`,
        tier.cookHungerRestore + (S.liveEvents?.getActiveEvent()?.event.mealHungerBonus ?? 0),
        tier.cookEnergyBonus + (S.liveEvents?.getActiveEvent()?.event.recoveryEnergyBonus ?? 0)
      );
      showInteractionFeedback(meal.message, !meal.success);
      syncEconomyHUD();
      openHomeSheet();
    });
    document.getElementById('homeSocialBtn')?.addEventListener('click', () => {
      const cd = homeSystem.getSocialCooldownSeconds();
      if (cd > 0) {
        showInteractionFeedback(`Wait ${cd}s before hosting/chilling again.`, true);
        return;
      }
      const tier = homeSystem.getHousingTier();
      homeSystem.markSocialUsed();
      // Highlife Night doubles home hosting rewards (socialBonusMultiplier).
      const socialMult = S.liveEvents?.getActiveEvent()?.event.socialBonusMultiplier ?? 1;
      const boost = needsSystem.boostEnergy(
        Math.round(tier.socialEnergyBonus * socialMult),
        tier.socialActionLabel
      );
      const socialCash = Math.round(tier.socialCashBonusGHS * socialMult);
      if (socialCash > 0) {
        economyManager.awardIncome({
          amountGHS: socialCash,
          category: 'REWARD',
          description: `Social Hosting (${tier.shortLabel})`
        });
      }
      showInteractionFeedback(
        socialCash > 0
          ? `${tier.socialActionLabel} · +₵${socialCash}`
          : boost.message
      );
      syncEconomyHUD();
      openHomeSheet();
    });
    document.getElementById('homeShareBtn')?.addEventListener('click', async () => {
      const line = homeSystem.getFlexShareLine(S.playerDisplayName);
      try {
        await navigator.clipboard.writeText(line);
        showInteractionFeedback('Copied');
      } catch {
        showInteractionFeedback(line);
      }
    });

    // ── Phase-1 housing engine: Home Store + PlacementEngine ────────────────
    initHousingEngine(phase1);

    initLiveEventsPill();
    // ── Place-tied recovery chip: sync to spawn location + wire clicks ────
    placeRecoveryBtn?.addEventListener('click', performPlaceRecoveryAction);
    updatePlaceRecoveryButton(true);

    // ── Housing cloud sync: push home changes to Firestore (accounts) ──────
    homeSystem.onUpdate((state) => scheduleHousingCloudSync(state));

    syncEconomyHUD();

    const resumedJob = jobSystem.getActiveJob();
    const resumedHustle = jobSystem.getActiveHustle();
    if (resumedJob) {
      showInteractionFeedback(`Resume · ${resumedJob.currentStep.stepTitle}`);
    } else if (resumedHustle) {
      showInteractionFeedback(`Resume · ${resumedHustle.currentStep.stepTitle}`);
    } else if (economyManager.wallet.getCashBalance() === 0) {
      showInteractionFeedback('Jobs or Uncle Mensah for cash');
    }

    crimeSystem.onArrest(() => {
      // Respawn at the compound gate (GridMap anchor-derived — was the
      // pre-map compound coords, dumping arrestees on an empty road).
      // rotationY = 0 faces +z (toward the courtyard / home_door).
      phase1.player.position.set(COMPOUND_GATE_SPAWN.x, COMPOUND_GATE_SPAWN.y, COMPOUND_GATE_SPAWN.z);
      phase1.player.rotationY = 0;
    });

    let lastTickMs = performance.now();
    const tick = () => {
      const tickStartMs = performance.now();
      const realDeltaMs = tickStartMs - lastTickMs;
      lastTickMs = tickStartMs;
      crimeSystem.tickHeatDecay(1 / 60);
      // Apply passive gameplay-effect multipliers from placed furniture.
      // These compound with the existing fatigueReductionPct (housing-tier
      // bonus). The 2-need system (hunger + energy) only accepts an energy
      // multiplier — placed furniture like fan/bed/sofa reduce energy decay.
      const agg = homeSystem.getAggregateGameplayEffects();
      needsSystem.tick(1 / 60, {
        energy: agg.energyDecayMultiplier
      });
      // Live events cycle + 3D nearby-player avatar interpolation.
      S.liveEvents?.tick();
      // Phase 6+ follow-up: advance in-game time. GameClock fires
      // hour-change listeners when the in-game hour increments, which
      // the EventScheduler catches + auto-fires Rush Hour at 7 AM + 5 PM.
      gameClock.tick(realDeltaMs);
      S.nearbyAvatars?.update(1 / 60);
      if (S.homeVisuals) {
        S.homeVisuals.setCutawayMode(isPlayerInCompoundCutaway());
      }
      const now = performance.now();
      if (now - S.lastCooldownUiTickMs >= 500) {
        S.lastCooldownUiTickMs = now;
        updateLiveJobModalCooldowns();
        updatePlaceRecoveryButton();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    walletOpenBtn?.addEventListener('click', () => openEconomyModal('wallet'));
    workMenuOpenBtn?.addEventListener('click', () => openEconomyModal('jobs'));
    document.getElementById('homeOpenTopBtn')?.addEventListener('click', () => openHomeSheet());
    document.getElementById('chatCloseBtn')?.addEventListener('click', () => closeChatSheet());
    document.getElementById('walletDiagToggle')?.addEventListener('click', () => {
      document.getElementById('walletDiagnosticPanel')?.classList.toggle('expanded');
    });
    document.getElementById('walletDiagOpenFullBtn')?.addEventListener('click', () => {
      openEconomyModal('wallet');
    });
    modalCloseBtn?.addEventListener('click', () => closeEconomyModal());
    economyModalBackdrop?.addEventListener('click', (e) => {
      if (e.target === economyModalBackdrop) closeEconomyModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('homeModalBackdrop')?.classList.contains('open')) closeHomeSheet();
        else if (economyModalBackdrop?.classList.contains('open')) closeEconomyModal();
      }
    });
    for (const btn of modalTabBtns) {
      btn.addEventListener('click', () => {
        S.currentModalTab = (btn.dataset.tab as ModalTabId) || 'jobs';
        for (const b of modalTabBtns) b.classList.toggle('active', b === btn);
        renderModalTabContent();
      });
    }
    cancelObjectiveBtn?.addEventListener('click', () => {
      if (crimeSystem.getActiveIllegalHustle()) {
        showInteractionFeedback(crimeSystem.cancelActiveIllegalHustle());
      } else {
        showInteractionFeedback(jobSystem.cancelActiveWork());
      }
      syncEconomyHUD();
    });
    resetCameraBtn?.addEventListener('click', () => {
      phase1.thirdPersonCamera.resetBehindPlayer(phase1.player.rotationY);
    });
    promptEl?.addEventListener('click', () => phase1.interactionSystem.triggerCurrentInteraction());
    interactTriggerBtn?.addEventListener('click', () => {
      if (!phase1.interactionSystem.triggerCurrentInteraction()) openEconomyModal('jobs');
    });
    sprintToggleBtn?.addEventListener('click', () => {
      S.sprintToggled = !S.sprintToggled;
      phase1.player.setSprintState(S.sprintToggled);
      sprintToggleBtn!.classList.toggle('active', S.sprintToggled);
      sprintToggleBtn!.textContent = S.sprintToggled ? 'ON' : 'Jog';
    });

    if (joystickZone && joystickKnob) {
      let stickActive = false;
      let centerX = 0;
      let centerY = 0;
      const maxR = 36;
      const updateStick = (cx: number, cy: number) => {
        const dx = cx - centerX;
        const dy = cy - centerY;
        const dist = Math.min(Math.hypot(dx, dy), maxR);
        const ang = Math.atan2(dy, dx);
        const ox = Math.cos(ang) * dist;
        const oy = Math.sin(ang) * dist;
        joystickKnob!.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
        phase1.player.setJoystickInput(ox / maxR, oy / maxR);
      };
      const reset = () => {
        stickActive = false;
        joystickKnob!.style.transform = 'translate(-50%, -50%)';
        phase1.player.setJoystickInput(0, 0);
      };
      joystickZone.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        stickActive = true;
        const r = joystickZone!.getBoundingClientRect();
        centerX = r.left + r.width / 2;
        centerY = r.top + r.height / 2;
        joystickZone!.setPointerCapture(e.pointerId);
        updateStick(e.clientX, e.clientY);
      });
      joystickZone.addEventListener('pointermove', (e) => {
        if (!stickActive) return;
        e.stopPropagation();
        updateStick(e.clientX, e.clientY);
      });
      joystickZone.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        reset();
      });
      joystickZone.addEventListener('pointercancel', () => reset());
    }

    initMultiplayer(profile, phase1);
  }
}
