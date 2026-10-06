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
import { FURNITURE_CATALOG, HomeSystem } from './game/Home/HomeSystem';
import { HomeFurnitureVisuals } from './game/Home/HomeFurnitureVisuals';
import { PresenceManager, type PresenceStatus } from './game/Multiplayer/PresenceManager';
import { LocationChatManager } from './game/Multiplayer/LocationChatManager';
import { NearbyPlayerAvatars } from './game/Multiplayer/NearbyPlayerAvatars';
import type { NearbyPlayer, ChatMessageView } from './game/Multiplayer/types';
import { getLocationAt, getLocationDef, type LocationId } from './game/World/Locations';
import { liveEvents } from './game/LiveEvents/LiveEvents';
import { auth } from './firebase';

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
const liveEventsPill = document.getElementById('liveEventsPill');
let currentLocationId: LocationId = 'adabraka_neighborhood';
let nearbyAvatars: NearbyPlayerAvatars | null = null;
let lastLiveEventsTickMs = 0;

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
  const s = needsSystem.getState();
  setNeedMeter('needHungerBar', 'needHungerVal', 'hungerFill', 'hungerVal', s.hunger);
  setNeedMeter('needEnergyBar', 'needEnergyVal', 'energyFill', 'energyVal', s.energy);
  setNeedMeter('needFunBar', 'needFunVal', '', '', s.fun);
  setNeedMeter('needSocialBar', 'needSocialVal', '', '', s.social);
  setNeedMeter('needHygieneBar', 'needHygieneVal', '', '', s.hygiene);
  setNeedMeter('needBladderBar', 'needBladderVal', '', '', s.bladder);
}

/**
 * Set a single need meter's bar width + numeric value + low-class.
 * Accepts both the new ID (e.g. `needHungerBar`) and the legacy fallback
 * ID (e.g. `hungerFill`) for backward-compat with any HTML that hasn't
 * migrated to the new IDs yet.
 */
function setNeedMeter(
  newBarId: string,
  newValId: string,
  legacyBarId: string,
  legacyValId: string,
  value: number
): void {
  const bar = document.getElementById(newBarId)
    || (legacyBarId ? document.getElementById(legacyBarId) : null);
  const val = document.getElementById(newValId)
    || (legacyValId ? document.getElementById(legacyValId) : null);
  if (bar) {
    bar.style.width = `${Math.round(value)}%`;
    bar.classList.toggle('low', value < 25);
  }
  if (val) val.textContent = String(Math.round(value));
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
  if (progressionTierBadgeEl) progressionTierBadgeEl.textContent = tier.title;
  if (livingSituationSubEl) livingSituationSubEl.textContent = tier.description;
  const heat = crimeSystem.getHeatLevel();
  const status = crimeSystem.getPoliceStatus();
  if (heatStatusPillEl && heatStatusTextEl) {
    heatStatusPillEl.classList.remove('suspicious', 'wanted', 'arrested');
    if (status === 'SUSPICIOUS') heatStatusPillEl.classList.add('suspicious');
    else if (status === 'WANTED') heatStatusPillEl.classList.add('wanted');
    else if (status === 'ARRESTED') heatStatusPillEl.classList.add('arrested');
    heatStatusTextEl.textContent =
      status === 'CLEAN' || status === 'NORMAL'
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
        provision_shop: 'Provisions · ₵5',
        trotro_stop: 'Trotro · ₵6',
        cool_chest: 'Cold Drink · ₵3',
        chale_wote_panel: 'View Art',
        momo_agent: 'MoMo',
        susu_collector: 'Susu',
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
      // Cloud save requires emailVerified=true under the strict /players +
      // /profiles rules (blocks Payload 3 — unverified email spoof). If the
      // user is unverified, the rules reject every write; surface this
      // clearly instead of silently failing.
      const user = auth.currentUser;
      if (!user) {
        showInteractionFeedback('Sign in to enable cloud sync.', true);
        return;
      }
      if (user.emailVerified === false) {
        showInteractionFeedback('Verify your email to enable cloud sync. Check your inbox.', true);
        return;
      }
      economyManager.saveSnapshot();
      const ok = await wallet.saveToFirebase(needsSystem.getState());
      showInteractionFeedback(
        ok ? 'Synced wallet + needs to Firebase store.' : 'Cloud sync failed — saved locally.'
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
  const flexEl = document.getElementById('homeFlexScore');
  const list =
    document.getElementById('homeFurnList') || document.getElementById('furnGrid');
  if (flexEl) flexEl.textContent = `Flex ${homeSystem.getFlexScore()} · ${homeSystem.getFlexLabel()}`;
  if (list) {
    list.innerHTML = '';
    if (!document.getElementById('homeRestBtn')) {
      const actionsRow = document.createElement('div');
      actionsRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap';
      actionsRow.innerHTML = `
        <button id="inlineHomeRestBtn" class="econ-action-btn" type="button" style="flex:1 1 45%;min-width:120px">Rest (+Energy)</button>
        <button id="inlineHomeShowerBtn" class="econ-action-btn" type="button" style="flex:1 1 45%;min-width:120px">Shower (+Hygiene)</button>
        <button id="inlineHomeToiletBtn" class="econ-action-btn" type="button" style="flex:1 1 45%;min-width:120px">Toilet (+Bladder)</button>
        <button id="inlineHomeVibeBtn" class="econ-action-btn" type="button" style="flex:1 1 45%;min-width:120px">Vibe (+Fun)</button>
        <button id="inlineHomeShareBtn" class="econ-action-btn" type="button" style="flex:1 1 45%;min-width:120px;background:#222;color:#fff;border-color:#555">Share Flex</button>
      `;
      actionsRow.querySelector('#inlineHomeRestBtn')?.addEventListener('click', () => {
        const bedBonus = homeSystem.owns('bed') ? 20 : 0;
        const rest = needsSystem.sleep(bedBonus);
        showInteractionFeedback(
          rest.success ? (bedBonus ? '+Energy (bed)' : '+Energy') : rest.message,
          !rest.success
        );
        syncEconomyHUD();
      });
      actionsRow.querySelector('#inlineHomeShowerBtn')?.addEventListener('click', () => {
        const r = needsSystem.shower();
        showInteractionFeedback(r.success ? '+Hygiene' : r.message, !r.success);
        syncEconomyHUD();
      });
      actionsRow.querySelector('#inlineHomeToiletBtn')?.addEventListener('click', () => {
        const r = needsSystem.useToilet();
        showInteractionFeedback(r.success ? '+Bladder' : r.message, !r.success);
        syncEconomyHUD();
      });
      actionsRow.querySelector('#inlineHomeVibeBtn')?.addEventListener('click', () => {
        const r = needsSystem.haveFun(35, 'Vibing to Afrobeats');
        showInteractionFeedback(r.success ? '+Fun' : r.message, !r.success);
        syncEconomyHUD();
      });
      actionsRow.querySelector('#inlineHomeShareBtn')?.addEventListener('click', async () => {
        const line = homeSystem.getFlexShareLine(playerDisplayName);
        try {
          await navigator.clipboard.writeText(line);
          showInteractionFeedback('Copied');
        } catch {
          showInteractionFeedback(line);
        }
      });
      list.appendChild(actionsRow);
    }
    for (const item of FURNITURE_CATALOG) {
      const owned = homeSystem.owns(item.id);
      const row = document.createElement('div');
      row.className = 'furn-row' + (owned ? ' owned' : '');
      row.innerHTML = `<div class="furn-meta"><p class="furn-title">${item.title}</p><p class="furn-blurb">${item.blurb}</p></div>`;
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
  }
  backdrop?.classList.add('open');
}

function closeHomeSheet(): void {
  document.getElementById('homeModalBackdrop')?.classList.remove('open');
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
      const pay = advance.earnedGHS > 0 ? ` +₵${advance.earnedGHS.toFixed(0)}` : '';
      showInteractionFeedback(`Paid${pay}`);
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
    // Live events market-day multiplier applies to waakye cost.
    const waakyeBaseCost = 12;
    const foodMult = liveEvents.getModifier('foodCostMultiplier', 1);
    const waakyeCost = Math.round(waakyeBaseCost * foodMult);
    if (!economyManager.canAfford(waakyeCost, 'CASH')) {
      const suffix = foodMult < 1 ? ' (market day discount!)' : foodMult > 1 ? ' (price surge!)' : '';
      showInteractionFeedback(`Need ₵${waakyeCost} for Waakye${suffix} (open Jobs to earn)`, true);
      openEconomyModal('jobs', target.id);
      return;
    }
    const buy = economyManager.purchaseEverydayExpense('EXP_WAAKYE_MEAL');
    if (buy.success) {
      needsSystem.eatMeal('Waakye');
      showInteractionFeedback(`+Hunger (Waakye · ₵${waakyeCost})`);
    } else showInteractionFeedback(buy.message || 'No', true);
    syncEconomyHUD();
    return;
  }

  if (target.id === 'cool_chest') {
    // Cold drink — small fun + small energy boost on a hot day.
    if (!economyManager.canAfford(3, 'CASH')) {
      showInteractionFeedback('Need ₵3 for a cold drink (open Jobs to earn)', true);
      openEconomyModal('jobs', target.id);
      return;
    }
    const buy = economyManager.purchaseEverydayExpense('EXP_COLD_DRINK');
    if (buy.success) {
      needsSystem.haveFun(10, 'Cold drink');
      // Tiny energy boost (cold drink on a hot day).
      const s = needsSystem.getState();
      void s; // No public setter for direct energy bump — use haveFun's side effects instead.
      showInteractionFeedback('+Fun (Cold Drink · ₵3)');
    } else showInteractionFeedback(buy.message || 'No', true);
    syncEconomyHUD();
    return;
  }

  if (target.id === 'provision_shop') {
    // Adabraka Provisions — buy snacks bundle: small fun restore.
    if (!economyManager.canAfford(5, 'CASH')) {
      showInteractionFeedback('Need ₵5 for the provisions bundle (open Jobs to earn)', true);
      openEconomyModal('jobs', target.id);
      return;
    }
    const buy = economyManager.purchaseEverydayExpense('EXP_PROVISION_BUNDLE');
    if (buy.success) {
      needsSystem.haveFun(15, 'Bought Milo & snacks');
      showInteractionFeedback('+Fun (Provisions · ₵5)');
    } else showInteractionFeedback(buy.message || 'No', true);
    syncEconomyHUD();
    return;
  }

  if (target.id === 'chale_wote_panel') {
    // View street art — free, big fun restore. Art is inspiring.
    const r = needsSystem.haveFun(35, 'Viewed Chale Wote art');
    showInteractionFeedback(r.success ? '+Fun (inspired by street art)' : r.message, !r.success);
    syncEconomyHUD();
    return;
  }

  if (target.id === 'trotro_stop') {
    // Chat with the trotro mate — free social restore. Travel system is
    // a separate slice; for now the fare just buys you a chat.
    const fareMult = liveEvents.getModifier('fareMultiplier', 1);
    const fareCost = Math.round(6 * fareMult);
    if (!economyManager.canAfford(fareCost, 'CASH')) {
      showInteractionFeedback(
        `Need ₵${fareCost} for trotro fare${fareMult > 1 ? ' (Friday surge!)' : ''}. Or chat free with the mate.`,
        true
      );
      openEconomyModal('jobs', target.id);
      return;
    }
    const buy = economyManager.purchaseEverydayExpense('EXP_TROTRO_FARE');
    if (buy.success) {
      const s = needsSystem.socialize(12, 'Chatted with mate');
      showInteractionFeedback(`+Social (chatted with mate · ₵${fareCost} fare paid)`);
      void s;
    } else {
      // Couldn't process payment (e.g., wallet locked) — still chat for free.
      needsSystem.socialize(8, 'Chatted with mate');
      showInteractionFeedback('+Social (chatted with mate)');
    }
    syncEconomyHUD();
    return;
  }

  if (target.id === 'momo_agent') {
    // Chat with the MoMo agent — free small social restore.
    // (Money transfer UI is a separate slice; for now the agent is just
    // happy to chat when there's no queue.)
    const r = needsSystem.socialize(8, 'Chatted with MoMo agent');
    showInteractionFeedback(r.success ? '+Social (MoMo agent)' : r.message, !r.success);
    syncEconomyHUD();
    return;
  }

  if (target.id === 'susu_collector') {
    // Chat with the susu collector — free social + small fun (sense of
    // financial responsibility). Susu is a deep Ghanaian tradition.
    const r1 = needsSystem.socialize(10, 'Talked susu with collector');
    const r2 = needsSystem.haveFun(5, 'Saved daily');
    const ok = r1.success || r2.success;
    showInteractionFeedback(ok ? '+Social +Fun (susu)' : r1.message, !ok);
    syncEconomyHUD();
    return;
  }

  if (target.id === 'npc_older_001' || target.id === 'npc_male_001' || target.id === 'npc_female_001') {
    // Talking to an Accraian restores Social — even if you immediately open
    // the hustles modal, the conversation itself is the social recovery.
    const r = needsSystem.socialize(8, 'Talked');
    if (!r.success) showInteractionFeedback(r.message, true);
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
    const phase1 = new Phase1Scene(
      container,
      {
        onTargetChanged: (target) => updateInteractionPromptUI(target),
        onTargetInteracted: (target) => handleWorldTargetInteracted(target)
      },
      { look: { skin: profile.skin, hair: profile.hair } }
    );
    phase1SceneRef = phase1;
    homeVisuals = new HomeFurnitureVisuals(phase1.scene);
    homeVisuals.sync(homeSystem.getOwned());
    playerDisplayName = profile.displayName || 'Chale';
    playerTrait = profile.trait || 'hustler';

    // Propagate the player's housing-tier fatigue reduction to the needs
    // system. Preserves the housing-progression feature from commit 97fd466.
    // Re-applied on every home-sheet upgrade so a tier change takes effect
    // immediately.
    try {
      const tier = homeSystem.getHousingTier();
      if (tier && typeof tier.fatigueReductionPct === 'number') {
        needsSystem.setFatigueReductionPct(tier.fatigueReductionPct);
      }
    } catch {
      // HomeSystem might be in an older API state — soft-fail.
    }

    document.getElementById('homeModalClose')?.addEventListener('click', () => closeHomeSheet());
    document.getElementById('homeModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('homeModalBackdrop')) closeHomeSheet();
    });
    document.getElementById('homeRestBtn')?.addEventListener('click', () => {
      const bedBonus = homeSystem.owns('bed') ? 20 : 0;
      const rest = needsSystem.sleep(bedBonus);
      showInteractionFeedback(rest.success ? (bedBonus ? '+Energy (bed)' : '+Energy') : rest.message, !rest.success);
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
      // Apply live-events modifiers to needs decay. Dumsor (every day
      // 18:00-22:00) drains fun 1.5× faster. Other modifiers can be added
      // in LIVE_EVENTS without changing this code.
      needsSystem.tick(1 / 60, {
        fun: liveEvents.getModifier('funDecayMultiplier', 1)
      });
      nearbyAvatars?.update(1 / 60);

      // Live events HUD pill — update at most once per minute.
      const now = performance.now();
      if (now - lastLiveEventsTickMs >= 60_000) {
        lastLiveEventsTickMs = now;
        updateLiveEventsPill();
      }
      if (homeVisuals) {
        const p = phase1.player.position;
        const isInsideCompound =
          p.x >= -14.5 && p.x <= -6.5 && p.z >= 9.0 && p.z <= 15.95;
        homeVisuals.setCutawayMode(isInsideCompound);
      }
      const now2 = performance.now();
      if (now2 - lastCooldownUiTickMs >= 500) {
        lastCooldownUiTickMs = now2;
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
    // Initial live-events HUD pill (refreshes every 60s from the RAF tick).
    updateLiveEventsPill();
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
  // Guests now sign in anonymously (slice C) so they get a real uid for
  // /presence + /location_chats writes (those rules only require isSignedIn,
  // no email verification). They still CANNOT write to /players or /profiles
  // (no email_verified), so isAccountMode stays false for guests — that
  // controls whether cloud save is allowed.
  // For account-mode players: presence/chat work regardless of emailVerified;
  // cloud save requires emailVerified=true (enforced by the strict rules +
  // the wallet diagnostic panel gate below).
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

  // Spawn the nearby-avatar renderer so other Accraians are visible in 3D.
  nearbyAvatars = new NearbyPlayerAvatars(phase1.scene);

  // Chat: always start (anyone signed-in can read). Presence: start for
  // any user with a uid — this includes account-mode players AND guests
  // (guests now sign in anonymously per slice C, so they have a real uid
  // for /presence writes; the rules only require isSignedIn for that
  // collection, no email verification).
  chatManager.enter();
  if (profile.userId) {
    void presenceManager.enter().catch((err) => {
      console.warn('[presence] enter failed:', err);
    });
    if (chatSheetSub) chatSheetSub.textContent = `${spawnLoc.displayName} — local chat, everyone here can see this.`;
    setStatusPill('online');
    setNearbyStrip([], true);
  } else {
    // No uid at all (anonymous auth failed) — read-only chat, no presence.
    if (chatSheetSub) chatSheetSub.textContent = `${spawnLoc.displayName} — sign in to send messages & be seen.`;
    setStatusPill('guest');
    setNearbyStrip([], false);
  }

  // Email verification banner — account-mode players who skipped verify
  // can play (localStorage still works) but cloud save is disabled. Show
  // a non-blocking banner so they know why "Sync to Firebase" is greyed.
  if (isAccountMode && !profile.emailVerified) {
    showEmailVerificationBanner();
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
    nearbyAvatars?.syncFromNearby(players);
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
      namesEl.textContent = 'you are alone here';
    } else {
      namesEl.textContent = players.slice(0, 3).map((p) => p.displayName).join(', ');
    }
  }
  nearbyStrip.classList.toggle('guest', !isAccount);
  nearbyStrip.classList.toggle('offline', isAccount && players.length === 0);
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

/**
 * Refresh the live-events HUD pill. Called from the RAF tick once per
 * 60s + on-demand when game state changes. Shows the names of all
 * currently-active events (e.g., "⚡ Dumsor · 🥬 Saturday Makola Market
 * Day") or hides itself when no events are active.
 */
function updateLiveEventsPill(): void {
  if (!liveEventsPill) return;
  const label = liveEvents.getActiveEventsLabel();
  if (label) {
    liveEventsPill.textContent = label;
    liveEventsPill.classList.add('visible');
    // Hover tooltip: full descriptions of each active event.
    const descriptions = liveEvents.getActiveEvents().map((e) => `${e.icon} ${e.name}: ${e.description}`).join(' · ');
    liveEventsPill.setAttribute('title', descriptions);
  } else {
    liveEventsPill.classList.remove('visible');
    liveEventsPill.textContent = '';
  }
}

/**
 * Show the email-verification banner. Called once at game start when an
 * account-mode player has emailVerified=false. The banner is dismissible
 * (player can play in localStorage-only mode) and disappears if the user
 * later verifies their email + reloads.
 *
 * The "Sync to Firebase" button in the wallet diagnostic panel is
 * separately gated on `auth.currentUser.emailVerified` at click time —
 * it shows an explanatory toast instead of attempting (and silently
 * failing) the strict-rules write.
 */
function showEmailVerificationBanner(): void {
  const banner = document.getElementById('emailVerifyBanner');
  if (!banner) return;
  banner.classList.add('visible');
  const dismissBtn = banner.querySelector('.dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      banner.classList.remove('visible');
    }, { once: true });
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
