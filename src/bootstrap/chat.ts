/**
 * Location chat UI + place-recovery chip (Task 18 refactor).
 * Renders the chat sheet, nearby strip, status/location pills, unread
 * badge, and the place-recovery action button.
 */

import { chatBadge, chatModalBackdrop, chatSheetNearby, chatStatusPill, chatMessagesEl, chatInput, nearbyStrip, currentLocationPill, placeRecoveryBtn } from '../ui/dom-refs';
import { S } from './state';
import { economyManager, crimeSystem, needsSystem } from './services';
import { showInteractionFeedback } from '../ui/HUD';
import { escapeHtml, formatChatTime } from './utils';
import { type NearbyPlayer, ChatMessageView } from '../game/Multiplayer/types';
import { getLocationDef, type LocationId } from '../game/World/Locations';
import { recoveryCooldownUntil } from './state';
import { syncEconomyHUD } from '../ui/HUD';

export function openChatSheet(): void {
  S.chatSheetOpen = true;
  S.chatUnreadCount = 0;
  S.chatLastSeenAtMs = Date.now();
  updateChatBadge();
  chatModalBackdrop?.classList.add('open');
  if (S.presenceManager && chatSheetNearby) {
    renderChatSheetNearby(S.presenceManager.getNearby());
  }
  setTimeout(() => chatInput?.focus(), 50);
}

export function closeChatSheet(): void {
  S.chatSheetOpen = false;
  chatModalBackdrop?.classList.remove('open');
  chatInput?.blur();
}

export async function sendChatMessage(): Promise<void> {
  if (!S.chatManager || !chatInput) return;
  const text = chatInput.value;
  const result = await S.chatManager.sendMessage(text);
  if (result.ok) {
    chatInput.value = '';
    return;
  }
  if (result.message) showInteractionFeedback(result.message, true);
}

export function renderChatMessages(messages: ChatMessageView[]): void {
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

export function renderChatSheetNearby(players: NearbyPlayer[]): void {
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

export function setNearbyStrip(players: NearbyPlayer[], isAccount: boolean): void {
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

export function setStatusPill(kind: 'online' | 'guest' | 'offline'): void {
  if (!chatStatusPill) return;
  chatStatusPill.classList.remove('online', 'guest', 'offline');
  chatStatusPill.classList.add(kind);
  chatStatusPill.textContent = kind === 'online' ? 'online · Accra' : kind === 'guest' ? 'guest mode' : 'offline';
}

export function setCurrentLocationPill(locId: LocationId, flash: boolean): void {
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
export function updatePlaceRecoveryButton(force = false): void {
  if (!placeRecoveryBtn) return;
  const action = getLocationDef(S.currentLocationId).recoveryAction;
  const cooldownLeftMs = Math.max(0, (recoveryCooldownUntil.get(action.id) ?? 0) - Date.now());
  const cooldownLeftSecs = Math.ceil(cooldownLeftMs / 1000);
  if (
    !force &&
    cooldownLeftMs <= 0 &&
    S.recoveryRenderedLocId === S.currentLocationId &&
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
    S.recoveryRenderedLocId = S.currentLocationId;
  }
}

/**
 * Runs the current location's recovery action: pays (if it costs), restores
 * hunger/energy, sheds heat, then starts the action's cooldown. Refuses
 * gracefully (no charge) when the player is already full/rested or broke.
 */
export function performPlaceRecoveryAction(): void {
  const action = getLocationDef(S.currentLocationId).recoveryAction;
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

export function updateChatBadge(): void {
  if (!chatBadge) return;
  if (S.chatUnreadCount > 0) {
    chatBadge.textContent = S.chatUnreadCount > 99 ? '99+' : String(S.chatUnreadCount);
    chatBadge.classList.remove('zero');
  } else {
    chatBadge.classList.add('zero');
  }
}
