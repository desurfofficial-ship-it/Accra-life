/**
 * Home visiting — enter/leave a friend's compound (Task 18 refactor).
 * The world compound is rebuilt for the HOST's tier + furniture; the local
 * player's HomeSystem is never mutated. Home-editing entry points are
 * blocked while visiting (blockIfVisiting guard).
 */

import { visitBannerEl, visitBannerTextEl } from '../ui/dom-refs';
import { buildPlacedFurnitureMesh } from '../game/Housing/PlacementEngine';
import { S, placedFurnitureMeshes } from './state';
import { visitFurnitureMeshes, visitPingSentFor, COMPOUND_GATE_SPAWN, ROOM_ORIGIN } from './state';
import { homeSystem } from './services';
import { showInteractionFeedback } from '../ui/HUD';
import { syncPlacedFurnitureMeshes } from './housing-ui';
import { disposeObject3D, isValidUidStr } from './utils';
import { HOUSING_TIERS, type FurnitureId } from '../game/Home/HomeSystem';
import { fetchHomeShowcase } from '../game/Home/HomeShowcase';
import { rebuildPlayerCompoundForTier } from '../game/World/PlayerCompound';

/** True while the local player is inside a friend's home (visit mode). */
export function isVisiting(): boolean {
  return S.visitSession !== null;
}

/** Guard for home-editing entry points — blocked during a home visit. */
export function blockIfVisiting(actionLabel = 'that'): boolean {
  if (!S.visitSession) return false;
  showInteractionFeedback(`Not your crib while visiting ${S.visitSession.hostName} — leave first.`, true);
  void actionLabel;
  return true;
}

export async function enterVisitMode(hostUid: string, hostName: string): Promise<void> {
  if (!S.phase1SceneRef) return;
  if (!S.friendsSystem || S.friendsSystem.isGuest) {
    showInteractionFeedback('Sign in to visit homes.', true);
    return;
  }
  if (!isValidUidStr(hostUid)) {
    showInteractionFeedback('Bad host id.', true);
    return;
  }
  if (S.visitSession) leaveVisitMode();

  showInteractionFeedback(`Knocking on ${hostName}'s door…`);
  const showcase = await fetchHomeShowcase(hostUid);
  if (!showcase) {
    showInteractionFeedback(`${hostName}'s home isn't published yet — they need to play once on the new build.`, true);
    return;
  }
  if (!S.phase1SceneRef) return; // scene can die while awaiting the fetch

  const scene = S.phase1SceneRef.scene;
  S.visitSession = {
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
  S.homeVisuals?.sync([], []);

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

  // 3) Teleport to the compound gate (same respawn spot as arrests; the
  //    pre-map gate coords used to strand visitors ~22 m from the venue).
  //    rotationY = 0 faces +z (toward the courtyard / home_door).
  S.phase1SceneRef.player.position.set(COMPOUND_GATE_SPAWN.x, COMPOUND_GATE_SPAWN.y, COMPOUND_GATE_SPAWN.z);
  S.phase1SceneRef.player.rotationY = 0;

  // 4) Banner + courtesy ping to the host (once per host per session).
  updateVisitBanner();
  visitBannerEl?.classList.add('visible');
  if (!visitPingSentFor.has(hostUid)) {
    visitPingSentFor.add(hostUid);
    void S.friendsSystem.sendVisitPing(hostUid, hostName);
  }
  showInteractionFeedback(`Welcome to ${hostName}'s place — make yourself at home.`);
}

/** Restore the player's own compound, furniture, position and HUD. */
export function leaveVisitMode(): void {
  if (!S.visitSession || !S.phase1SceneRef) return;
  const scene = S.phase1SceneRef.scene;

  for (const mesh of visitFurnitureMeshes) {
    scene.remove(mesh);
    disposeObject3D(mesh);
  }
  visitFurnitureMeshes.length = 0;

  rebuildPlayerCompoundForTier(S.visitSession.savedTier);
  S.homeVisuals?.sync(homeSystem.getOwned(), homeSystem.getPlaced());
  syncPlacedFurnitureMeshes(scene);

  S.phase1SceneRef.player.position.set(COMPOUND_GATE_SPAWN.x, COMPOUND_GATE_SPAWN.y, COMPOUND_GATE_SPAWN.z);
  S.phase1SceneRef.player.rotationY = 0;

  const hostName = S.visitSession.hostName;
  S.visitSession = null;
  visitBannerEl?.classList.remove('visible');
  showInteractionFeedback(`Back at your own crib. Thanks for visiting ${hostName}!`);
}

export function updateVisitBanner(): void {
  if (!visitBannerTextEl || !S.visitSession) return;
  const tier = HOUSING_TIERS.find((t) => t.id === S.visitSession?.hostTier) ?? HOUSING_TIERS[0];
  visitBannerTextEl.textContent = `🏠 Visiting ${S.visitSession.hostName} — ${tier.title}`;
}

/** Shared disposal for visit meshes (same hygiene as mesh sync). */
