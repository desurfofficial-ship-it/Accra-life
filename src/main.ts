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
import { createGameAPI, GameAPI } from './game/GameAPI';
import { TrotroService } from './game/World/TrotroService';
import { JobManager } from './game/Jobs/JobManager';
import {
  ACCRA_LEGAL_JOBS,
  ACCRA_SIDE_HUSTLES
} from './game/Jobs/JobRegistry';
import { InteractableTarget } from './game/Player/InteractionSystem';
import { NeedsSystem } from './game/Needs/NeedsSystem';
import { FURNITURE_CATALOG, HOUSING_TIERS, HomeSystem, type FurnitureId, type HomeState, type HousingTierId, type PlacedFurnitureInstance } from './game/Home/HomeSystem';
import { LiveEventsSystem, type ActiveLiveEventState } from './game/Events/LiveEventsSystem';
import { NearbyPlayerAvatars } from './game/Multiplayer/NearbyPlayerAvatars';
import { PlacementEngine, buildPlacedFurnitureMesh } from './game/Housing/PlacementEngine';
import { HomeFurnitureVisuals } from './game/Home/HomeFurnitureVisuals';
import { fetchHomeShowcase, publishHomeShowcase, setDevShowcaseOverride } from './game/Home/HomeShowcase';
import { rebuildPlayerCompoundForTier, isPlayerInCompoundCutaway } from './game/World/PlayerCompound';
import { PresenceManager, type PresenceStatus } from './game/Multiplayer/PresenceManager';
import { LocationChatManager } from './game/Multiplayer/LocationChatManager';
import { FriendsSystem, type FriendEntry, type InboxMessageView } from './game/Multiplayer/FriendsSystem';
import type { NearbyPlayer, ChatMessageView } from './game/Multiplayer/types';
import { getLocationAt, getLocationDef, type LocationId } from './game/World/Locations';
import { TROTRO_BOARD_EVENT } from './r3f/gameAPIBridge';

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
/** Live GameAPI bridge (AI-agent skill layer routing, skills/tro-tro-system.md). */
let gameAPI: GameAPI | null = null;

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
const liveEventPillEl = document.getElementById('liveEventPill');
const liveEventTextEl = document.getElementById('liveEventText');
const placeRecoveryBtn = document.getElementById('placeRecoveryBtn') as HTMLButtonElement | null;
let currentLocationId: LocationId = 'adabraka_neighborhood';

// ---- Place-tied recovery actions (per-location food/rest chip) ----
// actionId → epoch ms when the action becomes usable again.
const recoveryCooldownUntil = new Map<string, number>();
let recoveryRenderedLocId: LocationId | null = null;

// ---- Friends + home visiting module refs ----
let friendsSystem: FriendsSystem | null = null;
let friendsSheetOpen = false;
const friendsOpenBtn = document.getElementById('friendsOpenBtn');
const friendsBadge = document.getElementById('friendsBadge');
const friendsModalBackdrop = document.getElementById('friendsModalBackdrop');
const friendsCloseBtn = document.getElementById('friendsCloseBtn');
const friendsRequestsEl = document.getElementById('friendsRequests');
const friendsListEl = document.getElementById('friendsList');
const friendsNearbyEl = document.getElementById('friendsNearby');
const friendsActivityEl = document.getElementById('friendsActivity');
const visitBannerEl = document.getElementById('visitBanner');
const visitBannerTextEl = document.getElementById('visitBannerText');
const visitLeaveBtn = document.getElementById('visitLeaveBtn');

/**
 * Active home visit session. While set, the world compound shows the
 * HOST's tier + furniture; the local player's HomeSystem state is NEVER
 * mutated (their own save is safe) and all home-editing entry points are
 * blocked until leaveVisitMode() restores the player's own compound.
 */
interface VisitSession {
  hostUid: string;
  hostName: string;
  savedTier: HousingTierId;
  hostTier: HousingTierId;
}
let visitSession: VisitSession | null = null;
const visitFurnitureMeshes: THREE.Object3D[] = [];
/** Host uids we already sent a visit ping to this session (courtesy dedupe). */
const visitPingSentFor = new Set<string>();

const economyManager = new EconomyManager();
/** Real passenger/capacity state for the ACC_TROTRO_001 van (skills v3.1). */
const trotroService = new TrotroService();
// Persist ACC_TROTRO_001 seat counts inside the economy snapshot (and
// restore them on loadFromPersistence).
economyManager.bindTrotroPassengerState(
  () => trotroService.getSnapshot(),
  (n) => trotroService.loadPassengers(n)
);
const jobSystem = new JobManager(economyManager);
const crimeSystem = new HeatSystem(economyManager);
const needsSystem = new NeedsSystem();
const homeSystem = new HomeSystem();
let homeVisuals: HomeFurnitureVisuals | null = null;
// ---- Live events + 3D nearby avatars (Task: wire dormant systems) ----
let nearbyAvatars: NearbyPlayerAvatars | null = null;
let liveEvents: LiveEventsSystem | null = null;
let lastLiveEventId: string | null = null;
let lastLiveEventShownSeconds = -1;
// ── Housing: 3D mesh registry + shared room origin ──────────────────────
// instanceId → live mesh. Lets us add/remove meshes the moment furniture is
// placed or sold, instead of waiting for the next game reload.
// Shared room origin (compound interior floor center, per PlayerCompound).
const ROOM_ORIGIN = new THREE.Vector3(-10.5, 0.24, 11.1);
// Debounce handle for the housing → Firestore cloud sync.
let housingCloudSyncTimer: ReturnType<typeof setTimeout> | null = null;
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

/** True while the local player is inside a friend's home (visit mode). */
function isVisiting(): boolean {
  return visitSession !== null;
}

/** Guard for home-editing entry points — blocked during a home visit. */
function blockIfVisiting(actionLabel = 'that'): boolean {
  if (!visitSession) return false;
  showInteractionFeedback(`Not your crib while visiting ${visitSession.hostName} — leave first.`, true);
  void actionLabel;
  return true;
}

function openHomeSheet(): void {
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
            if (phase1SceneRef) syncPlacedFurnitureMeshes(phase1SceneRef.scene);
            homeVisuals?.sync(homeSystem.getOwned(), homeSystem.getPlaced());
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

function closeHomeSheet(): void {
  document.getElementById('homeModalBackdrop')?.classList.remove('open');
}

// ── Phase-1 housing engine state ─────────────────────────────────────────────
let placementEngine: PlacementEngine | null = null;
let currentStoreCategory: string = 'all';
/** Tracks placed furniture 3D meshes by instanceId so selling can
 *  immediately remove them from the scene without waiting for reload. */
const placedFurnitureMeshes = new Map<string, THREE.Group>();

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
  placementEngine = new PlacementEngine(
    phase1.scene,
    phase1.thirdPersonCamera.camera,
    container ?? document.body,
    homeSystem,
    {
      onPlaced: (instanceId) => {
        hidePlacementHud();
        showInteractionFeedback('Placed! ✓', false);
        // Render the confirmed furniture immediately + remove any legacy
        // fixed-slot copy via the homeVisuals resync (prevents double-render).
        if (phase1SceneRef) syncPlacedFurnitureMeshes(phase1SceneRef.scene);
        homeVisuals?.sync(homeSystem.getOwned(), homeSystem.getPlaced());
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
  placementEngine.setRoomOrigin(-10.5, 0.24, 11.1);

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
  if (blockIfVisiting('the Home Store')) return;
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

function enterPlacementMode(catalogId: FurnitureId): void {
  if (blockIfVisiting('placement')) return;
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
  // Custom map integration: the R3F layer (src/r3f/TroTroBoarding.tsx) owns
  // tro-tro boarding UI — the Mate panel, fare gates and seat state. Route
  // the [E] key into that panel instead of the DOM modals
  // (skills/tro-tro-system.md [ROUTING], live bridge row).
  if (target.id === 'trotro_stop') {
    window.dispatchEvent(new CustomEvent(TROTRO_BOARD_EVENT));
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

function startGame(profile: OnboardingResult): void {
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
    phase1SceneRef = phase1;
    // GameAPI bridge — live wiring for the AI-agent skill layer
    // (skills/tro-tro-system.md [ROUTING]): every AI-facing call below
    // routes 1:1 into the owning system. Exposed on window so the agent
    // host (and devtools) can drive the game without touching internals.
    gameAPI = createGameAPI({
      economy: economyManager,
      player: phase1.player,
      input: phase1.inputManager,
      interactions: phase1.interactionSystem,
      trotro: trotroService
    });
    (window as unknown as { GameAPI?: GameAPI }).GameAPI = gameAPI;
    // Custom map: the R3F canvas owns the visible view — keep this scene
    // SIMULATING (movement, interactions, NPC rigs) but skip its renderer
    // to save GPU. Falls back to rendering if the R3F root is missing.
    if (document.getElementById('r3f-root')) {
      phase1.renderEnabled = false;
    }
    // Dev/debug handle — mirrors the window.__r3fScene/__r3fCamera pattern.
    (window as unknown as { __phase1Scene?: Phase1Scene }).__phase1Scene = phase1;
    rebuildPlayerCompoundForTier(homeSystem.getHousingTierId());
    homeVisuals = new HomeFurnitureVisuals(phase1.scene);
    // Fixed-slot rendering disabled — PlacementEngine is the sole furniture renderer;
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
      let totalSleepRestore = Math.min(100, tier.sleepEnergyRestore + bedBonus);
      // ECG Dumsor: power outage makes sleep worse — unless a Backup
      // Generator is placed in the compound (+15 instead of -15).
      const dumsorEv = liveEvents?.getActiveEvent()?.event ?? null;
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
        tier.cookHungerRestore + (liveEvents?.getActiveEvent()?.event.mealHungerBonus ?? 0),
        tier.cookEnergyBonus + (liveEvents?.getActiveEvent()?.event.recoveryEnergyBonus ?? 0)
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
      const socialMult = liveEvents?.getActiveEvent()?.event.socialBonusMultiplier ?? 1;
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

    // ── Accra Live Events: cycle world events + drive the HUD pill ─────────
    // tick() runs inside the RAF loop below (cheap Date.now check); the
    // onUpdate listener updates the pill + toasts new events.
    liveEvents = new LiveEventsSystem();
    liveEvents.onUpdate((state) => updateLiveEventPill(state));
    liveEventPillEl?.addEventListener('click', () => {
      const ev = liveEvents?.getActiveEvent();
      if (ev) {
        showInteractionFeedback(`${ev.event.icon} ${ev.event.title} · ${ev.event.description}`);
      }
    });

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
      phase1.player.position.set(-10.5, 0.08, 6.2);
      phase1.player.rotationY = Math.PI;
    });

    const tick = () => {
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
      liveEvents?.tick();
      nearbyAvatars?.update(1 / 60);
      if (homeVisuals) {
        homeVisuals.setCutawayMode(isPlayerInCompoundCutaway());
      }
      const now = performance.now();
      if (now - lastCooldownUiTickMs >= 500) {
        lastCooldownUiTickMs = now;
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

// ════════════════════════════════════════════════════════════════════════
// Friends + Home Visiting (Phase-6 social groundwork)
//
// - FriendsSystem owns the Firestore graph (friends + inbox).
// - This block owns the HUD sheet + the visit-mode world swap.
// - Visiting NEVER mutates the local player's HomeSystem: we rebuild the
//   world compound for the host's tier, spawn the host's placed furniture
//   from their validated /homes/{uid} showcase, and restore everything on
//   leave. Home-editing entry points are blocked while visiting.
// ════════════════════════════════════════════════════════════════════════

/** Human label for a presence location id; falls back to the raw id. */
function locationLabel(locId: string | undefined): string {
  if (!locId) return 'somewhere in Accra';
  try {
    return getLocationDef(locId as LocationId).displayName;
  } catch {
    return locId;
  }
}

/** Boot the friends layer. Any uid-bearing player gets the live layer —
 * accounts AND anonymous-auth guests (rules allow both: inbox creates need
 * isSignedIn, friends writes need isOwner). Only fully-offline guests
 * (no uid at all) see the sign-in prompt inside the sheet. */
function initFriends(profile: OnboardingResult): void {
  friendsSystem = new FriendsSystem({
    uid: profile.userId ?? null,
    displayName: profile.displayName || 'Chale'
  });
  if (friendsSystem && !friendsSystem.isGuest) {
    friendsSystem.enter();
  }

  // Live updates → re-render (when open) + badge.
  friendsSystem.onFriends(() => {
    if (friendsSheetOpen) renderFriendsSheet();
    updateFriendsBadge();
  });
  friendsSystem.onInbox((messages) => {
    if (friendsSheetOpen) {
      renderFriendsSheet();
      // Opening the sheet consumes transient notifications (visit pings +
      // auto-processed accepts). Requests stay until answered.
      void friendsSystem?.clearActivity();
    }
    void messages;
    updateFriendsBadge();
  });

  // Sheet open/close + click delegation for all friend actions.
  friendsOpenBtn?.addEventListener('click', () => openFriendsSheet());
  friendsCloseBtn?.addEventListener('click', () => closeFriendsSheet());
  friendsModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === friendsModalBackdrop) closeFriendsSheet();
  });
  friendsModalBackdrop?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!btn) return;
    const d = btn.dataset;
    switch (d.action) {
      case 'add': {
        if (!friendsSystem) return;
        void friendsSystem.sendFriendRequest(d.uid ?? '', d.name ?? '').then((res) => {
          showInteractionFeedback(res.ok ? `Friend request sent to ${d.name} 🤝` : res.message ?? 'Could not send request.', !res.ok);
          if (res.ok) renderFriendsSheet();
        });
        break;
      }
      case 'accept': {
        if (!friendsSystem) return;
        void friendsSystem.acceptRequest(d.msg ?? '').then((res) => {
          showInteractionFeedback(res.ok ? `You and ${d.name} are now friends 🤝` : res.message ?? 'Could not accept.', !res.ok);
        });
        break;
      }
      case 'decline': {
        if (!friendsSystem) return;
        void friendsSystem.declineRequest(d.msg ?? '').then((res) => {
          if (!res.ok) showInteractionFeedback(res.message ?? 'Could not decline.', true);
        });
        break;
      }
      case 'remove': {
        if (!friendsSystem) return;
        void friendsSystem.removeFriend(d.uid ?? '').then((res) => {
          showInteractionFeedback(res.ok ? `${d.name} removed from your friends.` : res.message ?? 'Could not remove.', !res.ok);
        });
        break;
      }
      case 'visit': {
        closeFriendsSheet();
        void enterVisitMode(d.uid ?? '', d.name ?? '');
        break;
      }
      case 'dismiss': {
        void friendsSystem?.deleteInboxMessage(d.msg ?? '');
        break;
      }
      default:
        break;
    }
  });

  // Leave-visit button on the banner.
  visitLeaveBtn?.addEventListener('click', () => leaveVisitMode());

  // DEV-ONLY E2E hooks (inert in production builds — guarded by import.meta.env.DEV).
  // Lets the headless test harness drive the social graph + visit machine
  // without depending on presence discovery or verified-email rules.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__accraFriends = friendsSystem;
    (window as unknown as Record<string, unknown>).__accraVisit = {
      enter: enterVisitMode,
      leave: leaveVisitMode,
      state: () => ({ visiting: isVisiting(), session: visitSession })
    };
    (window as unknown as Record<string, unknown>).__accraShowcase = {
      setOverride: setDevShowcaseOverride
    };
    (window as unknown as Record<string, unknown>).__accraDev = {
      /** Read the live player world position (x, y, z). */
      pos: () => {
        const p = phase1SceneRef?.player.position;
        return p ? { x: p.x, y: p.y, z: p.z } : null;
      },
      /** Teleport the player to (x, z) and snap the camera behind them. */
      teleport: (x: number, z: number) => {
        if (!phase1SceneRef) return null;
        phase1SceneRef.player.position.set(x, 0.08, z);
        phase1SceneRef.thirdPersonCamera.resetBehindPlayer(
          phase1SceneRef.player.rotationY
        );
        return { x, z };
      },
      /** Which location def the given (or current) position resolves to. */
      loc: (x?: number, z?: number) => {
        const p = phase1SceneRef?.player.position;
        return getLocationAt(x ?? p!.x, z ?? p!.z).id;
      }
    };
  }
}

function openFriendsSheet(): void {
  friendsSheetOpen = true;
  friendsModalBackdrop?.classList.add('open');
  renderFriendsSheet();
  updateFriendsBadge();
}

function closeFriendsSheet(): void {
  friendsSheetOpen = false;
  friendsModalBackdrop?.classList.remove('open');
}

/** Pending badge = unanswered requests + unseen visit pings. */
function updateFriendsBadge(): void {
  if (!friendsBadge) return;
  const requests = friendsSystem?.getPendingRequestCount() ?? 0;
  const pings = friendsSystem
    ? friendsSystem.getInbox().filter((m) => m.type === 'home_visit').length
    : 0;
  const total = requests + pings;
  if (total > 0) {
    friendsBadge.textContent = total > 99 ? '99+' : String(total);
    friendsBadge.classList.remove('zero');
  } else {
    friendsBadge.classList.add('zero');
  }
}

/** Render every section of the friends sheet from live system state. */
function renderFriendsSheet(): void {
  if (!friendsRequestsEl || !friendsListEl || !friendsNearbyEl || !friendsActivityEl) return;

  // ── 1. Pending friend requests ─────────────────────────────────────────
  const requests: InboxMessageView[] = friendsSystem
    ? friendsSystem.getInbox().filter((m) => m.type === 'friend_request')
    : [];
  if (!friendsSystem || friendsSystem.isGuest || requests.length === 0) {
    friendsRequestsEl.innerHTML = '';
    friendsRequestsEl.style.display = 'none';
  } else {
    friendsRequestsEl.style.display = 'block';
    friendsRequestsEl.innerHTML = requests
      .map(
        (m) => `
        <div class="friend-request-row">
          <span class="fr-name">${escapeHtml(m.fromName)}</span>
          <span class="fr-label">wants to be your chale</span>
          <span class="fr-actions">
            <button class="econ-action-btn accept" type="button" data-action="accept" data-msg="${escapeHtml(m.id)}" data-name="${escapeHtml(m.fromName)}">✓ Accept</button>
            <button class="econ-action-btn decline" type="button" data-action="decline" data-msg="${escapeHtml(m.id)}" data-name="${escapeHtml(m.fromName)}">✕</button>
          </span>
        </div>`
      )
      .join('');
  }

  // ── 2. Friends list ─────────────────────────────────────────────────────
  if (!friendsSystem || friendsSystem.isGuest) {
    friendsListEl.innerHTML =
      '<div class="friends-empty">Sign in with a verified email to make friends, visit homes & build your Accra crew.</div>';
  } else {
    const friends: FriendEntry[] = friendsSystem.getFriends();
    if (friends.length === 0) {
      friendsListEl.innerHTML =
        '<div class="friends-empty">No friends yet. Meet players at any location — say hi in chat, then add them here.</div>';
    } else {
      friendsListEl.innerHTML = friends
        .map((f) => {
          const status = f.online
            ? `<span class="friend-dot online"></span>${escapeHtml(locationLabel(f.currentLocation))}`
            : '<span class="friend-dot"></span>offline';
          return `
          <div class="friend-row">
            <div class="friend-main">
              <strong class="friend-name">${escapeHtml(f.displayName)}</strong>
              <span class="friend-sub">${status}</span>
            </div>
            <div class="friend-actions">
              <button class="econ-action-btn visit" type="button" data-action="visit" data-uid="${escapeHtml(f.uid)}" data-name="${escapeHtml(f.displayName)}">🏠 Visit</button>
              <button class="econ-action-btn decline" type="button" data-action="remove" data-uid="${escapeHtml(f.uid)}" data-name="${escapeHtml(f.displayName)}" title="Remove friend">✕</button>
            </div>
          </div>`;
        })
        .join('');
    }
  }

  // ── 3. Players here (add-friend entry point) ───────────────────────────
  const nearby: NearbyPlayer[] = presenceManager?.getNearby() ?? [];
  if (!friendsSystem || friendsSystem.isGuest) {
    friendsNearbyEl.innerHTML = '';
    friendsNearbyEl.style.display = 'none';
  } else {
    const addable = nearby.filter(
      (p) => !friendsSystem?.isFriend(p.uid) && !friendsSystem?.hasRequested(p.uid) && !isPendingRequestFrom(p.uid)
    );
    if (addable.length === 0) {
      friendsNearbyEl.style.display = 'block';
      friendsNearbyEl.innerHTML =
        '<div class="friends-section-label">Players here</div><div class="friends-empty">Nobody new here right now — walk to another spot.</div>';
    } else {
      friendsNearbyEl.style.display = 'block';
      friendsNearbyEl.innerHTML =
        '<div class="friends-section-label">Players here</div>' +
        addable
          .map(
            (p) => `
          <div class="friend-row">
            <div class="friend-main">
              <strong class="friend-name">${escapeHtml(p.displayName)}</strong>
              <span class="friend-sub"><span class="friend-dot online"></span>here with you</span>
            </div>
            <div class="friend-actions">
              <button class="econ-action-btn visit" type="button" data-action="add" data-uid="${escapeHtml(p.uid)}" data-name="${escapeHtml(p.displayName)}">+ Add Chale</button>
            </div>
          </div>`
          )
          .join('');
    }
  }

  // ── 4. Activity (visit pings + processed accepts) ──────────────────────
  const activity: InboxMessageView[] = friendsSystem
    ? friendsSystem.getInbox().filter((m) => m.type === 'home_visit' || m.type === 'friend_accept')
    : [];
  if (activity.length === 0) {
    friendsActivityEl.innerHTML = '';
    friendsActivityEl.style.display = 'none';
  } else {
    friendsActivityEl.style.display = 'block';
    friendsActivityEl.innerHTML =
      '<div class="friends-section-label">Activity</div>' +
      activity
        .map((m) => {
          const line =
            m.type === 'home_visit'
              ? `🏠 ${escapeHtml(m.fromName)} stopped by your place`
              : `🤝 You and ${escapeHtml(m.fromName)} are now friends`;
          return `
          <div class="friend-activity-row">
            <span>${line}</span>
            <button class="econ-action-btn decline" type="button" data-action="dismiss" data-msg="${escapeHtml(m.id)}" title="Dismiss">✕</button>
          </div>`;
        })
        .join('');
  }
}

function isPendingRequestFrom(uid: string): boolean {
  return friendsSystem
    ? friendsSystem.getInbox().some((m) => m.type === 'friend_request' && m.fromUid === uid)
    : false;
}

// ── Visit mode: temporarily live inside a friend's home ────────────────────

/**
 * Swap the world compound to the host's home and teleport the player to
 * the compound gate. The host's layout comes from their validated
 * /homes/{uid} showcase — nothing foreign ever reaches the renderer raw.
 * The local player's HomeSystem state is left completely untouched.
 */
async function enterVisitMode(hostUid: string, hostName: string): Promise<void> {
  if (!phase1SceneRef) return;
  if (!friendsSystem || friendsSystem.isGuest) {
    showInteractionFeedback('Sign in to visit homes.', true);
    return;
  }
  if (!isValidUidStr(hostUid)) {
    showInteractionFeedback('Bad host id.', true);
    return;
  }
  if (visitSession) leaveVisitMode();

  showInteractionFeedback(`Knocking on ${hostName}'s door…`);
  const showcase = await fetchHomeShowcase(hostUid);
  if (!showcase) {
    showInteractionFeedback(`${hostName}'s home isn't published yet — they need to play once on the new build.`, true);
    return;
  }
  if (!phase1SceneRef) return; // scene can die while awaiting the fetch

  const scene = phase1SceneRef.scene;
  visitSession = {
    hostUid,
    hostName,
    savedTier: homeSystem.getHousingTierId(),
    hostTier: showcase.tier
  };

  // 1) Teardown OUR furniture meshes + legacy fixed-slot visuals.
  for (const [, mesh] of placedFurnitureMeshes) {
    scene.remove(mesh);
    disposeObject3D(mesh);
  }
  placedFurnitureMeshes.clear();
  homeVisuals?.sync([], []);

  // 2) Host compound + furniture (validated catalog ids only).
  rebuildPlayerCompoundForTier(showcase.tier);
  for (const item of showcase.placed) {
    const mesh = buildPlacedFurnitureMesh(
      {
        catalogId: item.catalogId as FurnitureId,
        x: item.x,
        z: item.z,
        rotationY: item.rotationY
      },
      ROOM_ORIGIN
    );
    scene.add(mesh);
    visitFurnitureMeshes.push(mesh);
  }

  // 3) Teleport to the compound gate (same respawn spot as arrests).
  phase1SceneRef.player.position.set(-10.5, 0.08, 6.2);
  phase1SceneRef.player.rotationY = Math.PI;

  // 4) Banner + courtesy ping to the host (once per host per session).
  updateVisitBanner();
  visitBannerEl?.classList.add('visible');
  if (!visitPingSentFor.has(hostUid)) {
    visitPingSentFor.add(hostUid);
    void friendsSystem.sendVisitPing(hostUid, hostName);
  }
  showInteractionFeedback(`Welcome to ${hostName}'s place — make yourself at home.`);
}

/** Restore the player's own compound, furniture, position and HUD. */
function leaveVisitMode(): void {
  if (!visitSession || !phase1SceneRef) return;
  const scene = phase1SceneRef.scene;

  for (const mesh of visitFurnitureMeshes) {
    scene.remove(mesh);
    disposeObject3D(mesh);
  }
  visitFurnitureMeshes.length = 0;

  rebuildPlayerCompoundForTier(visitSession.savedTier);
  homeVisuals?.sync(homeSystem.getOwned(), homeSystem.getPlaced());
  syncPlacedFurnitureMeshes(scene);

  phase1SceneRef.player.position.set(-10.5, 0.08, 6.2);
  phase1SceneRef.player.rotationY = Math.PI;

  const hostName = visitSession.hostName;
  visitSession = null;
  visitBannerEl?.classList.remove('visible');
  showInteractionFeedback(`Back at your own crib. Thanks for visiting ${hostName}!`);
}

function updateVisitBanner(): void {
  if (!visitBannerTextEl || !visitSession) return;
  const tier = HOUSING_TIERS.find((t) => t.id === visitSession?.hostTier) ?? HOUSING_TIERS[0];
  visitBannerTextEl.textContent = `🏠 Visiting ${visitSession.hostName} — ${tier.title}`;
}

/** Shared disposal for visit meshes (same hygiene as mesh sync). */
function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose?.();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose?.());
      else mat?.dispose?.();
    }
  });
}

function isValidUidStr(s: string): boolean {
  return typeof s === 'string' && s.length >= 1 && s.length <= 128;
}

// ── Task: wire dormant systems (live events pill + housing cloud sync) ─────

/**
 * Diff `homeSystem.getPlaced()` against the 3D mesh registry: spawns meshes
 * for new instances, removes + disposes meshes for sold/replaced instances.
 * Keeps the scene in sync with HomeSystem state WITHOUT a game reload —
 * covers initial load, placement confirm, sell, and cloud restore.
 */
function syncPlacedFurnitureMeshes(scene: THREE.Scene): void {
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
function updateLiveEventPill(state: ActiveLiveEventState): void {
  const secs = Math.max(0, Math.round(state.remainingSeconds));
  if (state.event.id === lastLiveEventId && secs === lastLiveEventShownSeconds) return;
  const isNewEvent = state.event.id !== lastLiveEventId;
  lastLiveEventId = state.event.id;
  lastLiveEventShownSeconds = secs;
  if (liveEventTextEl) {
    const mm = Math.floor(secs / 60);
    const ss = String(secs % 60).padStart(2, '0');
    liveEventTextEl.textContent = `${state.event.icon} ${state.event.shortBanner} · ${mm}:${ss}`;
  }
  liveEventPillEl?.setAttribute(
    'title',
    `${state.event.title} — ${state.event.description} (${state.event.effectSummary})`
  );
  if (isNewEvent) {
    showInteractionFeedback(`${state.event.icon} ${state.event.title} — ${state.event.effectSummary}`);
  }
}

/**
 * Debounced housing → Firestore sync. Fires 4s after the last home change
 * (buy / place / sell / upgrade) so rapid furniture shuffles coalesce into
 * one write. Guests are localStorage-only and skip this entirely.
 */
function scheduleHousingCloudSync(state: HomeState): void {
  if (!isAccountMode) return;
  if (housingCloudSyncTimer) clearTimeout(housingCloudSyncTimer);
  housingCloudSyncTimer = setTimeout(() => {
    housingCloudSyncTimer = null;
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
async function restoreHousingFromCloud(): Promise<void> {
  const cloud = await economyManager.wallet.loadHousingFromFirebase();
  if (!cloud) return;
  const changed = homeSystem.hydrateCloudState({
    housingTier: cloud.housingTier as HousingTierId,
    unlockedTiers: cloud.unlockedTiers as HousingTierId[],
    owned: cloud.owned as FurnitureId[],
    placed: cloud.placed as PlacedFurnitureInstance[]
  });
  if (changed && phase1SceneRef) {
    rebuildPlayerCompoundForTier(homeSystem.getHousingTierId());
    homeVisuals?.sync(homeSystem.getOwned(), homeSystem.getPlaced());
    syncPlacedFurnitureMeshes(phase1SceneRef.scene);
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

  // 3D avatars: one character rig per nearby signed-in player. Presence
  // snapshots (20s heartbeats) are smoothed by the avatar system's lerp.
  // Guests never subscribe to presence, so they simply see nobody —
  // consistent with the HUD's read-only guest mode.
  nearbyAvatars = new NearbyPlayerAvatars(phase1.scene);

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
    // Cloud save restore: pull the player's housing snapshot (tier + owned
    // + placed furniture) once auth is known-good, then rebuild the world.
    void restoreHousingFromCloud();
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

  // Friends + home visiting (accounts get the live layer; guests see a
  // sign-in prompt inside the sheet).
  initFriends(profile);

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
    // Spawn/despawn/update the 3D rigs for nearby players.
    nearbyAvatars?.syncFromNearby(players);
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
      updatePlaceRecoveryButton(true);
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

/**
 * Syncs the place-recovery HUD chip to the current location's action.
 * While a cooldown is active, shows a live "icon + seconds" countdown;
 * once idle, restores the action's short pill label. Called on the 500ms
 * UI cadence and forced on location change / boot — the idle fast path
 * skips DOM writes entirely when the chip already matches this location.
 */
function updatePlaceRecoveryButton(force = false): void {
  if (!placeRecoveryBtn) return;
  const action = getLocationDef(currentLocationId).recoveryAction;
  const cooldownLeftMs = Math.max(0, (recoveryCooldownUntil.get(action.id) ?? 0) - Date.now());
  const cooldownLeftSecs = Math.ceil(cooldownLeftMs / 1000);
  if (
    !force &&
    cooldownLeftMs <= 0 &&
    recoveryRenderedLocId === currentLocationId &&
    !placeRecoveryBtn.disabled
  ) {
    return;
  }
  if (cooldownLeftMs > 0) {
    placeRecoveryBtn.disabled = true;
    placeRecoveryBtn.textContent = `${action.icon} ${cooldownLeftSecs}s`;
    placeRecoveryBtn.title = `${action.label} — ready in ${cooldownLeftSecs}s`;
  } else {
    placeRecoveryBtn.disabled = false;
    placeRecoveryBtn.textContent = action.shortPillLabel;
    placeRecoveryBtn.title = `${action.label} · cooldown ${action.cooldownSeconds}s`;
    recoveryRenderedLocId = currentLocationId;
  }
}

/**
 * Runs the current location's recovery action: pays (if it costs), restores
 * hunger/energy, sheds heat, then starts the action's cooldown. Refuses
 * gracefully (no charge) when the player is already full/rested or broke.
 */
function performPlaceRecoveryAction(): void {
  const action = getLocationDef(currentLocationId).recoveryAction;
  const nowMs = Date.now();
  const cooldownLeftMs = Math.max(0, (recoveryCooldownUntil.get(action.id) ?? 0) - nowMs);
  if (cooldownLeftMs > 0) {
    showInteractionFeedback(`Wait ${Math.ceil(cooldownLeftMs / 1000)}s first.`, true);
    return;
  }

  // Mirror the systems' own refusal thresholds so the player is never
  // charged for a no-op (eatMeal refuses at hunger≥96+energy≥96,
  // restLight refuses at energy≥95).
  if (action.hungerRestore > 0) {
    const n = needsSystem.getState();
    if (n.hunger >= 96 && n.energy >= 96) {
      showInteractionFeedback('You’re full and rested — no need right now.', true);
      return;
    }
  } else if (action.energyRestore > 0) {
    if (needsSystem.getState().energy >= 95) {
      showInteractionFeedback('Already rested.', true);
      return;
    }
  }

  if (action.costGHS > 0) {
    const wallet = economyManager.wallet;
    if (!wallet.canAfford(action.costGHS)) {
      showInteractionFeedback(`Need ₵${action.costGHS} for that.`, true);
      return;
    }
    wallet.spendMoney({
      amount: action.costGHS,
      category: 'FOOD',
      description: action.label
    });
    syncEconomyHUD();
  }

  if (action.hungerRestore > 0) {
    needsSystem.eatMeal(action.label, action.hungerRestore, action.energyRestore);
  } else if (action.energyRestore > 0) {
    needsSystem.restLight(action.energyRestore, action.label);
  }
  if (action.heatReduction > 0) {
    crimeSystem.reduceHeatBy(action.heatReduction);
  }

  recoveryCooldownUntil.set(action.id, nowMs + action.cooldownSeconds * 1000);
  showInteractionFeedback(action.feedbackText);
  updatePlaceRecoveryButton(true);
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
