/**
 * HUD rendering + feedback layer (Task 18 modular refactor).
 *
 * Owns every HUD sync/feedback entry point: toasts, floating wallet deltas,
 * needs/economy/wallet-diagnostics panels, objective banner, and the
 * interaction prompt. Also registers the wallet/needs -> HUD callbacks at
 * module load (same timing as the original main.ts).
 *
 * The file keeps the .tsx extension as the designated UI-layer home
 * (src/ui/HUD.tsx per the skills [FILE_LOCATIONS] contract); rendering
 * is still the proven vanilla-DOM path over the index.html shell.
 */

import { promptEl, promptTitleEl, promptSubEl, toastEl, hudCashAmountEl, walletDeltaEl, progressionTierBadgeEl, livingSituationSubEl, activeObjectiveBannerEl, objTagEl, objTitleEl, objDescEl, heatStatusPillEl, heatStatusTextEl } from './dom-refs';
import { S } from '../bootstrap/state';
import { economyManager, jobSystem, crimeSystem, needsSystem, homeSystem } from '../bootstrap/services';
import { formatGHS, formatSignedGHS } from '../game/Economy/EconomicTypes';
import { InteractableTarget } from '../game/Player/InteractionSystem';

export function showInteractionFeedback(message: string, isWarning = false): void {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.toggle('warn', isWarning);
  toastEl.classList.add('show');
  if (S.toastTimeout) clearTimeout(S.toastTimeout);
  S.toastTimeout = setTimeout(() => toastEl!.classList.remove('show'), 2200);
}

export function showFloatingWalletDelta(deltaAmount: number): void {
  if (!walletDeltaEl || deltaAmount === 0) return;
  walletDeltaEl.textContent = formatSignedGHS(deltaAmount);
  walletDeltaEl.classList.remove('show-gain', 'show-loss');
  void walletDeltaEl.offsetWidth;
  walletDeltaEl.classList.add(deltaAmount > 0 ? 'show-gain' : 'show-loss');
  if (S.deltaTimeout) clearTimeout(S.deltaTimeout);
  S.deltaTimeout = setTimeout(() => walletDeltaEl!.classList.remove('show-gain', 'show-loss'), 1800);
}

export function getActiveObjectiveInfo(): {
  targetInteractableId: string;
  isRisky: boolean;
  tag: string;
  title: string;
  instruction: string;
  stepTitle: string;
  actionVerb: string;
  targetLocationName: string;
} | null {
  const activeJob = jobSystem.getActiveJob();
  if (activeJob) {
    return {
      targetInteractableId: activeJob.currentStep.targetInteractableId,
      isRisky: false,
      tag: `Step ${activeJob.stepIndex + 1}/${activeJob.totalSteps}`,
      title: activeJob.job.title,
      instruction: activeJob.currentStep.instruction,
      stepTitle: activeJob.currentStep.stepTitle,
      actionVerb: activeJob.currentStep.actionVerb,
      targetLocationName: activeJob.currentStep.targetLocationName
    };
  }
  const activeHustle = jobSystem.getActiveHustle();
  if (activeHustle) {
    return {
      targetInteractableId: activeHustle.currentStep.targetInteractableId,
      isRisky: false,
      tag: `Step ${activeHustle.stepIndex + 1}/${activeHustle.totalSteps}`,
      title: activeHustle.hustle.title,
      instruction: activeHustle.currentStep.instruction,
      stepTitle: activeHustle.currentStep.stepTitle,
      actionVerb: activeHustle.currentStep.actionVerb,
      targetLocationName: activeHustle.currentStep.targetLocationName
    };
  }
  const activeIllegal = crimeSystem.getActiveIllegalHustle();
  if (activeIllegal) {
    return {
      targetInteractableId: activeIllegal.currentStep.targetInteractableId,
      isRisky: true,
      tag: `Step ${activeIllegal.stepIndex + 1}/${activeIllegal.totalSteps}`,
      title: activeIllegal.hustle.title,
      instruction: activeIllegal.currentStep.instruction,
      stepTitle: activeIllegal.currentStep.stepTitle,
      actionVerb: activeIllegal.currentStep.actionVerb,
      targetLocationName: activeIllegal.currentStep.targetLocationName
    };
  }
  return null;
}

export function syncNeedsHUD(): void {
  const state = needsSystem.getState();
  const hBar =
    document.getElementById('needHungerBar') || document.getElementById('hungerFill');
  const eBar =
    document.getElementById('needEnergyBar') || document.getElementById('energyFill');
  const hVal =
    document.getElementById('needHungerVal') || document.getElementById('hungerVal');
  const eVal =
    document.getElementById('needEnergyVal') || document.getElementById('energyVal');
  if (hBar) {
    hBar.style.width = `${Math.round(state.hunger)}%`;
    hBar.classList.toggle('low', state.hunger < 25);
  }
  if (eBar) {
    eBar.style.width = `${Math.round(state.energy)}%`;
    eBar.classList.toggle('low', state.energy < 25);
  }
  if (hVal) hVal.textContent = String(Math.round(state.hunger));
  if (eVal) eVal.textContent = String(Math.round(state.energy));
}

export function syncWalletDiagnosticPanel(): void {
  const balEl = document.getElementById('walletDiagBalance');
  const srcEl = document.getElementById('walletDiagSource');
  const txListEl = document.getElementById('walletDiagTxList');
  const wallet = economyManager.wallet;
  if (balEl) balEl.textContent = formatGHS(wallet.getCashBalance());
  const allTxs = wallet.getTransactions();
  if (srcEl) {
    srcEl.textContent = allTxs.length > 0 ? `${allTxs.length} tx ▾` : 'Synced ▾';
  }
  if (txListEl) {
    const recent = allTxs.slice(0, 4);
    if (recent.length === 0) {
      txListEl.innerHTML = '<div style="color:#888;font-size:.56rem">No transactions yet</div>';
    } else {
      txListEl.innerHTML = recent
        .map(
          (tx) =>
            `<div class="wallet-diag-tx"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px">${
              tx.description
            }</span><strong style="color:${
              tx.type === 'INCOME' ? 'var(--gta-green)' : 'var(--gta-red)'
            }">${formatSignedGHS(tx.type === 'INCOME' ? tx.amount : -tx.amount)}</strong></div>`
        )
        .join('');
    }
  }
}

export function syncEconomyHUD(): void {
  const cash = economyManager.wallet.getCashBalance();
  if (hudCashAmountEl) hudCashAmountEl.textContent = formatGHS(cash);
  const tier = economyManager.getProgressionInfo();
  // Playability patch rule 4: below Level 2 the passive drain runs on the
  // slower starter profile (~3/min HUN, ~2/min ENG) — a ₵0 guest gets
  // real runway to walk, Act and earn before the first meal matters.
  needsSystem.setStarterDecay(tier.rankNumber < 2);
  const housingTier = homeSystem.getHousingTier();
  needsSystem.setFatigueReductionPct(housingTier.fatigueReductionPct);
  if (progressionTierBadgeEl) progressionTierBadgeEl.textContent = tier.title;
  if (livingSituationSubEl) {
    livingSituationSubEl.textContent = `${housingTier.icon} ${housingTier.shortLabel} · Comfort ${homeSystem.getComfortScore()}%`;
  }
  const heat = crimeSystem.getHeatLevel();
  const status = crimeSystem.getPoliceStatus();
  if (heatStatusPillEl && heatStatusTextEl) {
    const isClean = status === 'CLEAN' || status === 'NORMAL';
    heatStatusPillEl.classList.remove('suspicious', 'wanted', 'arrested');
    heatStatusPillEl.classList.toggle('clean-hidden', isClean);
    if (status === 'SUSPICIOUS') heatStatusPillEl.classList.add('suspicious');
    else if (status === 'WANTED') heatStatusPillEl.classList.add('wanted');
    else if (status === 'ARRESTED') heatStatusPillEl.classList.add('arrested');
    heatStatusTextEl.textContent = isClean
      ? '◆ CLEAN'
      : `◆ ${status} (${Math.round(heat)}%)`;
  }
  const obj = getActiveObjectiveInfo();
  if (activeObjectiveBannerEl) {
    if (obj) {
      activeObjectiveBannerEl.style.display = 'block';
      activeObjectiveBannerEl.classList.add('visible');
      activeObjectiveBannerEl.classList.toggle('risky', obj.isRisky);
      if (objTagEl && objTitleEl) {
        objTagEl.textContent = obj.tag;
        objTitleEl.textContent = obj.title;
        if (objDescEl) objDescEl.textContent = obj.instruction;
      } else {
        activeObjectiveBannerEl.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
            <span style="font-size:.65rem;font-weight:900;color:${
              obj.isRisky ? 'var(--gta-red)' : 'var(--gta-green)'
            };text-transform:uppercase">${obj.tag}</span>
            <button id="inlineCancelObjBtn" type="button" style="background:none;border:1px solid #ffffff33;color:#ccc;font-size:.6rem;padding:1px 5px;cursor:pointer">Cancel</button>
          </div>
          <div style="font-size:.8rem;font-weight:900;margin-top:2px">${obj.title}</div>
          <div style="font-size:.68rem;color:#9a9a9a;margin-top:2px">${obj.instruction}</div>
        `;
        activeObjectiveBannerEl
          .querySelector('#inlineCancelObjBtn')
          ?.addEventListener('click', () => {
            if (crimeSystem.getActiveIllegalHustle()) {
              showInteractionFeedback(crimeSystem.cancelActiveIllegalHustle());
            } else {
              showInteractionFeedback(jobSystem.cancelActiveWork());
            }
            syncEconomyHUD();
          });
      }
    } else {
      activeObjectiveBannerEl.style.display = 'none';
      activeObjectiveBannerEl.classList.remove('visible', 'risky');
    }
  }
  syncNeedsHUD();
  syncWalletDiagnosticPanel();
  if (S.phase1SceneRef) {
    S.phase1SceneRef.interactionSystem.setObjectiveTarget(
      obj ? obj.targetInteractableId : null,
      obj ? obj.isRisky : false
    );
    updateInteractionPromptUI(S.phase1SceneRef.interactionSystem.getActiveTarget());
  }
}

economyManager.wallet.onBalanceChange((_b, tx) => {
  if (tx) showFloatingWalletDelta(tx.type === 'INCOME' ? tx.amount : -tx.amount);
  syncEconomyHUD();
});
economyManager.onUpdate(() => syncEconomyHUD());
needsSystem.onUpdate(() => syncNeedsHUD());

export function updateInteractionPromptUI(target: InteractableTarget | null): void {
  if (!promptEl || !promptTitleEl) return;
  // Custom map integration: the R3F layer renders its own GTA-style
  // boarding prompt + Mate panel for the tro-tro stop (bottom-center,
  // same position as this DOM prompt) — keep this one hidden for it.
  if (target && target.id === 'trotro_stop') {
    promptEl.classList.remove('visible', 'objective-match');
    return;
  }
  if (target) {
    const obj = getActiveObjectiveInfo();
    const match = obj && obj.targetInteractableId === target.id;
    promptEl.classList.toggle('objective-match', Boolean(match));
    if (match && obj) {
      promptTitleEl.textContent = obj.stepTitle;
    } else {
      const short: Record<string, string> = {
        food_vendor: 'Waakye · ₵12',
        home_door: 'Compound',
        provision_shop: 'Shop',
        trotro_stop: 'Trotro',
        makola_vendor_stand: 'Vendor · [E]',
        npc_older_001: 'Errand',
        npc_male_001: 'Talk',
        npc_female_001: 'Talk'
      };
      promptTitleEl.textContent = short[target.id] || target.promptLabel;
    }
    if (promptSubEl) promptSubEl.textContent = '';
    promptEl.classList.add('visible');
  } else {
    promptEl.classList.remove('visible', 'objective-match');
  }
}
