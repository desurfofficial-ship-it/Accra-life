

import { friendsOpenBtn, friendsBadge, friendsModalBackdrop, friendsCloseBtn, friendsRequestsEl, friendsListEl, friendsNearbyEl, friendsActivityEl, visitLeaveBtn } from '../ui/dom-refs';
import { S } from './state';
import { showInteractionFeedback } from '../ui/HUD';
import { enterVisitMode, leaveVisitMode, isVisiting } from './visit';
import { locationLabel, escapeHtml } from './utils';
import { type OnboardingResult } from '../onboarding';
import { FriendsSystem, type FriendEntry, type InboxMessageView } from '../game/Multiplayer/FriendsSystem';
import { type NearbyPlayer } from '../game/Multiplayer/types';
import { getLocationAt } from '../game/World/Locations';
import { setDevShowcaseOverride } from '../game/Home/HomeShowcase';

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

/** Boot the friends layer. Any uid-bearing player gets the live layer —
 * accounts AND anonymous-auth guests (rules allow both: inbox creates need
 * isSignedIn, friends writes need isOwner). Only fully-offline guests
 * (no uid at all) see the sign-in prompt inside the sheet. */
export function initFriends(profile: OnboardingResult): void {
  S.friendsSystem = new FriendsSystem({
    uid: profile.userId ?? null,
    displayName: profile.displayName || 'Chale'
  });
  if (S.friendsSystem && !S.friendsSystem.isGuest) {
    S.friendsSystem.enter();
  }

  // Live updates → re-render (when open) + badge.
  S.friendsSystem.onFriends(() => {
    if (S.friendsSheetOpen) renderFriendsSheet();
    updateFriendsBadge();
  });
  S.friendsSystem.onInbox((messages) => {
    if (S.friendsSheetOpen) {
      renderFriendsSheet();
      // Opening the sheet consumes transient notifications (visit pings +
      // auto-processed accepts). Requests stay until answered.
      void S.friendsSystem?.clearActivity();
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
        if (!S.friendsSystem) return;
        void S.friendsSystem.sendFriendRequest(d.uid ?? '', d.name ?? '').then((res) => {
          showInteractionFeedback(res.ok ? `Friend request sent to ${d.name} 🤝` : res.message ?? 'Could not send request.', !res.ok);
          if (res.ok) renderFriendsSheet();
        });
        break;
      }
      case 'accept': {
        if (!S.friendsSystem) return;
        void S.friendsSystem.acceptRequest(d.msg ?? '').then((res) => {
          showInteractionFeedback(res.ok ? `You and ${d.name} are now friends 🤝` : res.message ?? 'Could not accept.', !res.ok);
        });
        break;
      }
      case 'decline': {
        if (!S.friendsSystem) return;
        void S.friendsSystem.declineRequest(d.msg ?? '').then((res) => {
          if (!res.ok) showInteractionFeedback(res.message ?? 'Could not decline.', true);
        });
        break;
      }
      case 'remove': {
        if (!S.friendsSystem) return;
        void S.friendsSystem.removeFriend(d.uid ?? '').then((res) => {
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
        void S.friendsSystem?.deleteInboxMessage(d.msg ?? '');
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
    (window as unknown as Record<string, unknown>).__accraFriends = S.friendsSystem;
    (window as unknown as Record<string, unknown>).__accraVisit = {
      enter: enterVisitMode,
      leave: leaveVisitMode,
      state: () => ({ visiting: isVisiting(), session: S.visitSession })
    };
    (window as unknown as Record<string, unknown>).__accraShowcase = {
      setOverride: setDevShowcaseOverride
    };
    (window as unknown as Record<string, unknown>).__accraDev = {
      /** Read the live player world position (x, y, z). */
      pos: () => {
        const p = S.phase1SceneRef?.player.position;
        return p ? { x: p.x, y: p.y, z: p.z } : null;
      },
      /** Teleport the player to (x, z) and snap the camera behind them. */
      teleport: (x: number, z: number) => {
        if (!S.phase1SceneRef) return null;
        S.phase1SceneRef.player.position.set(x, 0.08, z);
        S.phase1SceneRef.thirdPersonCamera.resetBehindPlayer(
          S.phase1SceneRef.player.rotationY
        );
        return { x, z };
      },
      /** Which location def the given (or current) position resolves to. */
      loc: (x?: number, z?: number) => {
        const p = S.phase1SceneRef?.player.position;
        return getLocationAt(x ?? p!.x, z ?? p!.z).id;
      }
    };
  }
}

export function openFriendsSheet(): void {
  S.friendsSheetOpen = true;
  friendsModalBackdrop?.classList.add('open');
  renderFriendsSheet();
  updateFriendsBadge();
}

export function closeFriendsSheet(): void {
  S.friendsSheetOpen = false;
  friendsModalBackdrop?.classList.remove('open');
}

/** Pending badge = unanswered requests + unseen visit pings. */
export function updateFriendsBadge(): void {
  if (!friendsBadge) return;
  const requests = S.friendsSystem?.getPendingRequestCount() ?? 0;
  const pings = S.friendsSystem
    ? S.friendsSystem.getInbox().filter((m) => m.type === 'home_visit').length
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
export function renderFriendsSheet(): void {
  if (!friendsRequestsEl || !friendsListEl || !friendsNearbyEl || !friendsActivityEl) return;

  // ── 1. Pending friend requests ─────────────────────────────────────────
  const requests: InboxMessageView[] = S.friendsSystem
    ? S.friendsSystem.getInbox().filter((m) => m.type === 'friend_request')
    : [];
  if (!S.friendsSystem || S.friendsSystem.isGuest || requests.length === 0) {
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
  if (!S.friendsSystem || S.friendsSystem.isGuest) {
    friendsListEl.innerHTML =
      '<div class="friends-empty">Sign in with a verified email to make friends, visit homes & build your Accra crew.</div>';
  } else {
    const friends: FriendEntry[] = S.friendsSystem.getFriends();
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
  const nearby: NearbyPlayer[] = S.presenceManager?.getNearby() ?? [];
  if (!S.friendsSystem || S.friendsSystem.isGuest) {
    friendsNearbyEl.innerHTML = '';
    friendsNearbyEl.style.display = 'none';
  } else {
    const addable = nearby.filter(
      (p) => !S.friendsSystem?.isFriend(p.uid) && !S.friendsSystem?.hasRequested(p.uid) && !isPendingRequestFrom(p.uid)
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
  const activity: InboxMessageView[] = S.friendsSystem
    ? S.friendsSystem.getInbox().filter((m) => m.type === 'home_visit' || m.type === 'friend_accept')
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

export function isPendingRequestFrom(uid: string): boolean {
  return S.friendsSystem
    ? S.friendsSystem.getInbox().some((m) => m.type === 'friend_request' && m.fromUid === uid)
    : false;
}

// ── Visit mode: temporarily live inside a friend's home ────────────────────

/**
 * Swap the world compound to the host's home and teleport the player to
 * the compound gate. The host's layout comes from their validated
 * /homes/{uid} showcase — nothing foreign ever reaches the renderer raw.
 * The local player's HomeSystem state is left completely untouched.
 */
