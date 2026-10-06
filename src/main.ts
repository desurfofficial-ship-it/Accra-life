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

economyManager.bindExternalStateProviders(
  () => jobSystem.getPersistedState(),
  () => crimeSystem.getPersistedState()
);

const hydrated = economyManager.loadFromPersistence();
if (hydrated.jobs) {
  jobSystem.hydrate(hydrated.jobs);
}
if (hydrated.crime) {
  crimeSystem.hydrate(hydrated.crime);
}

function showInteractionFeedback(message: string, isWarning = false): void {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.toggle('warn', isWarning);
  toastEl.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3400);
}

function showFloatingWalletDelta(deltaAmount: number): void {
  if (!walletDeltaEl || deltaAmount === 0) return;
  walletDeltaEl.textContent = formatSignedGHS(deltaAmount);
  walletDeltaEl.classList.remove('show-gain', 'show-loss');
  void walletDeltaEl.offsetWidth;
  walletDeltaEl.classList.add(deltaAmount > 0 ? 'show-gain' : 'show-loss');
  if (deltaTimeout) clearTimeout(deltaTimeout);
  deltaTimeout = setTimeout(() => {
    walletDeltaEl.classList.remove('show-gain', 'show-loss');
  }, 2400);
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
      tag: `Job Shift · Step ${activeJob.stepIndex + 1}/${activeJob.totalSteps} · Pay ${formatGHS(activeJob.job.payGHS)}`,
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
      tag: `Side Hustle · Step ${activeHustle.stepIndex + 1}/${activeHustle.totalSteps} · Return ${formatGHS(activeHustle.hustle.grossPayoutGHS)}`,
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
      tag: `Risky Deal · Step ${activeIllegal.stepIndex + 1}/${activeIllegal.totalSteps} · Payout ${formatGHS(activeIllegal.hustle.payoutGHS)}`,
      title: activeIllegal.hustle.title,
      instruction: activeIllegal.currentStep.instruction,
      stepTitle: activeIllegal.currentStep.stepTitle
    };
  }

  return null;
}

function syncEconomyHUD(): void {
  const cash = economyManager.wallet.getCashBalance();
  if (hudCashAmountEl) {
    hudCashAmountEl.textContent = formatGHS(cash);
  }

  const tier = economyManager.getProgressionInfo();
  if (progressionTierBadgeEl) {
    progressionTierBadgeEl.textContent = tier.title;
  }

  const ownership = economyManager.getOwnershipFoundations();
  if (livingSituationSubEl) {
    livingSituationSubEl.textContent = `Compound Room (Unfurnished · ${ownership.ownedFurnitureIds.length} Furniture) · Earned ${formatGHS(economyManager.wallet.getLifetimeEarned())}`;
  }

  const heat = crimeSystem.getHeatLevel();
  const status = crimeSystem.getPoliceStatus();
  if (heatStatusPillEl && heatStatusTextEl) {
    heatStatusPillEl.classList.remove('suspicious', 'wanted', 'arrested');
    if (status === 'SUSPICIOUS') {
      heatStatusPillEl.classList.add('suspicious');
    } else if (status === 'WANTED') {
      heatStatusPillEl.classList.add('wanted');
    } else if (status === 'ARRESTED') {
      heatStatusPillEl.classList.add('arrested');
    }
    heatStatusTextEl.textContent = `Police: ${status} · ${heat}% Heat`;
  }

  const obj = getActiveObjectiveInfo();
  if (activeObjectiveBannerEl && objTagEl && objTitleEl && objDescEl) {
    if (obj) {
      activeObjectiveBannerEl.classList.add('visible');
      activeObjectiveBannerEl.classList.toggle('risky', obj.isRisky);
      objTagEl.textContent = obj.tag;
      objTitleEl.textContent = obj.title;
      objDescEl.textContent = obj.instruction;
    } else {
      activeObjectiveBannerEl.classList.remove('visible', 'risky');
    }
  }

  if (phase1SceneRef) {
    phase1SceneRef.interactionSystem.setObjectiveTarget(
      obj ? obj.targetInteractableId : null,
      obj ? obj.isRisky : false
    );
    updateInteractionPromptUI(phase1SceneRef.interactionSystem.getActiveTarget());
  }

  if (economyModalBackdrop?.classList.contains('open')) {
    renderModalTabContent();
  }
}

economyManager.wallet.onBalanceChange((_balance, tx) => {
  if (tx) {
    const signed = tx.type === 'INCOME' ? tx.amount : -tx.amount;
    showFloatingWalletDelta(signed);
  }
  syncEconomyHUD();
});

economyManager.onUpdate(() => {
  syncEconomyHUD();
});

function updateInteractionPromptUI(target: InteractableTarget | null): void {
  if (!promptEl || !promptTitleEl || !promptSubEl) return;
  if (target) {
    const obj = getActiveObjectiveInfo();
    const isObjectiveMatch = obj && obj.targetInteractableId === target.id;
    promptEl.classList.toggle('objective-match', Boolean(isObjectiveMatch));

    if (isObjectiveMatch && obj) {
      promptTitleEl.textContent = `Complete: ${obj.stepTitle}`;
      promptSubEl.textContent = `${target.title} · Active Work Step`;
    } else {
      promptTitleEl.textContent = target.promptLabel;
      promptSubEl.textContent = `${target.title} · Press E for Opportunities`;
    }
    promptEl.classList.add('visible');
  } else {
    promptEl.classList.remove('visible', 'objective-match');
  }
}

function openEconomyModal(tab: ModalTabId, focusedInteractableId: string | null = null): void {
  currentModalTab = tab;
  currentFocusedInteractableId = focusedInteractableId;
  for (const btn of modalTabBtns) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  }
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
  modalHeaderTitle.textContent = `Accra Economy & Opportunities · ${formatGHS(cash)}`;
  modalHeaderSub.textContent = `${tier.title} — ${tier.description}`;

  if (currentModalTab === 'jobs') {
    const activeJob = jobSystem.getActiveJob();
    for (const job of ACCRA_LEGAL_JOBS) {
      const isHere = currentFocusedInteractableId === job.startInteractableId;
      const isThisActive = activeJob?.job.id === job.id;
      const completedCount = jobSystem.getCompletedCount(job.id);

      const card = document.createElement('div');
      card.className = `econ-card${isHere ? ' highlight-local' : ''}`;
      card.innerHTML = `
        <div class="econ-card-top">
          <div>
            <h3 class="econ-card-title">${job.title}</h3>
            <div class="econ-card-sub">${job.employerName}${isHere ? ' · You are here' : ''}</div>
          </div>
          <span class="econ-pay-badge">+${formatGHS(job.payGHS)}</span>
        </div>
        <p class="econ-card-desc">${job.summary}</p>
        <div class="econ-card-footer">
          <span class="econ-meta">${job.steps.length} physical neighborhood steps · Completed ${completedCount}×</span>
          <button class="econ-action-btn" type="button">
            ${isThisActive ? `In Progress (Step ${activeJob!.stepIndex + 1}/${activeJob!.totalSteps})` : 'Accept Job Shift'}
          </button>
        </div>
      `;

      const btn = card.querySelector('button');
      if (btn) {
        if (isThisActive) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', () => {
            const res = jobSystem.acceptJob(job.id);
            showInteractionFeedback(res.message, !res.success);
            syncEconomyHUD();
            if (res.success) closeEconomyModal();
          });
        }
      }
      modalBodyContent.appendChild(card);
    }
    return;
  }

  if (currentModalTab === 'hustles') {
    const activeHustle = jobSystem.getActiveHustle();
    const activeIllegal = crimeSystem.getActiveIllegalHustle();

    for (const hustle of ACCRA_SIDE_HUSTLES) {
      const isHere = currentFocusedInteractableId === hustle.startInteractableId;
      const isThisActive = activeHustle?.hustle.id === hustle.id;
      const completedCount = jobSystem.getCompletedCount(hustle.id);

      const card = document.createElement('div');
      card.className = `econ-card${isHere ? ' highlight-local' : ''}`;
      card.innerHTML = `
        <div class="econ-card-top">
          <div>
            <h3 class="econ-card-title">${hustle.title}</h3>
            <div class="econ-card-sub">${hustle.categoryLabel}</div>
          </div>
          <span class="econ-pay-badge">+${formatGHS(hustle.grossPayoutGHS)}</span>
        </div>
        <p class="econ-card-desc">${hustle.summary}</p>
        <div class="econ-card-footer">
          <span class="econ-meta">${hustle.steps.length} steps · Completed ${completedCount}×</span>
          <button class="econ-action-btn" type="button">
            ${
              isThisActive
                ? `Active (Step ${activeHustle!.stepIndex + 1}/${activeHustle!.totalSteps})`
                : hustle.upfrontCapitalGHS > 0
                  ? `Invest ${formatGHS(hustle.upfrontCapitalGHS)} & Start`
                  : 'Start Side Hustle'
            }
          </button>
        </div>
      `;

      const btn = card.querySelector('button');
      if (btn) {
        if (isThisActive) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', () => {
            const res = jobSystem.startSideHustle(hustle.id);
            showInteractionFeedback(res.message, !res.success);
            syncEconomyHUD();
            if (res.success) closeEconomyModal();
          });
        }
      }
      modalBodyContent.appendChild(card);
    }

    for (const illegal of ACCRA_ILLEGAL_HUSTLES) {
      const isThisActive = activeIllegal?.hustle.id === illegal.id;
      const card = document.createElement('div');
      card.className = 'econ-card risky-card';
      card.innerHTML = `
        <div class="econ-card-top">
          <div>
            <h3 class="econ-card-title">${illegal.title}</h3>
            <div class="econ-card-sub" style="color:#fca5a5;">${illegal.riskLabel}</div>
          </div>
          <span class="econ-pay-badge">+${formatGHS(illegal.payoutGHS)}</span>
        </div>
        <p class="econ-card-desc">${illegal.summary}</p>
        <div class="econ-card-footer">
          <span class="econ-meta">Current Police Status: ${crimeSystem.getPoliceStatus()} (${crimeSystem.getHeatLevel()}% Heat)</span>
          <button class="econ-action-btn danger" type="button">
            ${isThisActive ? `Active Deal (Step ${activeIllegal!.stepIndex + 1}/${activeIllegal!.totalSteps})` : 'Attempt Risky Hustle'}
          </button>
        </div>
      `;

      const btn = card.querySelector('button');
      if (btn) {
        if (isThisActive) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', () => {
            const hasLegal = Boolean(jobSystem.getActiveJob() || jobSystem.getActiveHustle());
            const res = crimeSystem.startIllegalHustle(illegal.id, hasLegal);
            showInteractionFeedback(res.message, !res.success);
            syncEconomyHUD();
            if (res.success) closeEconomyModal();
          });
        }
      }
      modalBodyContent.appendChild(card);
    }
    return;
  }

  if (currentModalTab === 'spend') {
    for (const item of Object.values(ACCRA_EVERYDAY_EXPENSES)) {
      const isHere = currentFocusedInteractableId === item.interactableId;
      const canBuy = economyManager.canAfford(item.costGHS, 'CASH');

      const card = document.createElement('div');
      card.className = `econ-card${isHere ? ' highlight-local' : ''}`;
      card.innerHTML = `
        <div class="econ-card-top">
          <div>
            <h3 class="econ-card-title">${item.title}</h3>
            <div class="econ-card-sub">Category: ${item.category}${isHere ? ' · Available right here' : ''}</div>
          </div>
          <span class="econ-pay-badge expense">−${formatGHS(item.costGHS)}</span>
        </div>
        <p class="econ-card-desc">${item.description}</p>
        <div class="econ-card-footer">
          <span class="econ-meta">${canBuy ? 'You have enough cash' : `Need ${formatGHS(item.costGHS)} cash`}</span>
          <button class="econ-action-btn" type="button">
            Buy (${formatGHS(item.costGHS)})
          </button>
        </div>
      `;

      const btn = card.querySelector('button');
      if (btn) {
        btn.addEventListener('click', () => {
          const res = economyManager.purchaseEverydayExpense(item.id);
          showInteractionFeedback(res.message, !res.success);
          syncEconomyHUD();
        });
      }
      modalBodyContent.appendChild(card);
    }
    return;
  }

  if (currentModalTab === 'wallet') {
    const w = economyManager.wallet;
    const ownership = economyManager.getOwnershipFoundations();

    const summarySection = document.createElement('div');
    summarySection.className = 'ledger-grid';
    summarySection.innerHTML = `
      <div class="stat-box">
        <span>Cash in Hand (GHS)</span>
        <strong style="color:#fde68a;">${formatGHS(w.getCashBalance())}</strong>
      </div>
      <div class="stat-box">
        <span>Lifetime Earned</span>
        <strong style="color:#34d399;">${formatGHS(w.getLifetimeEarned())}</strong>
      </div>
      <div class="stat-box">
        <span>Lifetime Spent / Fines</span>
        <strong style="color:#fca5a5;">${formatGHS(w.getLifetimeSpent())}</strong>
      </div>
    `;
    modalBodyContent.appendChild(summarySection);

    const homeCard = document.createElement('div');
    homeCard.className = 'econ-card';
    homeCard.innerHTML = `
      <div class="econ-card-top">
        <div>
          <h3 class="econ-card-title">Starter Living Situation &amp; Ownership Foundation</h3>
          <div class="econ-card-sub">Kwame’s Compound House · Modest Single Unfurnished Room</div>
        </div>
        <span class="econ-pay-badge expense">${economyManager.getProgressionInfo().title}</span>
      </div>
      <p class="econ-card-desc">
        You started in Accra with ₵0.00 and an unfurnished compound room. Every piece of furniture, appliance, vehicle, business, and property in future phases must be earned through your work.
      </p>
      <div class="econ-meta">
        Furniture Owned: ${ownership.ownedFurnitureIds.length} · Vehicles: ${ownership.vehicleIds.length} · Businesses: ${ownership.businessIds.length} · Properties: ${ownership.propertyIds.length} · Unsecured Illicit Cash: ${formatGHS(w.getUnsecuredIllegalCash())}
      </div>
      <div class="econ-card-footer">
        <span class="econ-meta">Arrest Record: ${crimeSystem.getArrestCount()}× · MoMo &amp; Bank Channels Ready</span>
        <button id="resetZeroBtn" class="econ-action-btn secondary" type="button">Reset Progress to ₵0.00</button>
      </div>
    `;
    const resetBtn = homeCard.querySelector('#resetZeroBtn');
    resetBtn?.addEventListener('click', () => {
      jobSystem.reset();
      crimeSystem.reset();
      economyManager.resetAllProgressToZero();
      showInteractionFeedback('Progress reset to ₵0.00 starter state.');
      syncEconomyHUD();
    });
    modalBodyContent.appendChild(homeCard);

    const txs = w.getTransactions();
    const txHeader = document.createElement('div');
    txHeader.className = 'econ-card-sub';
    txHeader.textContent = `Recent Transactions (${txs.length})`;
    modalBodyContent.appendChild(txHeader);

    if (txs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tx-row';
      empty.textContent = 'No transactions yet — Balance is ₵0.00. Take a job or side hustle to earn your first Cedis!';
      modalBodyContent.appendChild(empty);
    } else {
      for (const tx of txs.slice(0, 12)) {
        const row = document.createElement('div');
        row.className = 'tx-row';
        const isIncome = tx.type === 'INCOME';
        row.innerHTML = `
          <div>
            <strong>${tx.description}</strong>
            <div class="econ-meta">${tx.category} · Bal: ${formatGHS(tx.balanceAfter)}</div>
          </div>
          <span class="${isIncome ? 'tx-amt-pos' : 'tx-amt-neg'}">
            ${isIncome ? '+' : '−'}${formatGHS(tx.amount)}
          </span>
        `;
        modalBodyContent.appendChild(row);
      }
    }
  }
}

function handleWorldTargetInteracted(target: InteractableTarget): void {
  // 1. Check if this location advances an active legal job or side hustle step
  const jobStepResult = jobSystem.tryAdvanceAtInteractable(target.id, target.assetId);
  if (jobStepResult.handled) {
    showInteractionFeedback(jobStepResult.message);
    syncEconomyHUD();
    return;
  }

  // 2. Check if this location advances an active risky/illegal hustle step
  const crimeStepResult = crimeSystem.tryAdvanceAtInteractable(target.id, target.assetId);
  if (crimeStepResult.handled) {
    showInteractionFeedback(crimeStepResult.message, crimeStepResult.arrested);
    syncEconomyHUD();
    return;
  }

  // 3. Otherwise, show contextual location feedback and open the relevant Economy/Opportunities tab
  showInteractionFeedback(target.interactionResponse);

  if (target.id === 'home_door') {
    openEconomyModal('wallet', target.id);
  } else if (
    target.id === 'provision_shop' ||
    target.id === 'food_vendor' ||
    target.id === 'trotro_stop'
  ) {
    openEconomyModal('jobs', target.id);
  } else if (target.id === 'npc_older_001') {
    openEconomyModal('hustles', target.id);
  }
}

// ========== ONBOARDING GATE ==========
function startGame(profile: OnboardingResult): void {
  const livingSub = document.getElementById('livingSituationSub');
  if (livingSub) {
    livingSub.textContent = `${profile.displayName} · Start from ₵0 · Work jobs, run hustles, and build your life.`;
  }
  const brandBadge = document.querySelector('.brand-badge');
  if (brandBadge) {
    brandBadge.textContent = profile.mode === 'account' ? 'Accra · Cloud Save' : 'Accra · Guest';
  }

  if (container) {
    const phase1 = new Phase1Scene(container, {
      onTargetChanged: (target) => {
        updateInteractionPromptUI(target);
      },
      onTargetInteracted: (target) => {
        handleWorldTargetInteracted(target);
      }
    });
    phase1SceneRef = phase1;
    syncEconomyHUD();

    crimeSystem.onArrest(() => {
      phase1.player.position.set(-10.5, 0.08, 6.2);
      phase1.player.rotationY = Math.PI;
      phase1.player.group.rotation.y = Math.PI;
      phase1.thirdPersonCamera.resetBehindPlayer(Math.PI);
    });

    let lastTickTime = performance.now();
    const tickEconomyLoop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTickTime) / 1000);
      lastTickTime = now;
      const prevHeat = crimeSystem.getHeatLevel();
      const prevStatus = crimeSystem.getPoliceStatus();
      crimeSystem.tickHeatDecay(dt);
      if (
        crimeSystem.getHeatLevel() !== prevHeat ||
        crimeSystem.getPoliceStatus() !== prevStatus
      ) {
        syncEconomyHUD();
      }
      requestAnimationFrame(tickEconomyLoop);
    };
    requestAnimationFrame(tickEconomyLoop);

    walletOpenBtn?.addEventListener('click', () => {
      walletOpenBtn.blur();
      openEconomyModal('wallet');
    });

    workMenuOpenBtn?.addEventListener('click', () => {
      workMenuOpenBtn.blur();
      openEconomyModal('jobs');
    });

    modalCloseBtn?.addEventListener('click', () => closeEconomyModal());
    economyModalBackdrop?.addEventListener('click', (e) => {
      if (e.target === economyModalBackdrop) closeEconomyModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && economyModalBackdrop?.classList.contains('open')) {
        closeEconomyModal();
      }
    });

    for (const btn of modalTabBtns) {
      btn.addEventListener('click', () => {
        const tab = (btn.dataset.tab as ModalTabId) || 'jobs';
        currentModalTab = tab;
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
      resetCameraBtn.blur();
      phase1.thirdPersonCamera.resetBehindPlayer(phase1.player.rotationY);
    });

    promptEl?.addEventListener('click', () => {
      promptEl.blur();
      phase1.interactionSystem.triggerCurrentInteraction();
    });

    interactTriggerBtn?.addEventListener('click', () => {
      interactTriggerBtn.blur();
      const triggered = phase1.interactionSystem.triggerCurrentInteraction();
      if (!triggered) openEconomyModal('jobs');
    });

    sprintToggleBtn?.addEventListener('click', () => {
      sprintToggleBtn.blur();
      sprintToggled = !sprintToggled;
      phase1.player.setSprintState(sprintToggled);
      sprintToggleBtn.classList.toggle('active', sprintToggled);
      sprintToggleBtn.textContent = sprintToggled ? 'Jog: ON' : 'Jog: OFF';
    });

    if (joystickZone && joystickKnob) {
      let stickActive = false;
      let centerX = 0;
      let centerY = 0;
      const maxRadius = 36;

      const updateStick = (clientX: number, clientY: number) => {
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);
        const offsetX = Math.cos(angle) * clampedDist;
        const offsetY = Math.sin(angle) * clampedDist;
        joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        phase1.player.setJoystickInput(offsetX / maxRadius, offsetY / maxRadius);
      };

      const resetStick = () => {
        stickActive = false;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        phase1.player.setJoystickInput(0, 0);
      };

      joystickZone.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        stickActive = true;
        const rect = joystickZone.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
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
        resetStick();
      });
      joystickZone.addEventListener('pointercancel', () => resetStick());
    }
  }
}

// Launch onboarding first — game only starts after player is ready
startOnboarding((profile) => {
  startGame(profile);
});
