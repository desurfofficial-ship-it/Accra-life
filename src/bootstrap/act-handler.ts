/**
 * Act / [E] interaction handler — single path for the interact button
 * and the keyboard E/Enter key.
 *
 * NEVER opens the Jobs hub. The hub is only opened from the Jobs button.
 * When the player has an active job/hustle step, Act advances it if within
 * range, otherwise toasts "Walk to <place> (<distance> m)".
 */

import * as THREE from 'three';
import { S } from './state';
import { jobSystem, crimeSystem } from './services';
import { showInteractionFeedback, syncEconomyHUD, getActiveObjectiveInfo } from '../ui/HUD';
import { handleWorldTargetInteracted } from './interactions';

/** Proximity radius (meters) to perform an active job/hustle step. */
export const ACT_RANGE_M = 2.5;

function getPlayerWorldPos(): THREE.Vector3 | null {
  const phase1 = S.phase1SceneRef;
  if (!phase1) return null;
  // Prefer R3F avatar (authoritative visible player), fall back to systems player.
  const r3f = (window as unknown as {
    __r3fPlayer?: { current: { position: THREE.Vector3 } | null };
  }).__r3fPlayer;
  const avatar = r3f?.current;
  if (avatar) {
    return avatar.position.clone();
  }
  return phase1.player.position.clone();
}

function findTargetById(id: string) {
  const phase1 = S.phase1SceneRef;
  if (!phase1) return null;
  return phase1.interactionSystem.getTargets().find((t) => t.id === id) ?? null;
}

/**
 * Attempt Act / [E]. Returns true if something was handled (step advanced,
 * interaction fired, or guidance toast shown). Never opens the economy modal.
 */
export function handleActPress(): boolean {
  const phase1 = S.phase1SceneRef;
  if (!phase1) return false;

  const playerPos = getPlayerWorldPos();
  if (!playerPos) return false;

  // 1) Active objective (job / hustle / illegal) — highest priority.
  const objective = getActiveObjectiveInfo();
  if (objective) {
    const target = findTargetById(objective.targetInteractableId);
    if (!target) {
      showInteractionFeedback(`Walk to ${objective.stepTitle}`, true);
      return true;
    }
    const dx = target.position.x - playerPos.x;
    const dz = target.position.z - playerPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= ACT_RANGE_M) {
      handleWorldTargetInteracted(target);
      const next = getActiveObjectiveInfo();
      phase1.interactionSystem.setObjectiveTarget(
        next?.targetInteractableId ?? null,
        next?.isRisky ?? false
      );
      publishObjectiveWorldPos(next ? findTargetById(next.targetInteractableId)?.position ?? null : null);
      return true;
    }
    const place = objective.stepTitle || target.title;
    showInteractionFeedback(`Walk to ${place} (${Math.round(dist)} m)`, true);
    phase1.interactionSystem.setObjectiveTarget(
      objective.targetInteractableId,
      objective.isRisky
    );
    publishObjectiveWorldPos(target.position);
    return true;
  }

  // 2) Nearby generic interactable (shop, door, NPC, etc.).
  if (phase1.interactionSystem.triggerCurrentInteraction()) {
    return true;
  }

  // 3) Nothing in range — gentle guidance, still no hub.
  const active = jobSystem.getActiveJob() || jobSystem.getActiveHustle();
  if (active) {
    showInteractionFeedback(`Walk to ${active.currentStep.targetLocationName}`, true);
  } else {
    showInteractionFeedback('Walk to a glowing marker, or open Jobs', true);
  }
  return true;
}

/** Publish the active objective world position for the R3F marker layer. */
export function publishObjectiveWorldPos(pos: THREE.Vector3 | null): void {
  const w = window as unknown as {
    __objectiveWorldPos?: { x: number; y: number; z: number; label?: string } | null;
  };
  if (!pos) {
    w.__objectiveWorldPos = null;
    return;
  }
  const info = getActiveObjectiveInfo();
  w.__objectiveWorldPos = {
    x: pos.x,
    y: pos.y,
    z: pos.z,
    label: info?.stepTitle
  };
}

/** Refresh objective beacon + R3F marker from current job state. */
export function syncObjectiveMarkers(): void {
  const phase1 = S.phase1SceneRef;
  if (!phase1) return;
  const info = getActiveObjectiveInfo();
  if (!info) {
    phase1.interactionSystem.setObjectiveTarget(null);
    publishObjectiveWorldPos(null);
    return;
  }
  phase1.interactionSystem.setObjectiveTarget(info.targetInteractableId, info.isRisky);
  const target = findTargetById(info.targetInteractableId);
  publishObjectiveWorldPos(target?.position ?? null);
}
