import { Phase1Scene } from './game/Core/Phase1Scene';
import { startOnboarding, type OnboardingResult } from './onboarding';
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

const economyManager = new EconomyManager();
const jobSystem = new JobManager(economyManager);
const crimeSystem = new HeatSystem(economyManager);
const needsSystem = new NeedsSystem();
const homeSystem = new HomeSystem();
let homeVisuals: HomeFurnitureVisuals | null = null;
let playerDisplayName = 'Chale';

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
  const hBar = document.getElementById('needHungerBar');
  const eBar = document.getElementById('needEnergyBar');
  const hVal = document.getElementById('needHungerVal');
  const eVal = document.getElementById('needEnergyVal');
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
  const txContainer = document.getElementById('walletDiagTxList');
  const wallet = economyManager.wallet;
  const cash = wallet.getCashBalance();
  const txs = wallet.getTransactions();

  if (balEl) {
    balEl.textContent = formatGHS(cash);
  }
  if (srcEl) {
    srcEl.textContent = `Persisted: ${txs.length} tx · Earned ${formatGHS(wallet.getLifetimeEarned())}`;
  }
  if (txContainer) {
    if (txs.length === 0) {
      txContainer.innerHTML =
        '<div style="font-size:0.54rem;color:#888">No transactions in store yet.</div>';
    } else {
      txContainer.innerHTML = txs
        .slice(0, 3)
        .map((tx) => {
          const sign = tx.type === 'INCOME' ? '+' : '-';
          const color = tx.type === 'INCOME' ? '#66ff66' : '#ff6666';
          return `<div class="wallet-diag-tx"><span style="overflow:hidden;text-overflow:ellipsis">${tx.description}</span><strong style="color:${color};flex-shrink:0">${sign}${formatGHS(tx.amount)}</strong></div>`;
        })
        .join('');
    }
  }
}

function syncEconomyHUD(): void {
  const cash = economyManager.wallet.getCashBalance();
  if (hudCashAmountEl) hudCashAmountEl.textContent = formatGHS(cash);
  const tier = economyManager.getProgressionInfo();
  if (progressionTierBadgeEl) progressionTierBadgeEl.textContent = tier.title;
  const heat = crimeSystem.getHeatLevel();
  const status = crimeSystem.getPoliceStatus();
  if (heatStatusPillEl && heatStatusTextEl) {
    heatStatusPillEl.classList.remove('suspicious', 'wanted', 'arrested');
    if (status === 'SUSPICIOUS') heatStatusPillEl.classList.add('suspicious');
    else if (status === 'WANTED') heatStatusPillEl.classList.add('wanted');
    else if (status === 'ARRESTED') heatStatusPillEl.classList.add('arrested');
    heatStatusTextEl.textContent =
      status === 'CLEAN' || status === 'NORMAL' ? 'Clean' : `${status} (${heat}%)`;
  }
  const obj = getActiveObjectiveInfo();
  if (activeObjectiveBannerEl && objTagEl && objTitleEl) {
    if (obj) {
      activeObjectiveBannerEl.classList.add('visible');
      activeObjectiveBannerEl.classList.toggle('risky', obj.isRisky);
      objTagEl.textContent = obj.tag;
      objTitleEl.textContent = obj.title;
      if (objDescEl) objDescEl.textContent = '';
    } else {
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

function renderModalTabContent(): void {
  if (!modalBodyContent || !modalHeaderTitle || !modalHeaderSub) return;
  modalBodyContent.innerHTML = '';
  const cash = economyManager.wallet.getCashBalance();
  const tier = economyManager.getProgressionInfo();

  if (currentModalTab === 'jobs') {
    modalHeaderTitle.textContent = `Jobs · ${formatGHS(cash)}`;
    modalHeaderSub.textContent = `${tier.title}${
      currentFocusedInteractableId ? ` · Nearby: ${currentFocusedInteractableId}` : ''
    }`;

    const activeJob = jobSystem.getActiveJob();
    const availableJobs = jobSystem.getAvailableJobs(currentFocusedInteractableId);

    for (const job of availableJobs) {
      const isThisActive = activeJob?.job.id === job.id;
      const isSpotMatch =
        currentFocusedInteractableId !== null &&
        job.startInteractableId === currentFocusedInteractableId;
      const completedShifts = jobSystem.getCompletedCount(job.id);

      const card = document.createElement('div');
      card.className = 'econ-card';
      if (isThisActive) {
        card.style.borderColor = 'rgba(102, 255, 102, 0.55)';
      } else if (isSpotMatch) {
        card.style.borderColor = 'rgba(255, 204, 0, 0.5)';
      }

      const stepsHtml = job.steps
        .map((step, idx) => {
          const isCurrentStep = isThisActive && activeJob?.stepIndex === idx;
          const isDoneStep = isThisActive && activeJob ? idx < activeJob.stepIndex : false;
          const color = isCurrentStep ? '#ffcc00' : isDoneStep ? '#66ff66' : '#9a9a9a';
          const prefix = isDoneStep ? '✓' : `${idx + 1}.`;
          return `<div style="font-size:0.66rem;color:${color};margin-top:2px">${prefix} ${step.stepTitle} · <span style="opacity:0.85">${step.targetLocationName}</span></div>`;
        })
        .join('');

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title">${job.title}</strong>
          <span class="econ-pay-badge">+${formatGHS(job.payGHS)}</span>
        </div>
        <p style="margin:4px 0;font-size:0.66rem;color:#9a9a9a">
          ${job.employerName} · ${job.steps.length} steps${
            completedShifts > 0 ? ` · Completed: ${completedShifts}` : ''
          }
        </p>
        <p style="margin:4px 0 6px;font-size:0.72rem;color:#d8d8d8">${job.summary}</p>
        <div style="margin:4px 0 8px;padding:6px 8px;background:rgba(0,0,0,0.45);border-left:2px solid ${
          isThisActive ? '#66ff66' : '#ffcc00'
        }">
          ${stepsHtml}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="econ-action-btn" data-action="accept" type="button">
            ${
              isThisActive && activeJob
                ? `In Progress · Step ${activeJob.stepIndex + 1}/${activeJob.totalSteps}`
                : 'Accept Job'
            }
          </button>
          ${
            isThisActive
              ? '<button class="econ-action-btn" data-action="cancel" type="button" style="background:transparent;color:#f0f0f0;border:1px solid rgba(255,255,255,0.28)">Cancel</button>'
              : ''
          }
        </div>
      `;

      const acceptBtn = card.querySelector<HTMLButtonElement>('button[data-action="accept"]');
      if (acceptBtn) {
        if (isThisActive) {
          acceptBtn.disabled = true;
        } else {
          acceptBtn.addEventListener('click', () => {
            if (crimeSystem.getActiveIllegalHustle()) {
              showInteractionFeedback('Finish or cancel your active risky hustle first.', true);
              return;
            }
            const gate = needsSystem.canWork();
            if (!gate.ok) {
              showInteractionFeedback(gate.reason || 'Cannot work.', true);
              return;
            }
            const res = jobSystem.acceptJob(job.id);
            if (res.success) {
              const aj = jobSystem.getActiveJob();
              showInteractionFeedback(`Job on · ${aj ? aj.currentStep.stepTitle : 'Go'}`);
              closeEconomyModal();
            } else {
              showInteractionFeedback(res.message, true);
            }
            syncEconomyHUD();
          });
        }
      }

      const cancelBtn = card.querySelector<HTMLButtonElement>('button[data-action="cancel"]');
      cancelBtn?.addEventListener('click', () => {
        showInteractionFeedback(jobSystem.cancelActiveWork());
        renderModalTabContent();
        syncEconomyHUD();
      });

      modalBodyContent.appendChild(card);
    }
    return;
  }

  if (currentModalTab === 'hustles') {
    modalHeaderTitle.textContent = `Hustles · ${formatGHS(cash)}`;
    modalHeaderSub.textContent = `Police Heat: ${crimeSystem.getHeatLevel()}% · ${crimeSystem.getPoliceStatus()}`;

    const activeHustle = jobSystem.getActiveHustle();
    const availableHustles = jobSystem.getAvailableSideHustles(currentFocusedInteractableId);

    for (const hustle of availableHustles) {
      const isThisActive = activeHustle?.hustle.id === hustle.id;
      const card = document.createElement('div');
      card.className = 'econ-card';
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong class="econ-card-title">${hustle.title}</strong><span class="econ-pay-badge">+${formatGHS(hustle.grossPayoutGHS)}</span></div><p style="margin:4px 0;font-size:0.65rem;color:#9a9a9a">${hustle.upfrontCapitalGHS > 0 ? `Need ${formatGHS(hustle.upfrontCapitalGHS)} first` : '₵0 start'} · ${hustle.steps.length} steps</p><p style="margin:2px 0 8px;font-size:0.7rem;color:#d0d0d0">${hustle.summary}</p><button class="econ-action-btn" type="button">${isThisActive ? 'Active' : hustle.upfrontCapitalGHS > 0 ? `Start · ${formatGHS(hustle.upfrontCapitalGHS)}` : 'Start'}</button>`;
      const btn = card.querySelector('button');
      if (btn) {
        if (isThisActive) btn.disabled = true;
        else
          btn.addEventListener('click', () => {
            if (crimeSystem.getActiveIllegalHustle()) {
              showInteractionFeedback('Finish or cancel your active risky hustle first.', true);
              return;
            }
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

    const activeIllegal = crimeSystem.getActiveIllegalHustle();
    for (const risky of ACCRA_ILLEGAL_HUSTLES) {
      const isThisActive = activeIllegal?.hustle.id === risky.id;
      const card = document.createElement('div');
      card.className = 'econ-card';
      card.style.borderColor = 'rgba(255,51,51,0.38)';
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong class="econ-card-title" style="color:#ff6666">${risky.title}</strong><span class="econ-pay-badge" style="border-color:#ff3333;color:#ff6666">+${formatGHS(risky.payoutGHS)}</span></div><p style="margin:4px 0;font-size:0.65rem;color:#ff9999">${risky.riskLabel}</p><p style="margin:2px 0 8px;font-size:0.7rem;color:#d0d0d0">${risky.summary}</p><button class="econ-action-btn" style="background:#ff3333;color:#fff" type="button">${isThisActive ? 'Deal Active' : 'Start Risky Deal'}</button>`;
      const btn = card.querySelector('button');
      if (btn) {
        if (isThisActive) btn.disabled = true;
        else
          btn.addEventListener('click', () => {
            const hasLegalWork = Boolean(jobSystem.getActiveJob() || jobSystem.getActiveHustle());
            const res = crimeSystem.startIllegalHustle(risky.id, hasLegalWork);
            showInteractionFeedback(res.message, !res.success);
            if (res.success) closeEconomyModal();
            syncEconomyHUD();
          });
      }
      modalBodyContent.appendChild(card);
    }
    return;
  }

  if (currentModalTab === 'spend') {
    modalHeaderTitle.textContent = `Spend · ${formatGHS(cash)}`;
    modalHeaderSub.textContent = 'Everyday Accra food, transport & essentials';

    for (const item of Object.values(ACCRA_EVERYDAY_EXPENSES)) {
      const card = document.createElement('div');
      card.className = 'econ-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title">${item.title}</strong>
          <span class="econ-pay-badge">${formatGHS(item.costGHS)}</span>
        </div>
        <p style="margin:4px 0 8px;font-size:0.7rem;color:#d0d0d0">${item.description}</p>
        <button class="econ-action-btn" type="button">Buy · ${formatGHS(item.costGHS)}</button>
      `;
      const btn = card.querySelector('button');
      btn?.addEventListener('click', () => {
        const res = economyManager.purchaseEverydayExpense(item.id);
        if (res.success && item.id === 'EXP_WAAKYE_MEAL') {
          needsSystem.eatMeal('Waakye');
        }
        showInteractionFeedback(res.message, !res.success);
        renderModalTabContent();
        syncEconomyHUD();
      });
      modalBodyContent.appendChild(card);
    }
    return;
  }

  // Wallet & Firebase Persistence Diagnostic Tab
  const wallet = economyManager.wallet;
  const txList = wallet.getTransactions();
  modalHeaderTitle.textContent = `Wallet & Store · ${formatGHS(cash)}`;
  modalHeaderSub.textContent = `${tier.title} · Persistence & Transaction Ledger`;

  const diagCard = document.createElement('div');
  diagCard.className = 'econ-card';
  diagCard.style.borderColor = 'rgba(102, 255, 102, 0.4)';
  diagCard.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <strong class="econ-card-title">Wallet Persistence Diagnostic</strong>
      <span class="econ-pay-badge">${formatGHS(wallet.getCashBalance())}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0;font-size:0.68rem;color:#d0d0d0">
      <div>Cash Balance: <strong style="color:#66ff66">${formatGHS(wallet.getCashBalance())}</strong></div>
      <div>MoMo / Bank: <strong>${formatGHS(wallet.getMomoBalance() + wallet.getBankBalance())}</strong></div>
      <div>Lifetime Earned: <strong>${formatGHS(wallet.getLifetimeEarned())}</strong></div>
      <div>Lifetime Spent: <strong>${formatGHS(wallet.getLifetimeSpent())}</strong></div>
      <div>Illicit Cash: <strong style="color:#ff9999">${formatGHS(wallet.getUnsecuredIllegalCash())}</strong></div>
      <div>Transactions: <strong>${txList.length} stored</strong></div>
    </div>
    <p id="walletStoreSyncStatus" style="margin:4px 0 8px;font-size:0.65rem;color:#9a9a9a">
      Store state synced · Reloads automatically from Firebase /players/{uid} & local store.
    </p>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="econ-action-btn" data-diag="reload" type="button">Reload from Firebase Store</button>
      <button class="econ-action-btn" data-diag="sync" type="button" style="background:transparent;color:#f0f0f0;border:1px solid rgba(255,255,255,0.28)">Sync Now</button>
    </div>
  `;

  const statusLine = diagCard.querySelector<HTMLElement>('#walletStoreSyncStatus');
  const reloadBtn = diagCard.querySelector<HTMLButtonElement>('button[data-diag="reload"]');
  const syncBtn = diagCard.querySelector<HTMLButtonElement>('button[data-diag="sync"]');

  reloadBtn?.addEventListener('click', async () => {
    if (statusLine) statusLine.textContent = 'Reading wallet & transactions from store…';
    const loaded = await wallet.loadFromFirebase();
    syncEconomyHUD();
    renderModalTabContent();
    showInteractionFeedback(
      loaded
        ? `Reloaded ${formatGHS(loaded.cashBalance)} (${loaded.transactions.length} tx)`
        : 'Store verified (₵0)'
    );
  });

  syncBtn?.addEventListener('click', async () => {
    if (statusLine) statusLine.textContent = 'Writing wallet & transactions to store…';
    wallet.persistState();
    const cloudSaved = await wallet.saveToFirebase();
    if (statusLine) {
      statusLine.textContent = cloudSaved
        ? 'Synced to Firebase Firestore (/players/{uid}) & local store.'
        : 'Saved to local persistence cache (sign in to sync cloud document).';
    }
    showInteractionFeedback(cloudSaved ? 'Synced to Firebase' : 'Saved locally');
  });

  modalBodyContent.appendChild(diagCard);

  const historyHeading = document.createElement('div');
  historyHeading.style.cssText =
    'font-size:0.68rem;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;color:#ffcc00;margin:4px 0 2px';
  historyHeading.textContent = `Recent Transaction History (${txList.length})`;
  modalBodyContent.appendChild(historyHeading);

  if (txList.length === 0) {
    const emptyEl = document.createElement('p');
    emptyEl.style.cssText = 'color:#9a9a9a;font-size:0.74rem;margin:4px 0';
    emptyEl.textContent =
      'No transactions recorded yet. Complete a job shift or side hustle in Adabraka to record your first transaction.';
    modalBodyContent.appendChild(emptyEl);
  } else {
    for (const tx of txList.slice(0, 15)) {
      const row = document.createElement('div');
      row.className = 'econ-card';
      const isIncome = tx.type === 'INCOME';
      const sign = isIncome ? '+' : '-';
      const color = isIncome ? '#66ff66' : '#ff6666';
      const timeLabel = new Date(tx.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-size:0.74rem;font-weight:700;color:#f0f0f0">${tx.description}</span>
          <span style="font-size:0.78rem;font-weight:900;color:${color}">${sign}${formatGHS(tx.amount)}</span>
        </div>
        <p style="margin:3px 0 0;font-size:0.62rem;color:#9a9a9a">
          ${tx.category} · ${tx.channel} · Balance After: ${formatGHS(tx.balanceAfter)} · ${timeLabel}
        </p>
      `;
      modalBodyContent.appendChild(row);
    }
  }
}

function openHomeSheet(): void {
  const backdrop = document.getElementById('homeModalBackdrop');
  const flexEl = document.getElementById('homeFlexScore');
  const list = document.getElementById('homeFurnList');
  if (flexEl) flexEl.textContent = `Flex ${homeSystem.getFlexScore()} · ${homeSystem.getFlexLabel()}`;
  if (list) {
    list.innerHTML = '';
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
    if (!economyManager.canAfford(12, 'CASH')) {
      showInteractionFeedback('Need ₵12', true);
      return;
    }
    const buy = economyManager.purchaseEverydayExpense('EXP_WAAKYE_MEAL');
    if (buy.success) {
      needsSystem.eatMeal('Waakye');
      showInteractionFeedback('+Hunger');
    } else showInteractionFeedback(buy.message || 'No', true);
    syncEconomyHUD();
    return;
  }

  if (target.id === 'npc_older_001') {
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

  void economyManager.wallet.loadFromFirebase().then(() => {
    syncEconomyHUD();
  });

  document.getElementById('walletDiagToggle')?.addEventListener('click', () => {
    document.getElementById('walletDiagBody')?.classList.toggle('collapsed');
  });
  document.getElementById('walletDiagReloadBtn')?.addEventListener('click', async () => {
    const loaded = await economyManager.wallet.loadFromFirebase();
    syncEconomyHUD();
    showInteractionFeedback(
      loaded
        ? `Store Reloaded: ${formatGHS(loaded.cashBalance)} (${loaded.transactions.length} tx)`
        : 'Store Reloaded (₵0.00)'
    );
  });
  document.getElementById('walletDiagOpenLedgerBtn')?.addEventListener('click', () => {
    openEconomyModal('wallet');
  });

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

    document.getElementById('homeModalClose')?.addEventListener('click', () => closeHomeSheet());
    document.getElementById('homeModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('homeModalBackdrop')) closeHomeSheet();
    });
    document.getElementById('homeRestBtn')?.addEventListener('click', () => {
      const rest = needsSystem.sleep();
      showInteractionFeedback(rest.success ? '+Energy' : rest.message, !rest.success);
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

    crimeSystem.onArrest(() => {
      phase1.player.position.set(-10.5, 0.08, 6.2);
      phase1.player.rotationY = Math.PI;
    });

    const tick = () => {
      crimeSystem.tickHeatDecay(1 / 60);
      needsSystem.tick(1 / 60);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    walletOpenBtn?.addEventListener('click', () => openEconomyModal('wallet'));
    workMenuOpenBtn?.addEventListener('click', () => openEconomyModal('jobs'));
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
      showInteractionFeedback(jobSystem.cancelActiveWork());
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
  }
}

startOnboarding((profile) => startGame(profile));
