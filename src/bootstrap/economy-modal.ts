/**
 * Economy modal — Jobs / Hustles / Spend / Wallet tabs (Task 18 refactor).
 * Extracted verbatim from the main.ts monolith; renderModalTabContent owns
 * the ~350-line tab renderer.
 */

import { economyModalBackdrop, modalHeaderTitle, modalHeaderSub, modalBodyContent, modalTabBtns } from '../ui/dom-refs';
import { S } from './state';
import { economyManager, jobSystem, crimeSystem, needsSystem, homeSystem } from './services';
import { showInteractionFeedback, syncEconomyHUD } from '../ui/HUD';
import { TRAIT_DEFS, type TraitId } from '../onboarding';
import { ACCRA_ILLEGAL_HUSTLES } from '../game/Crime/HeatSystem';
import { formatGHS, formatSignedGHS } from '../game/Economy/EconomicTypes';
import { ACCRA_EVERYDAY_EXPENSES } from '../game/Economy/EconomyManager';
import { ACCRA_LEGAL_JOBS } from '../game/Jobs/JobRegistry';
import { HomeSystem } from '../game/Home/HomeSystem';
import { type ModalTabId } from './state';

export function openEconomyModal(tab: ModalTabId, focusedInteractableId: string | null = null): void {
  S.currentModalTab = tab;
  S.currentFocusedInteractableId = focusedInteractableId;
  for (const btn of modalTabBtns) btn.classList.toggle('active', btn.dataset.tab === tab);
  renderModalTabContent();
  economyModalBackdrop?.classList.add('open');
}

export function closeEconomyModal(): void {
  economyModalBackdrop?.classList.remove('open');
  S.currentFocusedInteractableId = null;
}

export function formatTraitList(traits: ReadonlyArray<string>): string {
  return traits
    .map((t) => TRAIT_DEFS[t as TraitId]?.label ?? t)
    .join(' / ');
}

export function updateLiveJobModalCooldowns(): void {
  if (!economyModalBackdrop?.classList.contains('open') || S.currentModalTab !== 'jobs') return;
  const activeJob = jobSystem.getActiveJob();
  const needs = needsSystem.getState();

  for (const job of ACCRA_LEGAL_JOBS) {
    const isThisActive = activeJob?.job.id === job.id;
    const remaining = jobSystem.getRemainingCooldownSeconds(job.id);
    const reqEval = jobSystem.evaluateJobRequirements(job, {
      energy: needs.energy,
      hunger: needs.hunger,
      trait: S.playerTrait
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

export function renderModalTabContent(): void {
  if (!modalBodyContent || !modalHeaderTitle) return;
  modalBodyContent.innerHTML = '';
  const cash = economyManager.wallet.getCashBalance();
  const needs = needsSystem.getState();
  const traitLabel = TRAIT_DEFS[S.playerTrait]?.label ?? S.playerTrait;
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

  if (S.currentModalTab === 'jobs') {
    const activeJob = jobSystem.getActiveJob();
    const jobs = jobSystem.getAvailableJobs(S.currentFocusedInteractableId);

    for (const job of jobs) {
      const isThisActive = activeJob?.job.id === job.id;
      const remainingCooldown = jobSystem.getRemainingCooldownSeconds(job.id);
      const reqEval = jobSystem.evaluateJobRequirements(job, {
        energy: needs.energy,
        hunger: needs.hunger,
        trait: S.playerTrait
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
            trait: S.playerTrait
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
            trait: S.playerTrait
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

  if (S.currentModalTab === 'hustles') {
    const activeHustle = jobSystem.getActiveHustle();
    const activeIllegal = crimeSystem.getActiveIllegalHustle();
    const hustles = jobSystem.getAvailableSideHustles(S.currentFocusedInteractableId);

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

  if (S.currentModalTab === 'spend') {
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

  if (S.currentModalTab === 'wallet') {
    const wallet = economyManager.wallet;
    const txs = wallet.getTransactions().slice(0, 12);
    // Playability patch rule 7: the Firebase diagnostic actions are
    // developer tooling — a guest tapping "Sync to Firebase"/"Reload
    // from Store" could clobber their save. Only render them with ?debug=1.
    const debugMode = new URLSearchParams(window.location.search).has('debug');
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
      ${
        debugMode
          ? `<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
              <button id="diagSyncFirestoreBtn" class="econ-action-btn" type="button">Sync to Firebase</button>
              <button id="diagReloadStoreBtn" class="econ-action-btn" style="background:#222;color:#fff;border-color:#555" type="button">Reload from Store</button>
            </div>`
          : ''
      }
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
