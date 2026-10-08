/**
 * World interaction routing (Task 18 refactor).
 * Maps an InteractableTarget from the 3D world to the owning UI flow
 * (trotro doors, vendor stalls, NPC hustles, home door, jobs).
 */

import { economyManager, jobSystem, crimeSystem, needsSystem, homeSystem } from './services';
import { showInteractionFeedback, syncEconomyHUD } from '../ui/HUD';
import { openEconomyModal } from './economy-modal';
import { openHomeSheet } from './housing-ui';
import { InteractableTarget } from '../game/Player/InteractionSystem';
import { TROTRO_BOARD_EVENT, VENDOR_SELL_EVENT } from '../r3f/gameAPIBridge';

export function handleWorldTargetInteracted(target: InteractableTarget): void {
  // Custom map integration: the R3F layer (src/r3f/TroTroBoarding.tsx) owns
  // tro-tro boarding UI — the Mate panel, fare gates and seat state. Route
  // the [E] key into that panel instead of the DOM modals
  // (skills/tro-tro-system.md [ROUTING], live bridge row).
  if (target.id === 'trotro_stop') {
    window.dispatchEvent(new CustomEvent(TROTRO_BOARD_EVENT));
    return;
  }

  // skills/vendor-system.md [ROUTING]: the R3F layer (LivingVendor.tsx)
  // owns the vendor stand UI — dialogue bubble, 10 s shift bar, payout
  // chime. Route the [E] key into it; the shift itself is startVendorJob().
  if (target.id === 'makola_vendor_stand') {
    window.dispatchEvent(new CustomEvent(VENDOR_SELL_EVENT));
    return;
  }

  const illegalAdvance = crimeSystem.tryAdvanceAtInteractable(target.id, target.assetId);
  if (illegalAdvance.handled) {
    showInteractionFeedback(illegalAdvance.message, illegalAdvance.arrested);
    syncEconomyHUD();
    return;
  }

  const advance = jobSystem.tryAdvanceAtInteractable(target.id, target.assetId);
  if (advance.handled) {
    if (advance.completedWork) {
      needsSystem.onWorkCompleted();
      const prestigeBonusPct = homeSystem.getHousingTier().jobPayoutBonusPct;
      let bonusGHS = 0;
      if (prestigeBonusPct > 0 && advance.earnedGHS > 0) {
        bonusGHS = Math.round((advance.earnedGHS * prestigeBonusPct) / 100);
        if (bonusGHS > 0) {
          economyManager.awardIncome({
            amountGHS: bonusGHS,
            category: 'REWARD',
            description: `${homeSystem.getHousingTier().shortLabel} Prestige Bonus`
          });
        }
      }
      const totalEarned = advance.earnedGHS + bonusGHS;
      const pay = totalEarned > 0 ? ` +₵${totalEarned.toFixed(0)}` : '';
      showInteractionFeedback(
        bonusGHS > 0 ? `Paid${pay} (incl. +₵${bonusGHS} home prestige)` : `Paid${pay}`
      );
    } else showInteractionFeedback(advance.message);
    syncEconomyHUD();
    return;
  }

  const activeIllegal = crimeSystem.getActiveIllegalHustle();
  if (activeIllegal) {
    showInteractionFeedback(`Go: ${activeIllegal.currentStep.targetLocationName}`, true);
    return;
  }

  const active = jobSystem.getActiveJob() || jobSystem.getActiveHustle();
  if (active) {
    showInteractionFeedback(`Go: ${active.currentStep.targetLocationName}`, true);
    return;
  }

  if (target.id === 'food_vendor') {
    if (!economyManager.canAfford(12, 'CASH')) {
      showInteractionFeedback('Need ₵12 for Waakye (open Jobs to earn)', true);
      openEconomyModal('jobs', target.id);
      return;
    }
    const buy = economyManager.purchaseEverydayExpense('EXP_WAAKYE_MEAL');
    if (buy.success) {
      needsSystem.eatMeal('Waakye');
      showInteractionFeedback('+Hunger (Waakye)');
    } else showInteractionFeedback(buy.message || 'No', true);
    syncEconomyHUD();
    return;
  }

  if (target.id === 'npc_older_001' || target.id === 'npc_male_001') {
    openEconomyModal('hustles', target.id);
    return;
  }

  if (target.id === 'home_door') {
    openHomeSheet();
    return;
  }

  openEconomyModal('jobs', target.id);
}
