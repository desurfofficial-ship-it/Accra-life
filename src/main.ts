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
  const hVal = document.getElementById('needEnergyVal');
  const eVal = document.getElementById('needEnergyVal');
  const hBar2 = document.getElementById('needHungerBar');
  const eBar2 = document.getElementById('needEnergyBar');
  const hVal2 = document.getElementById('needHungerVal');
  const eVal2 = document.getElementById('needEnergyVal');
  if (hBar2) {
    hBar2.style.width = `${Math.round(state.hunger)}%`;
    hBar2.classList.toggle('low', state.hunger < 25);
  }
  if (eBar2) {
    eBar2.style.width = `${Math.round(state.energy)}%`;
    eBar2.classList.toggle('low', state.energy < 25);
  }
  if (hVal2) hVal2.textContent = String(Math.round(state.hunger));
  if (eVal2) eVal2.textContent = String(Math.round(state.energy));
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
    heatStatusTextEl.textContent = status === 'NORMAL' ? 'Clean' : `${status} (${heat}%)`;
  }
  const obj = getActiveObjectiveInfo();
  if (activeObjectiveBannerEl && objTagEl && objTitleEl) {
    if (obj) {
      activeObjectiveBannerEl.classList.add('visible');
      activeObjectiveBannerEl.classList.toggle('risky', obj.isRisky);
      objTagEl.textContent = obj.tag;
      objTitleEl.textContent = obj.title;
      if (objDescEl) objDescEl.textContent = obj.instruction;
    } else {
      activeObjectiveBannerEl.classList.remove('visible', 'risky');
    }
  }
  syncNeedsHUD();
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
        trotro_stop: 'Trotro'
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
  modalHeaderTitle.textContent = `Accra Hub · ${formatGHS(cash)}`;
  modalHeaderSub.textContent = `${tier.title}${currentFocusedInteractableId ? ` · @ ${currentFocusedInteractableId}` : ''}`;

  if (currentModalTab === 'jobs') {
    const activeJob = jobSystem.getActiveJob();
    for (const job of ACCRA_LEGAL_JOBS) {
      const isThisActive = activeJob?.job.id === job.id;
      const doneCount = jobSystem.getCompletedCount(job.id);
      const card = document.createElement('div');
      card.className = 'econ-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title">${job.title}</strong>
          <span class="econ-pay-badge">+${formatGHS(job.payGHS)}</span>
        </div>
        <p style="margin:4px 0;font-size:0.68rem;color:#9a9a9a">${job.employerName} · ${job.steps.length} neighborhood steps${doneCount > 0 ? ` · Shifts done: ${doneCount}` : ''}</p>
        <p style="margin:4px 0 8px;font-size:0.72rem;color:#d4d4d4">${job.summary}</p>
        <button class="econ-action-btn" type="button">${isThisActive ? 'Shift In Progress' : 'Accept Job Shift'}</button>
      `;
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
            const res = jobSystem.acceptJob(job.id);
            if (res.success) {
              const aj = jobSystem.getActiveJob();
              const step = aj ? aj.currentStep.stepTitle : 'Go';
              showInteractionFeedback(`Job on · ${step}`);
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

  if (currentModalTab === 'hustles') {
    const activeHustle = jobSystem.getActiveHustle();
    const activeIllegal = crimeSystem.getActiveIllegalHustle();

    for (const hustle of ACCRA_SIDE_HUSTLES) {
      const isThisActive = activeHustle?.hustle.id === hustle.id;
      const card = document.createElement('div');
      card.className = 'econ-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title">${hustle.title}</strong>
          <span class="econ-pay-badge">+${formatGHS(hustle.grossPayoutGHS)}</span>
        </div>
        <p style="margin:4px 0;font-size:0.68rem;color:#9a9a9a">${hustle.categoryLabel}${hustle.upfrontCapitalGHS > 0 ? ` · Capital: ${formatGHS(hustle.upfrontCapitalGHS)}` : ' · Zero Capital'}</p>
        <p style="margin:4px 0 8px;font-size:0.72rem;color:#d4d4d4">${hustle.summary}</p>
        <button class="econ-action-btn" type="button">${isThisActive ? 'Hustle Active' : hustle.upfrontCapitalGHS > 0 ? `Invest ${formatGHS(hustle.upfrontCapitalGHS)} & Start` : 'Start Side Hustle'}</button>
      `;
      const btn = card.querySelector('button');
      if (btn) {
        if (isThisActive) btn.disabled = true;
        else
          btn.addEventListener('click', () => {
            if (crimeSystem.getActiveIllegalHustle()) {
              showInteractionFeedback('Finish or cancel your active risky hustle first.', true);
              return;
            }
            const res = jobSystem.startSideHustle(hustle.id);
            showInteractionFeedback(res.message, !res.success);
            if (res.success) closeEconomyModal();
            syncEconomyHUD();
          });
      }
      modalBodyContent.appendChild(card);
    }

    for (const risky of ACCRA_ILLEGAL_HUSTLES) {
      const isThisActive = activeIllegal?.hustle.id === risky.id;
      const card = document.createElement('div');
      card.className = 'econ-card';
      card.style.borderColor = 'rgba(255,51,51,0.4)';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title" style="color:#ff6666">${risky.title}</strong>
          <span class="econ-pay-badge" style="border-color:#ff3333;color:#ff6666">+${formatGHS(risky.payoutGHS)}</span>
        </div>
        <p style="margin:4px 0;font-size:0.68rem;color:#ff9999">${risky.riskLabel}</p>
        <p style="margin:4px 0 8px;font-size:0.72rem;color:#d4d4d4">${risky.summary}</p>
        <button class="econ-action-btn" style="background:#ff3333;color:#fff" type="button">${isThisActive ? 'Deal Active' : 'Start Risky Deal'}</button>
      `;
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
    for (const item of Object.values(ACCRA_EVERYDAY_EXPENSES)) {
      const card = document.createElement('div');
      card.className = 'econ-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong class="econ-card-title">${item.title}</strong>
          <span class="econ-pay-badge">${formatGHS(item.costGHS)}</span>
        </div>
        <p style="margin:4px 0 8px;font-size:0.72rem;color:#d4d4d4">${item.description}</p>
        <button class="econ-action-btn" type="button">Buy (${formatGHS(item.costGHS)})</button>
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

  // Wallet tab
  const wallet = economyManager.wallet;
  const txList = wallet.getTransactions();
  const summaryCard = document.createElement('div');
  summaryCard.className = 'econ-card';
  summaryCard.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <strong class="econ-card-title">Cash in Pocket</strong>
      <span class="econ-pay-badge">${formatGHS(wallet.getCashBalance())}</span>
    </div>
    <p style="margin:6px 0 2px;font-size:0.72rem;color:#9a9a9a">Lifetime Earned: ${formatGHS(wallet.getLifetimeEarned())} · Lifetime Spent: ${formatGHS(wallet.getLifetimeSpent())}</p>
    <p style="margin:2px 0;font-size:0.72rem;color:#9a9a9a">Unsecured Illicit Cash: ${formatGHS(wallet.getUnsecuredIllegalCash())} · Police Heat: ${crimeSystem.getHeatLevel()}% (${crimeSystem.getPoliceStatus()})</p>
  `;
  modalBodyContent.appendChild(summaryCard);

  if (txList.length === 0) {
    const emptyEl = document.createElement('p');
    emptyEl.style.cssText = 'color:#9a9a9a;font-size:0.75rem;margin:6px 0';
    emptyEl.textContent = 'No transactions yet. Complete a job shift or side hustle in Adabraka to earn your first Cedis.';
    modalBodyContent.appendChild(emptyEl);
  } else {
    for (const tx of txList.slice(0, 12)) {
      const row = document.createElement('div');
      row.className = 'econ-card';
      const sign = tx.type === 'INCOME' ? '+' : '-';
      const color = tx.type === 'INCOME' ? '#66ff66' : '#ff6666';
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-size:0.75rem;font-weight:700;color:#f0f0f0">${tx.description}</span>
          <span style="font-size:0.78rem;font-weight:900;color:${color}">${sign}${formatGHS(tx.amount)}</span>
        </div>
        <p style="margin:2px 0 0;font-size:0.62rem;color:#9a9a9a">${tx.category} · Balance: ${formatGHS(tx.balanceAfter)}</p>
      `;
      modalBodyContent.appendChild(row);
    }
  }
}

function openHomeSheet(): void {
  const backdrop = document.getElementById('homeModalBackdrop');
  const flexEl = document.getElementById('homeFlexScore');
  const list = document.getElementById('homeFurnList');
  if (flexEl) {
    flexEl.textContent = `Flex ${homeSystem.getFlexScore()} · ${homeSystem.getFlexLabel()}`;
  }
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
            (c, title) => {
              const tx = economyManager.wallet.spendMoney({
                amount: c,
                category: 'PURCHASE',
                description: title,
                channel: 'CASH'
              });
              return Boolean(tx);
            }
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
      showInteractionFeedback(`Paid${pay} · ${advance.message}`);
    } else {
      showInteractionFeedback(advance.message);
    }
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
    } else {
      showInteractionFeedback(buy.message || 'No', true);
    }
    syncEconomyHUD();
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
      if (crimeSystem.getActiveIllegalHustle()) showInteractionFeedback(crimeSystem.cancelActiveIllegalHustle());
      else showInteractionFeedback(jobSystem.cancelActiveWork());
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
