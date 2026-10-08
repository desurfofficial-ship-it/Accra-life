/**
 * Multiplayer wiring (Task 18 refactor).
 * PresenceManager + LocationChatManager + NearbyPlayerAvatars + location
 * boundary tracking; calls into chat.ts for HUD pills and friends.ts via
 * initFriends.
 */

import { chatOpenBtn, chatModalBackdrop, chatSheetTitle, chatSheetSub, chatInput, chatSendBtn, nearbyStrip, currentLocationPill } from '../ui/dom-refs';
import { S } from './state';
import { restoreHousingFromCloud } from './housing-ui';
import { initFriends } from './friends';
import { setStatusPill, setNearbyStrip, setCurrentLocationPill, openChatSheet, closeChatSheet, sendChatMessage, renderChatMessages, updateChatBadge, renderChatSheetNearby, updatePlaceRecoveryButton } from './chat';
import { Phase1Scene } from '../game/Core/Phase1Scene';
import { type OnboardingResult } from '../onboarding';
import { NearbyPlayerAvatars } from '../game/Multiplayer/NearbyPlayerAvatars';
import { PresenceManager } from '../game/Multiplayer/PresenceManager';
import { LocationChatManager } from '../game/Multiplayer/LocationChatManager';
import { getLocationAt } from '../game/World/Locations';

export function initMultiplayer(profile: OnboardingResult, phase1: Phase1Scene): void {
  // Derive initial location from the player's spawn position. The
  // PlayerController spawns at (0, 0, 5.8) — south sidewalk, which falls
  // inside the Oxford Street bounds (z = -7.7..7.7).
  const spawn = phase1.player.position;
  const spawnLoc = getLocationAt(spawn.x, spawn.z);
  S.currentLocationId = spawnLoc.id;
  S.isAccountMode = profile.mode === 'account' && !!profile.userId;
  S.presenceManager = new PresenceManager({
    uid: profile.userId ?? '',
    displayName: profile.displayName || 'Chale',
    currentLocation: S.currentLocationId,
    origin: profile.origin,
    look: { skin: profile.skin, hair: profile.hair }
  });
  S.chatManager = new LocationChatManager({
    uid: profile.userId,
    displayName: profile.displayName || 'Chale',
    locationId: S.currentLocationId,
    origin: profile.origin
  });

  // 3D avatars: one character rig per nearby signed-in player. Presence
  // snapshots (20s heartbeats) are smoothed by the avatar system's lerp.
  // Guests never subscribe to presence, so they simply see nobody —
  // consistent with the HUD's read-only guest mode.
  S.nearbyAvatars = new NearbyPlayerAvatars(phase1.scene);

  // Initial UI: pill + chat sheet title reflect the spawn location.
  setCurrentLocationPill(spawnLoc.id, false);
  if (chatSheetTitle) chatSheetTitle.textContent = `At ${spawnLoc.displayName}`;

  // Chat: always start (guests can read). Presence: only for accounts.
  S.chatManager.enter();
  if (S.isAccountMode) {
    void S.presenceManager.enter().catch((err) => {
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
    if (S.presenceManager) void S.presenceManager.leave();
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
  S.chatManager.onMessages((messages) => {
    renderChatMessages(messages);
    if (S.chatSheetOpen) {
      S.chatUnreadCount = 0;
      S.chatLastSeenAtMs = Date.now();
      updateChatBadge();
    } else {
      const newOnes = messages.filter(
        (m) => !m.isMine && m.createdAtMs !== null && m.createdAtMs > S.chatLastSeenAtMs
      );
      if (newOnes.length > 0) {
        S.chatUnreadCount += newOnes.length;
        S.chatLastSeenAtMs = Math.max(...newOnes.map((m) => m.createdAtMs ?? 0));
        updateChatBadge();
      }
    }
  });

  // Render nearby updates + presence status.
  S.presenceManager.onNearby((players) => {
    setNearbyStrip(players, S.isAccountMode);
    // Spawn/despawn/update the 3D rigs for nearby players.
    S.nearbyAvatars?.syncFromNearby(players);
    if (S.chatSheetOpen) renderChatSheetNearby(players);
  });
  S.presenceManager.onStatus((status) => {
    if (S.isAccountMode) {
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
    S.presenceManager?.reportPosition(p.x, p.z, phase1.player.rotationY);
    const newLoc = getLocationAt(p.x, p.z);
    if (newLoc.id !== S.currentLocationId) {
      S.currentLocationId = newLoc.id;
      S.presenceManager?.updateLocation(newLoc.id);
      S.chatManager?.switchLocation(newLoc.id);
      setCurrentLocationPill(newLoc.id, true);
      updatePlaceRecoveryButton(true);
      if (chatSheetTitle) chatSheetTitle.textContent = `At ${newLoc.displayName}`;
      if (chatSheetSub) {
        chatSheetSub.textContent = S.isAccountMode
          ? `${newLoc.displayName} — local chat, everyone here can see this.`
          : `${newLoc.displayName} — sign in to send messages & be seen.`;
      }
    }
  }, 2_000);

  // Click on the location pill opens the chat sheet (so players can see
  // who's at the current place without reaching for the chat button).
  currentLocationPill?.addEventListener('click', () => openChatSheet());
}
