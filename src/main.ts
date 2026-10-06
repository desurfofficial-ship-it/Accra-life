import * as THREE from 'three';
import { Phase1Scene } from './game/Core/Phase1Scene';
import {
  loadSavedProfile,
  startOnboarding,
  TRAIT_DEFS,
  type OnboardingResult,
  type TraitId
} from './onboarding';
import {
  ACCRA_ILLEGAL_HUSTLES,
  HeatSystem
} from './game/Crime/HeatSystem';
import {
  formatGHS,
  formatSignedGHS
} from './game/Economy/EconomicTypes';
import {
  ACCRA_EVERYDAY_EXPENSES,
  EconomyManager
} from './game/Economy/EconomyManager';
import { JobManager } from './game/Jobs/JobManager';
import {
  ACCRA_LEGAL_JOBS,
  ACCRA_SIDE_HUSTLES
} from './game/Jobs/JobRegistry';
import { InteractableTarget } from './game/Player/InteractionSystem';
import { NeedsSystem } from './game/Needs/NeedsSystem';
import { FURNITURE_CATALOG, HOUSING_TIERS, HomeSystem, type FurnitureId } from './game/Home/HomeSystem';
import { PlacementEngine, buildPlacedFurnitureMesh } from './game/Housing/PlacementEngine';
import { HomeFurnitureVisuals } from './game/Home/HomeFurnitureVisuals';
import { rebuildPlayerCompoundForTier, isPlayerInCompoundCutaway } from './game/World/PlayerCompound';
import { PresenceManager, type PresenceStatus } from './game/Multiplayer/PresenceManager';
import { LocationChatManager } from './game/Multiplayer/LocationChatManager';
import type { NearbyPlayer, ChatMessageView } from './game/Multiplayer/types';
import { getLocationAt, getLocationDef, type LocationId } from './game/World/Locations';

const container = document.getElementById('viewportContainer');
const promptEl = document.getElementById('interactionPrompt');
const promptTitleEl = document.getElementById('promptTitle');
const promptSubEl = document.getElementById('promptSub');
const toastEl = document.getElementById('interactionToast');
const resetCameraBtn = document.getElementById('resetCameraBtn');
const sprintToggleBtn = document.getElementById('sprintToggleBtn');
const interactTriggerBtn = document.getElementById('interactTriggerBtn');
const joystickZone = document.getElementById('joystickZone');
const joystickKnob = document.getElementById('joystickKnob');

const hudCashAmountEl = document.getElementById('hudCashAmount');
const walletDeltaEl = document.getElementById('walletDeltaFloating');
const progressionTierBadgeEl = document.getElementById('progressionTierBadge');
const livingSituationSubEl = document.getElementById('livingSituationSub');
const activeObjectiveBannerEl = document.getElementById('activeObjectiveBanner');
const objTagEl = document.getElementById('objTag');
const objTitleEl = document.getElementById('objTitle');
const objDescEl = document.getElementById('objDesc');
const cancelObjectiveBtn = document.getElementById('cancelObjectiveBtn');
const walletOpenBtn = document.getElementById('walletOpenBtn');
const workMenuOpenBtn = document.getElementById('workMenuOpenBtn');
const heatStatusPillEl = document.getElementById('heatStatusPill');
const heatStatusTextEl = document.getElementById('heatStatusText');

const economyModalBackdrop = document.getElementById('economyModalBackdrop');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalHeaderTitle = document.getElementById('modalHeaderTitle');
const modalHeaderSub = document.getElementById('modalHeaderSub');
const modalBodyContent = document.getElementById('modalBodyContent');
const modalTabBtns = Array.from(
  document.querySelectorAll<HTMLButtonElement>('.modal-tab-btn')
);

type ModalTabId = 'jobs' | 'hustles' | 'spend' | 'wallet';

let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let deltaTimeout: ReturnType<typeof setTimeout> | null = null;
let sprintToggled = false;
let currentModalTab: ModalTabId = 'jobs';
let currentFocusedInteractableId: string | null = null;
let phase1SceneRef: Phase1Scene | null = null;

// ---- Multiplayer (presence + chat) module refs ----
let presenceManager: PresenceManager | null = null;
let chatManager: LocationChatManager | null = null;
let chatSheetOpen = false;
let chatUnreadCount = 0;
let chatLastSeenAtMs = 0;
let isAccountMode = false;

const chatOpenBtn = document.getElementById('chatOpenBtn');
const chatBadge = document.getElementById('chatBadge');
const chatModalBackdrop = document.getElementById('chatModalBackdrop');
const chatSheetTitle = document.getElementById('chatSheetTitle');
const chatSheetSub = document.getElementById('chatSheetSub');
const chatSheetNearby = document.getElementById('chatSheetNearby');
const chatStatusPill = document.getElementById('chatStatusPill');
const chatMessagesEl = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput') as HTMLInputElement | null;
const chatSendBtn = document.getElementById('chatSendBtn') as HTMLButtonElement | null;
const nearbyStrip = document.getElementById('nearbyStrip');
const currentLocationPill = document.getElementById('currentLocationPill');
let currentLocationId: LocationId = 'adabraka_neighborhood';

const economyManager = new EconomyManager();
const jobSystem = new JobManager(economyManager);
const crimeSystem = new HeatSystem(economyManager);
const needsSystem = new NeedsSystem();
const homeSystem = new HomeSystem();
let homeVisuals: HomeFurnitureVisuals | null = null;
let playerDisplayName = 'Chale';
let playerTrait: TraitId = (loadSavedProfile()?.trait as TraitId) || 'hustler';
let lastCooldownUiTickMs = 0;

economyManager.bindExternalStateProviders(
  () => jobSystem.getPersistedState(),
  () => crimeSystem.getPersistedState()
);

const hydrated = economyManager.loadFromPersistence();
if (hydrated.jobs) jobSystem.hydrate(hydrated.jobs);
if (hydrated.crime) crimeSystem.hydrate(hydrated.crime);

function showInteractionFeedback(message: string, isWarning = false): void {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.toggle('warn', isWarning);
  toastEl.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function showFloatingWalletDelta(deltaAmount: number): void {
  if (!walletDeltaEl || deltaAmount === 0) return;
  walletDeltaEl.textContent = formatSignedGHS(deltaAmount);
  walletDeltaEl.classList.remove('show-gain', 'show-loss');
  void walletDeltaEl.offsetWidth;
  walletDeltaEl.classList.add(deltaAmount > 0 ? 'show-gain' : 'show-loss');
  if (deltaTimeout) clearTimeout(deltaTimeout);
  deltaTimeout = setTimeout(() => walletDeltaEl.classList.remove('show-gain', 'show-loss'), 1800);
}

function getActiveObjectiveInfo(): {
  targetInteractableId: string;
  isRisky: boolean;
  tag: string;
  title: string;
  instruction: string;
  stepTitle: string;
} | null {
  const activeJob = jobSystem.getActiveJob();
  if (activeJob) {
    return {
      targetInteractableId: activeJob.currentStep.targetInteractableId,
      isRisky: false,
      tag: `Step ${activeJob.stepIndex + 1}/${activeJob.totalSteps}`,
      title: activeJob.job.title,
      instruction: activeJob.currentStep.instruction,
      stepTitle: activeJob.currentStep.stepTitle
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
      stepTitle: activeHustle.currentStep.stepTitle
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
      stepTitle: activeIllegal.currentStep.stepTitle
    };
  }
  return null;
}

function syncNeedsHUD(): void {
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

function syncWalletDiagnosticPanel(): void {
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

function syncEconomyHUD(): void {
  const cash = economyManager.wallet.getCashBalance();
  if (hudCashAmountEl) hudCashAmountEl.textContent = formatGHS(cash);
  const tier = economyManager.getProgressionInfo();
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
  if (phase1SceneRef) {
    phase1SceneRef.interactionSystem.setObjectiveTarget(
      obj ? obj.targetInteractableId : null,
      obj ? obj.isRisky : false
    );
    updateInteractionPromptUI(phase1SceneRef.interactionSystem.getActiveTarget());
  }
}

economyManager.wallet.onBalanceChange((_b, tx) => {
  if (tx) showFloatingWalletDelta(tx.type === 'INCOME' ? tx.amount : -tx.amount);
  syncEconomyHUD();
});
economyManager.onUpdate(() => syncEconomyHUD());
needsSystem.onUpdate(() => syncNeedsHUD());

function updateInteractionPromptUI(target: InteractableTarget | null): void {
  if (!promptEl || !promptTitleEl) return;
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

function openEconomyModal(tab: ModalTabId, focusedInteractableId: string | null = null): void {
  currentModalTab = tab;
  currentFocusedInteractableId = focusedInteractableId;
  for (const btn of modalTabBtns) btn.classList.toggle('active', btn.dataset.tab === tab);
  renderModalTabContent();
  economyModalBackdrop?.classList.add('open');
}

function closeEconomyModal(): void {
  economyModalBackdrop?.classList.remove('open');
  currentFocusedInteractableId = null;
}

function formatTraitList(traits: ReadonlyArray<string>): string {
  return traits
    .map((t) => TRAIT_DEFS[t as TraitId]?.label ?? t)
    .join(' / ');
}

function updateLiveJobModalCooldowns(): void {
  if (!economyModalBackdrop?.classList.contains('open') || currentModalTab !== 'jobs') return;
  const activeJob = jobSystem.getActiveJob();
  const needs = needsSystem.getState();

  for (const job of ACCRA_LEGAL_JOBS) {
    const isThisActive = activeJob?.job.id === job.id;
    const remaining = jobSystem.getRemainingCooldownSeconds(job.id);
    const reqEval = jobSystem.evaluateJobRequirements(job, {
      energy: needs.energy,
      hunger: needs.hunger,
      trait: playerTrait
    });

    const cdEl = modalBodyContent?.querySelector<HTMLElement>(
      `[data-cooldown-label="${job.id}"]`
    );
    if (cdEl) {
      cdEl.classList.toggle('active', remaining > 0);
      cdEl.textContent =
        remaining > 0
          ? `Cooldown: ${remaining}s remaining`
          : `Cooldown: ${job.cooldownSeconds}s timer`;
    }

    const btn = modalBodyContent?.querySelector<HTMLButtonElement>(
      `button[data-job-btn="${job.id}"]`
    );
    if (btn) {
      if (isThisActive) {
        btn.disabled = true;
        btn.textContent = 'In Progress';
      } else if (remaining > 0) {
        btn.disabled = true;
        btn.textContent = `Cooldown (${remaining}s)`;
      } else if (!reqEval.met) {
        btn.disabled = true;
        btn.textContent = 'Requirements Not Met';
      } else {
        btn.disabled = false;
        btn.textContent = 'Take Job';
      }
    }
  }
}

function renderModalTabContent(): void {
  if (!modalBodyContent || !modalHeaderTitle) return;
  modalBodyContent.innerHTML = '';
  const cash = economyManager.wallet.getCashBalance();
  const needs = needsSystem.getState();
  const traitLabel = TRAIT_DEFS[playerTrait]?.label ?? playerTrait;
  modalHeaderTitle.textContent = `Accra Hub · ${formatGHS(cash)}`;
  if (modalHeaderSub) {
    modalHeaderSub.textContent = `Energy ${Math.round(needs.energy)} · Hunger ${Math.round(needs.hunger)} · Trait: ${traitLabel}`;
  } else {
    const statusStrip = document.createElement('div');
    statusStrip.style.cssText =
      'font-size:0.68rem;color:#9a9a9a;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.08)';
    statusStrip.textContent = `Energy ${Math.round(needs.energy)} · Hunger ${Math.round(needs.hunger)} · Trait: ${traitLabel}`;
    modalBodyContent.appendChild(statusStrip);
  }

  if (currentModalTab === 'jobs') {
    const activeJob = jobSystem.getActiveJob();
    const jobs = jobSystem.getAvailableJobs(currentFocusedInteractableId);

    for (const job of jobs) {
      const isThisActive = activeJob?.job.id === job.id;
      const remainingCooldown = jobSystem.getRemainingCooldownSeconds(job.id);
      const reqEval = jobSystem.evaluateJobRequirements(job, {
        energy: needs.energy,
        hunger: needs.hunger,
        trait: playerTrait
      });

      const minHunger = job.requirements.minHunger ?? 0;
      const traitReqHtml =
        job.requirements.requiredTraits && job.requirements.requiredTraits.length > 0
          ? `<span class="econ-req-item ${reqEval.traitMet ? '' : 'unmet'}">${
              reqEval.traitMet ? '✓' : '✗'
            } Trait: ${formatTraitList(job.requirements.requiredTraits)}</span>`
          : `<span class="econ-req-item">✓ Any Trait</span>`;

      const hungerReqHtml =
        minHunger > 0
          ? `<span class="econ-req-item ${reqEval.hungerMet ? '' : 'unmet'}">${
              reqEval.hungerMet ? '✓' : '✗'
            } Hunger ≥ ${minHunger}</span>`
          : '';

      const buttonLabel = isThisActive
        ? 'In Progress'
        : remainingCooldown > 0
          ? `Cooldown (${remainingCooldown}s)`
          : !reqEval.met
            ? 'Requirements Not Met'
            : 'Take Job';

      const card = document.createElement('div');
      card.className = 'econ-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title">${job.title}</strong>
          <span class="econ-pay-badge">+${formatGHS(job.payGHS)}</span>
        </div>
        <p style="margin:3px 0 4px;font-size:0.68rem;color:#bdbdbd">${job.summary}</p>
        <div class="econ-req-list">
          <span class="econ-req-item ${reqEval.energyMet ? '' : 'unmet'}">${
            reqEval.energyMet ? '✓' : '✗'
          } Energy ≥ ${job.requirements.minEnergy}</span>
          ${hungerReqHtml}
          ${traitReqHtml}
        </div>
        <div class="econ-cooldown-row ${
          remainingCooldown > 0 ? 'active' : ''
        }" data-cooldown-label="${job.id}">
          ${
            remainingCooldown > 0
              ? `Cooldown: ${remainingCooldown}s remaining`
              : `Cooldown: ${job.cooldownSeconds}s timer`
          }
        </div>
        <button class="econ-action-btn" data-job-btn="${job.id}" type="button" style="margin-top:4px">${buttonLabel}</button>
      `;

      const btn = card.querySelector<HTMLButtonElement>('button');
      if (btn) {
        if (isThisActive || remainingCooldown > 0 || !reqEval.met) {
          btn.disabled = true;
        }
        btn.addEventListener('click', () => {
          const latestNeeds = needsSystem.getState();
          const latestCooldown = jobSystem.getRemainingCooldownSeconds(job.id);
          if (latestCooldown > 0) {
            showInteractionFeedback(`Cooldown · ${latestCooldown}s left`, true);
            updateLiveJobModalCooldowns();
            return;
          }
          const latestEval = jobSystem.evaluateJobRequirements(job, {
            energy: latestNeeds.energy,
            hunger: latestNeeds.hunger,
            trait: playerTrait
          });
          if (!latestEval.met) {
            showInteractionFeedback(
              latestEval.unmetReasons[0] || 'Requirements not met.',
              true
            );
            renderModalTabContent();
            return;
          }
          const gate = needsSystem.canWork();
          if (!gate.ok) {
            showInteractionFeedback(gate.reason || 'Cannot work.', true);
            return;
          }
          const res = jobSystem.acceptJob(job.id, {
            energy: latestNeeds.energy,
            hunger: latestNeeds.hunger,
            trait: playerTrait
          });
          if (res.success) {
            const aj = jobSystem.getActiveJob();
            showInteractionFeedback(`Job on · ${aj ? aj.currentStep.stepTitle : 'Go'}`);
            renderModalTabContent();
            closeEconomyModal();
          } else {
            showInteractionFeedback(res.message, true);
            renderModalTabContent();
          }
          syncEconomyHUD();
        });
      }
      modalBodyContent.appendChild(card);
    }
    return;
  }

  if (currentModalTab === 'hustles') {
    const activeHustle = jobSystem.getActiveHustle();
    const activeIllegal = crimeSystem.getActiveIllegalHustle();
    const hustles = jobSystem.getAvailableSideHustles(currentFocusedInteractableId);

    for (const hustle of hustles) {
      const isThisActive = activeHustle?.hustle.id === hustle.id;
      const card = document.createElement('div');
      card.className = 'econ-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title">${hustle.title}</strong>
          <span class="econ-pay-badge">+${formatGHS(hustle.grossPayoutGHS)}</span>
        </div>
        <p style="margin:2px 0 4px;font-size:0.68rem;color:#bdbdbd">${hustle.summary}</p>
        <p style="margin:0 0 6px;font-size:0.63rem;color:#9a9a9a">${
          hustle.upfrontCapitalGHS > 0
            ? `Upfront Capital: ${formatGHS(hustle.upfrontCapitalGHS)}`
            : '₵0 Upfront Capital'
        } · ${hustle.steps.length} steps</p>
        <button class="econ-action-btn" type="button">${
          isThisActive
            ? 'In Progress'
            : hustle.upfrontCapitalGHS > 0
              ? `Start Hustle (${formatGHS(hustle.upfrontCapitalGHS)})`
              : 'Start Hustle'
        }</button>
      `;
      const btn = card.querySelector('button');
      if (btn) {
        if (isThisActive) btn.disabled = true;
        else
          btn.addEventListener('click', () => {
            const gate = needsSystem.canWork();
            if (!gate.ok) {
              showInteractionFeedback(gate.reason || 'Cannot work.', true);
              return;
            }
            const res = jobSystem.startSideHustle(hustle.id);
            if (res.success) {
              const ah = jobSystem.getActiveHustle();
              showInteractionFeedback(`Hustle on · ${ah ? ah.currentStep.stepTitle : 'Go'}`);
              closeEconomyModal();
            } else showInteractionFeedback(res.message, true);
            syncEconomyHUD();
          });
      }
      modalBodyContent.appendChild(card);
    }

    for (const illegal of ACCRA_ILLEGAL_HUSTLES) {
      const isThisActive = activeIllegal?.hustle.id === illegal.id;
      const card = document.createElement('div');
      card.className = 'econ-card risky';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title" style="color:#ff8888">${illegal.title}</strong>
          <span class="econ-pay-badge risky">+${formatGHS(illegal.payoutGHS)} (Dirty)</span>
        </div>
        <p style="margin:2px 0 4px;font-size:0.68rem;color:#bdbdbd">${illegal.summary}</p>
        <p style="margin:0 0 6px;font-size:0.63rem;color:#ff9999">${illegal.riskLabel} · +${illegal.heatPerStep}% Heat/step</p>
        <button class="econ-action-btn" type="button">${
          isThisActive ? 'In Progress' : 'Start Risky Hustle'
        }</button>
      `;
      const btn = card.querySelector('button');
      if (btn) {
        if (isThisActive) btn.disabled = true;
        else
          btn.addEventListener('click', () => {
            const hasLegalWork = Boolean(jobSystem.getActiveJob() || jobSystem.getActiveHustle());
            const res = crimeSystem.startIllegalHustle(illegal.id, hasLegalWork);
            if (res.success) {
              const ai = crimeSystem.getActiveIllegalHustle();
              showInteractionFeedback(
                `Risky hustle on · ${ai ? ai.currentStep.stepTitle : 'Go'}`,
                true
              );
              closeEconomyModal();
            } else {
              showInteractionFeedback(res.message, true);
            }
            syncEconomyHUD();
          });
      }
      modalBodyContent.appendChild(card);
    }
    return;
  }

  if (currentModalTab === 'spend') {
    for (const item of Object.values(ACCRA_EVERYDAY_EXPENSES)) {
      const card = document.createElement('div');
      card.className = 'econ-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title">${item.title}</strong>
          <span class="econ-pay-badge" style="color:var(--gta-yellow);border-color:rgba(255,204,0,.4)">-${formatGHS(item.costGHS)}</span>
        </div>
        <p style="margin:2px 0 6px;font-size:0.68rem;color:#bdbdbd">${item.description}</p>
        <button class="econ-action-btn" type="button">Buy (${formatGHS(item.costGHS)})</button>
      `;
      const btn = card.querySelector('button');
      btn?.addEventListener('click', () => {
        const res = economyManager.purchaseEverydayExpense(item.id);
        if (res.success) {
          if (item.id === 'EXP_WAAKYE_MEAL') {
            needsSystem.eatMeal('Waakye');
          }
          showInteractionFeedback(res.message);
          renderModalTabContent();
        } else {
          showInteractionFeedback(res.message, true);
        }
        syncEconomyHUD();
      });
      modalBodyContent.appendChild(card);
    }
    return;
  }

  if (currentModalTab === 'wallet') {
    const wallet = economyManager.wallet;
    const txs = wallet.getTransactions().slice(0, 12);
    const diagCard = document.createElement('div');
    diagCard.className = 'econ-card';
    diagCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong class="econ-card-title">Wallet & Firebase Store Diagnostic</strong>
        <span class="econ-pay-badge">${formatGHS(wallet.getCashBalance())}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;font-size:0.68rem;color:#ccc">
        <div>Cash: <strong style="color:#fff">${formatGHS(wallet.getCashBalance())}</strong></div>
        <div>MoMo: <strong style="color:#fff">${formatGHS(wallet.getMomoBalance())}</strong></div>
        <div>Dirty Cash: <strong style="color:#ff8888">${formatGHS(wallet.getUnsecuredIllegalCash())}</strong></div>
        <div>Lifetime Earned: <strong style="color:var(--gta-green)">${formatGHS(wallet.getLifetimeEarned())}</strong></div>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
        <button id="diagSyncFirestoreBtn" class="econ-action-btn" type="button">Sync to Firebase</button>
        <button id="diagReloadStoreBtn" class="econ-action-btn" style="background:#222;color:#fff;border-color:#555" type="button">Reload from Store</button>
      </div>
    `;
    modalBodyContent.appendChild(diagCard);

    diagCard.querySelector('#diagSyncFirestoreBtn')?.addEventListener('click', async () => {
      economyManager.saveSnapshot();
      // Sync wallet + needs + housing state to Firestore in one write.
      const needsState = needsSystem.getState();
      const homeStateData = {
        housingTier: homeSystem.getHousingTierId(),
        unlockedTiers: homeSystem.getHousingTierId() ? [homeSystem.getHousingTierId()] : [],
        owned: homeSystem.getOwned(),
        placed: homeSystem.getPlaced()
      };
      // Build full unlockedTiers list (all tiers the player has unlocked).
      // HomeSystem doesn't expose unlockedTiers directly — get from the tier
      // level (all tiers up to current are unlocked).
      const allTiers = [
        'single_room', 'chamber_kitchen_bath', 'self_contained',
        'one_bed_apartment', 'premium_apartment', 'luxury_house'
      ] as const;
      const currentLevel = homeSystem.getHousingTier().level;
      homeStateData.unlockedTiers = allTiers.slice(0, currentLevel);
      const ok = await wallet.saveToFirebase(needsState, homeStateData);
      showInteractionFeedback(
        ok ? 'Synced wallet + needs + housing to cloud.' : 'Cloud sync failed — saved locally.'
      );
      renderModalTabContent();
      syncEconomyHUD();
    });

    diagCard.querySelector('#diagReloadStoreBtn')?.addEventListener('click', async () => {
      const loadedCloud = await wallet.loadFromFirebase();
      if (!loadedCloud) {
        const local = economyManager.loadFromPersistence();
        if (local.jobs) jobSystem.hydrate(local.jobs);
        if (local.crime) crimeSystem.hydrate(local.crime);
      }
      showInteractionFeedback(
        loadedCloud ? 'Reloaded wallet from Firebase store.' : 'Reloaded wallet from local persistence.'
      );
      renderModalTabContent();
      syncEconomyHUD();
    });

    const txCard = document.createElement('div');
    txCard.className = 'econ-card';
    txCard.innerHTML = `
      <strong class="econ-card-title">Recent Transactions (${txs.length})</strong>
      <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px">
        ${
          txs.length === 0
            ? '<p style="margin:0;font-size:0.68rem;color:#888">No transactions recorded yet.</p>'
            : txs
                .map(
                  (t) => `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.68rem;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:3px">
              <div>
                <div style="color:#fff;font-weight:700">${t.description}</div>
                <div style="color:#888;font-size:0.6rem">${t.category} · ${new Date(t.timestamp).toLocaleTimeString()}</div>
              </div>
              <strong style="color:${t.type === 'INCOME' ? 'var(--gta-green)' : 'var(--gta-red)'}">
                ${formatSignedGHS(t.type === 'INCOME' ? t.amount : -t.amount)}
              </strong>
            </div>`
                )
                .join('')
        }
      </div>
    `;
    modalBodyContent.appendChild(txCard);
    return;
  }
}

function openHomeSheet(): void {
  const backdrop = document.getElementById('homeModalBackdrop');
  const titleEl = document.getElementById('homeSheetTitle');
  const flexEl = document.getElementById('homeFlexScore');
  const restBtn = document.getElementById('homeRestBtn') as HTMLButtonElement | null;
  const cookBtn = document.getElementById('homeCookBtn') as HTMLButtonElement | null;
  const socialBtn = document.getElementById('homeSocialBtn') as HTMLButtonElement | null;
  const list =
    document.getElementById('homeFurnList') || document.getElementById('furnGrid');

  const currentTier = homeSystem.getHousingTier();
  const bedBonus = homeSystem.owns('bed') ? 20 : 0;
  const totalSleepRestore = Math.min(100, currentTier.sleepEnergyRestore + bedBonus);

  if (titleEl) {
    titleEl.textContent = `${currentTier.icon} ${currentTier.title} (${currentTier.sizeSqm} m²)`;
  }
  if (flexEl) {
    flexEl.textContent = `${currentTier.dimensionsLabel} · Comfort ${homeSystem.getComfortScore()}% · Flex ${homeSystem.getFlexScore()} · Storage ${homeSystem.getUsedSlotsCount()}/${homeSystem.getMaxSlotsCount()}`;
  }
  if (restBtn) {
    restBtn.textContent = `🛏️ Sleep (+${totalSleepRestore} Energy)`;
  }
  if (cookBtn) {
    cookBtn.textContent = `🍳 ${currentTier.cookLabel}`;
  }
  if (socialBtn) {
    const cd = homeSystem.getSocialCooldownSeconds();
    socialBtn.textContent =
      cd > 0 ? `⏳ Chill (${cd}s)` : `🎉 ${currentTier.socialActionLabel}`;
  }

  if (list) {
    list.innerHTML = '';

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
            homeVisuals?.sync(homeSystem.getOwned());
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
            homeVisuals?.sync(homeSystem.getOwned());
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
            // Remove the 3D mesh from the scene (next renderHomeSheet call
            // won't include it; the 3D mesh removal happens on next game
            // reload — TODO: live 3D removal).
            syncEconomyHUD();
            openHomeSheet();
          }
        });
        row.appendChild(sellBtn);
        list.appendChild(row);
      }
    }
  }
  backdrop?.classList.add('open');
}

function closeHomeSheet(): void {
  document.getElementById('homeModalBackdrop')?.classList.remove('open');
}

// ── Phase-1 housing engine state ─────────────────────────────────────────────
let placementEngine: PlacementEngine | null = null;
let currentStoreCategory: string = 'all';

/**
 * Initialize the housing engine: Home Store modal + PlacementEngine +
 * render previously-placed furniture on game start.
 *
 * Called from startGame() after Phase1Scene is created. The room origin
 * is set to the player's compound interior floor center (-10.5, 0.24, 11.1)
 * — matches PlayerCompound's interior floor position.
 */
function initHousingEngine(phase1: Phase1Scene): void {
  // The compound is at world (-10.5, 0, 12.2); the interior floor is at
  // y=0.24 (per PlayerCompound's interiorFloorMesh position). The room
  // center (where the placement engine's origin sits) is at the interior
  // floor center, which is around (-10.5, 0.24, 11.1) — slightly south of
  // the compound group's position because the interior is offset.
  const ROOM_ORIGIN_X = -10.5;
  const ROOM_ORIGIN_Y = 0.24;
  const ROOM_ORIGIN_Z = 11.1;
  const ROOM_ORIGIN = new THREE.Vector3(ROOM_ORIGIN_X, ROOM_ORIGIN_Y, ROOM_ORIGIN_Z);

  placementEngine = new PlacementEngine(
    phase1.scene,
    phase1.thirdPersonCamera.camera,
    container ?? document.body,
    homeSystem,
    {
      onPlaced: () => {
        hidePlacementHud();
        showInteractionFeedback('Placed!', false);
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
  placementEngine.setRoomOrigin(ROOM_ORIGIN_X, ROOM_ORIGIN_Y, ROOM_ORIGIN_Z);

  // Render previously-placed furniture on game start (persistence).
  for (const inst of homeSystem.getPlaced()) {
    const mesh = buildPlacedFurnitureMesh(inst, ROOM_ORIGIN);
    phase1.scene.add(mesh);
  }

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
      currentStoreCategory = btn.dataset.storeCat || 'all';
      for (const b of document.querySelectorAll<HTMLButtonElement>('#homeStoreTabs .modal-tab-btn')) {
        b.classList.toggle('active', b === btn);
      }
      renderHomeStoreBody();
    });
  }
  // Placement HUD buttons.
  document.getElementById('placementRotateBtn')?.addEventListener('click', () => {
    placementEngine?.rotateGhost();
  });
  document.getElementById('placementConfirmBtn')?.addEventListener('click', () => {
    const ok = placementEngine?.confirmPlacement() ?? false;
    if (!ok) showInteractionFeedback('Cannot place here.', true);
  });
  document.getElementById('placementCancelBtn')?.addEventListener('click', () => {
    placementEngine?.cancelPlacement();
  });
}

function openHomeStore(): void {
  document.getElementById('homeStoreBackdrop')?.classList.add('open');
  renderHomeStoreBody();
}

function closeHomeStore(): void {
  document.getElementById('homeStoreBackdrop')?.classList.remove('open');
}

function renderHomeStoreBody(): void {
  const body = document.getElementById('homeStoreBody');
  if (!body) return;
  const cash = economyManager.wallet.getCashBalance();
  const items = FURNITURE_CATALOG.filter((f) => {
    if (currentStoreCategory === 'all') return true;
    return f.category === currentStoreCategory;
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
        (c, title) => economyManager.wallet.spendMoney({
          amount: c, category: 'PURCHASE', description: title, channel: 'CASH'
        })
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

function enterPlacementMode(catalogId: FurnitureId): void {
  if (!placementEngine) return;
  // Set room origin again in case the housing tier changed (room moves).
  const tier = homeSystem.getHousingTier();
  const ROOM_ORIGIN_X = -10.5;
  const ROOM_ORIGIN_Y = 0.24;
  const ROOM_ORIGIN_Z = 11.1;
  placementEngine.setRoomOrigin(ROOM_ORIGIN_X, ROOM_ORIGIN_Y, ROOM_ORIGIN_Z);
  void tier; // room origin is fixed for now; future: vary by tier.roomWidthM/roomDepthM
  const ok = placementEngine.enterPlacementMode(catalogId);
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

function hidePlacementHud(): void {
  const hud = document.getElementById('placementHud');
  if (hud) hud.style.display = 'none';
}

function handleWorldTargetInteracted(target: InteractableTarget): void {
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

function startGame(profile: OnboardingResult): void {
  if (profile.origin === 'dbee' && economyManager.wallet.getCashBalance() === 0) {
    economyManager.wallet.addFunds({
      amount: 500,
      category: 'REWARD',
      description: 'DBee start'
    });
  }

  if (container) {
    container.innerHTML = '';
    const phase1 = new Phase1Scene(
      container,
      {
        onTargetChanged: (target) => updateInteractionPromptUI(target),
        onTargetInteracted: (target) => handleWorldTargetInteracted(target)
      },
      { look: { skin: profile.skin, hair: profile.hair } }
    );
    phase1SceneRef = phase1;
    rebuildPlayerCompoundForTier(homeSystem.getHousingTierId());
    homeVisuals = new HomeFurnitureVisuals(phase1.scene);
    homeVisuals.sync(homeSystem.getOwned());
    playerDisplayName = profile.displayName || 'Chale';
    playerTrait = profile.trait || 'hustler';

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
      const totalSleepRestore = Math.min(100, tier.sleepEnergyRestore + bedBonus);
      const rest = needsSystem.sleep(bedBonus, totalSleepRestore);
      showInteractionFeedback(rest.message, !rest.success);
      syncEconomyHUD();
      openHomeSheet();
    });
    document.getElementById('homeCookBtn')?.addEventListener('click', () => {
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
        tier.cookHungerRestore,
        tier.cookEnergyBonus
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
      const boost = needsSystem.boostEnergy(tier.socialEnergyBonus, tier.socialActionLabel);
      if (tier.socialCashBonusGHS > 0) {
        economyManager.awardIncome({
          amountGHS: tier.socialCashBonusGHS,
          category: 'REWARD',
          description: `Social Hosting (${tier.shortLabel})`
        });
      }
      showInteractionFeedback(
        tier.socialCashBonusGHS > 0
          ? `${tier.socialActionLabel} · +₵${tier.socialCashBonusGHS}`
          : boost.message
      );
      syncEconomyHUD();
      openHomeSheet();
    });
    document.getElementById('homeShareBtn')?.addEventListener('click', async () => {
      const line = homeSystem.getFlexShareLine(playerDisplayName);
      try {
        await navigator.clipboard.writeText(line);
        showInteractionFeedback('Copied');
      } catch {
        showInteractionFeedback(line);
      }
    });

    // ── Phase-1 housing engine: Home Store + PlacementEngine ────────────────
    initHousingEngine(phase1);

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
      phase1.player.position.set(-10.5, 0.08, 6.2);
      phase1.player.rotationY = Math.PI;
    });

    const tick = () => {
      crimeSystem.tickHeatDecay(1 / 60);
      // Apply passive gameplay-effect multipliers from placed furniture.
      // These compound with the existing fatigueReductionPct (housing-tier
      // bonus) + any live-events modifiers. All default to 1.0 (no change).
      const agg = homeSystem.getAggregateGameplayEffects();
      needsSystem.tick(1 / 60, {
        energy: agg.energyDecayMultiplier,
        fun: agg.funDecayMultiplier
      });
      if (homeVisuals) {
        homeVisuals.setCutawayMode(isPlayerInCompoundCutaway());
      }
      const now = performance.now();
      if (now - lastCooldownUiTickMs >= 500) {
        lastCooldownUiTickMs = now;
        updateLiveJobModalCooldowns();
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
        currentModalTab = (btn.dataset.tab as ModalTabId) || 'jobs';
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
      sprintToggled = !sprintToggled;
      phase1.player.setSprintState(sprintToggled);
      sprintToggleBtn.classList.toggle('active', sprintToggled);
      sprintToggleBtn.textContent = sprintToggled ? 'ON' : 'Jog';
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
        joystickKnob.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
        phase1.player.setJoystickInput(ox / maxR, oy / maxR);
      };
      const reset = () => {
        stickActive = false;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        phase1.player.setJoystickInput(0, 0);
      };
      joystickZone.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        stickActive = true;
        const r = joystickZone.getBoundingClientRect();
        centerX = r.left + r.width / 2;
        centerY = r.top + r.height / 2;
        joystickZone.setPointerCapture(e.pointerId);
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

/**
 * Boot multiplayer presence + location chat for this player.
 *
 * Guests (no uid) get read-only chat: they can see what's happening but
 * cannot post until they sign in. Accounts get full presence (write their
 * own doc + subscribe to nearby) and chat.
 */
function initMultiplayer(profile: OnboardingResult, phase1: Phase1Scene): void {
  // Derive initial location from the player's spawn position. The
  // PlayerController spawns at (0, 0, 5.8) — south sidewalk, which falls
  // inside the Oxford Street bounds (z = -7.7..7.7).
  const spawn = phase1.player.position;
  const spawnLoc = getLocationAt(spawn.x, spawn.z);
  currentLocationId = spawnLoc.id;
  isAccountMode = profile.mode === 'account' && !!profile.userId;
  presenceManager = new PresenceManager({
    uid: profile.userId ?? '',
    displayName: profile.displayName || 'Chale',
    currentLocation: currentLocationId,
    origin: profile.origin,
    look: { skin: profile.skin, hair: profile.hair }
  });
  chatManager = new LocationChatManager({
    uid: profile.userId,
    displayName: profile.displayName || 'Chale',
    locationId: currentLocationId,
    origin: profile.origin
  });

  // Initial UI: pill + chat sheet title reflect the spawn location.
  setCurrentLocationPill(spawnLoc.id, false);
  if (chatSheetTitle) chatSheetTitle.textContent = `At ${spawnLoc.displayName}`;

  // Chat: always start (guests can read). Presence: only for accounts.
  chatManager.enter();
  if (isAccountMode) {
    void presenceManager.enter().catch((err) => {
      console.warn('[presence] enter failed:', err);
    });
    if (chatSheetSub) chatSheetSub.textContent = `${spawnLoc.displayName} — local chat, everyone here can see this.`;
    setStatusPill('online');
    setNearbyStrip([], true);
  } else {
    // Guest: read-only chat, no presence writes.
    if (chatSheetSub) chatSheetSub.textContent = `${spawnLoc.displayName} — sign in to send messages & be seen.`;
    setStatusPill('guest');
    setNearbyStrip([], false);
  }

  // Hook disconnects (mobile best-effort).
  const onDisconnect = () => {
    if (presenceManager) void presenceManager.leave();
  };
  window.addEventListener('pagehide', onDisconnect);
  window.addEventListener('beforeunload', onDisconnect);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onDisconnect();
  });

  // Wire chat UI.
  chatOpenBtn?.addEventListener('click', () => openChatSheet());
  nearbyStrip?.addEventListener('click', () => openChatSheet());
  chatModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === chatModalBackdrop) closeChatSheet();
  });
  chatSendBtn?.addEventListener('click', () => void sendChatMessage());
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendChatMessage();
    }
  });

  // Render chat updates + track unread.
  chatManager.onMessages((messages) => {
    renderChatMessages(messages);
    if (chatSheetOpen) {
      chatUnreadCount = 0;
      chatLastSeenAtMs = Date.now();
      updateChatBadge();
    } else {
      const newOnes = messages.filter(
        (m) => !m.isMine && m.createdAtMs !== null && m.createdAtMs > chatLastSeenAtMs
      );
      if (newOnes.length > 0) {
        chatUnreadCount += newOnes.length;
        chatLastSeenAtMs = Math.max(...newOnes.map((m) => m.createdAtMs ?? 0));
        updateChatBadge();
      }
    }
  });

  // Render nearby updates + presence status.
  presenceManager.onNearby((players) => {
    setNearbyStrip(players, isAccountMode);
    if (chatSheetOpen) renderChatSheetNearby(players);
  });
  presenceManager.onStatus((status) => {
    if (isAccountMode) {
      setStatusPill(status.kind === 'online' ? 'online' : 'offline');
    }
  });

  // Periodic in-world position report (every 2s). The presence heartbeat
  // already fires every 20s; this just feeds last-known coords to it.
  // Also checks if the player crossed a location boundary and, if so,
  // updates both PresenceManager (write new doc + re-subscribe to nearby)
  // and LocationChatManager (switch chat subscription + clear cache), plus
  // the HUD pill + chat sheet title.
  setInterval(() => {
    if (!phase1) return;
    const p = phase1.player.position;
    presenceManager?.reportPosition(p.x, p.z, phase1.player.rotationY);
    const newLoc = getLocationAt(p.x, p.z);
    if (newLoc.id !== currentLocationId) {
      currentLocationId = newLoc.id;
      presenceManager?.updateLocation(newLoc.id);
      chatManager?.switchLocation(newLoc.id);
      setCurrentLocationPill(newLoc.id, true);
      if (chatSheetTitle) chatSheetTitle.textContent = `At ${newLoc.displayName}`;
      if (chatSheetSub) {
        chatSheetSub.textContent = isAccountMode
          ? `${newLoc.displayName} — local chat, everyone here can see this.`
          : `${newLoc.displayName} — sign in to send messages & be seen.`;
      }
    }
  }, 2_000);

  // Click on the location pill opens the chat sheet (so players can see
  // who's at the current place without reaching for the chat button).
  currentLocationPill?.addEventListener('click', () => openChatSheet());
}

function openChatSheet(): void {
  chatSheetOpen = true;
  chatUnreadCount = 0;
  chatLastSeenAtMs = Date.now();
  updateChatBadge();
  chatModalBackdrop?.classList.add('open');
  if (presenceManager && chatSheetNearby) {
    renderChatSheetNearby(presenceManager.getNearby());
  }
  setTimeout(() => chatInput?.focus(), 50);
}

function closeChatSheet(): void {
  chatSheetOpen = false;
  chatModalBackdrop?.classList.remove('open');
  chatInput?.blur();
}

async function sendChatMessage(): Promise<void> {
  if (!chatManager || !chatInput) return;
  const text = chatInput.value;
  const result = await chatManager.sendMessage(text);
  if (result.ok) {
    chatInput.value = '';
    return;
  }
  if (result.message) showInteractionFeedback(result.message, true);
}

function renderChatMessages(messages: ChatMessageView[]): void {
  if (!chatMessagesEl) return;
  if (messages.length === 0) {
    chatMessagesEl.innerHTML = '<div class="chat-empty">No chatter yet. Be the first to say “Chale”.</div>';
    return;
  }
  const html = messages.map((m) => {
    const time = m.createdAtMs ? formatChatTime(m.createdAtMs) : '';
    const cls = `chat-msg${m.isMine ? ' mine' : ''}`;
    const safeName = escapeHtml(m.senderName);
    const safeText = escapeHtml(m.text);
    return `<div class="${cls}"><span class="name">${safeName}</span>${safeText}<span class="time">${time}</span></div>`;
  }).join('');
  chatMessagesEl.innerHTML = html;
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function renderChatSheetNearby(players: NearbyPlayer[]): void {
  if (!chatSheetNearby) return;
  const n = players.length;
  if (n === 0) {
    chatSheetNearby.textContent = 'You are alone here. For now.';
    return;
  }
  const preview = players.slice(0, 5).map((p) => p.displayName).join(', ');
  const extra = n > 5 ? ` +${n - 5} more` : '';
  chatSheetNearby.textContent = `${n} here: ${preview}${extra}`;
}

function setNearbyStrip(players: NearbyPlayer[], isAccount: boolean): void {
  if (!nearbyStrip) return;
  const countEl = nearbyStrip.querySelector('.count');
  const namesEl = nearbyStrip.querySelector('.names');
  if (countEl) countEl.textContent = String(players.length);
  if (namesEl) {
    if (!isAccount) {
      namesEl.textContent = 'guest mode';
    } else if (players.length === 0) {
      namesEl.textContent = 'alone here';
    } else {
      namesEl.textContent = players.slice(0, 3).map((p) => p.displayName).join(', ');
    }
  }
  nearbyStrip.classList.toggle('guest', !isAccount);
  nearbyStrip.classList.toggle('offline', isAccount && players.length === 0);
  // GTA-style: only show the strip when there's something worth seeing —
  // either a guest mode indicator OR nearby players. When the player is
  // alone + signed in, hide the strip entirely (less UI clutter).
  const shouldShow = !isAccount || players.length > 0;
  nearbyStrip.classList.toggle('visible', shouldShow);
}

function setStatusPill(kind: 'online' | 'guest' | 'offline'): void {
  if (!chatStatusPill) return;
  chatStatusPill.classList.remove('online', 'guest', 'offline');
  chatStatusPill.classList.add(kind);
  chatStatusPill.textContent = kind === 'online' ? 'online · Accra' : kind === 'guest' ? 'guest mode' : 'offline';
}

function setCurrentLocationPill(locId: LocationId, flash: boolean): void {
  if (!currentLocationPill) return;
  const def = getLocationDef(locId);
  const icoEl = currentLocationPill.querySelector('.ico');
  const nmEl = currentLocationPill.querySelector('.nm');
  if (icoEl) icoEl.textContent = def.icon;
  if (nmEl) nmEl.textContent = def.displayName;
  // Title attr for accessibility / hover tooltip.
  currentLocationPill.setAttribute('title', `${def.displayName} — ${def.flavor}`);
  if (flash) {
    currentLocationPill.classList.remove('flash');
    // Force reflow so the animation restarts.
    void currentLocationPill.offsetWidth;
    currentLocationPill.classList.add('flash');
  }
}

function updateChatBadge(): void {
  if (!chatBadge) return;
  if (chatUnreadCount > 0) {
    chatBadge.textContent = chatUnreadCount > 99 ? '99+' : String(chatUnreadCount);
    chatBadge.classList.remove('zero');
  } else {
    chatBadge.classList.add('zero');
  }
}

function formatChatTime(unixMs: number): string {
  const d = new Date(unixMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

startOnboarding((profile) => startGame(profile));
