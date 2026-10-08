/**
 * Act-button decision layer (playability patch rule 3).
 *
 * Act NEVER opens a menu. Shared by the Act button and the E key via handleActPress.
 */

import { S } from './state';
import { getActiveObjectiveInfo, showInteractionFeedback } from '../ui/HUD';
import { interactTriggerBtn } from '../ui/dom-refs';
import {
  resolveActDecision,
  type ActDecision,
  type ActDecisionInput,
} from '../game/Player/ActDecision';

export { resolveActDecision };
export type { ActDecision, ActDecisionInput };

function shortTargetLabel(targetId: string, fallback: string): string {
  const short: Record<string, string> = {
    food_vendor: 'Waakye Joint',
    home_door: 'Compound',
    provision_shop: 'Provision Store',
    trotro_stop: 'Trotro Stop',
    makola_vendor_stand: 'Vendor Stand',
    momo_agent: 'MoMo Agent',
    susu_collector: 'Susu Kiosk',
    chale_wote_panel: 'Mural Wall',
    npc_older_001: 'Uncle Mensah',
    npc_male_001: 'Kojo',
    npc_female_001: 'Ama',
  };
  return short[targetId] || fallback;
}

export function updateActButtonLabel(): void {
  const p1 = S.phase1SceneRef;
  if (!p1 || !interactTriggerBtn) return;

  const activeTarget = p1.interactionSystem.getActiveTarget();
  const obj = getActiveObjectiveInfo();
  const objectiveMatches =
    obj && activeTarget && obj.targetInteractableId === activeTarget.id;

  if (activeTarget) {
    if (objectiveMatches && obj) {
      interactTriggerBtn.textContent = `Act: ${obj.actionVerb || 'Interact'}`;
    } else {
      interactTriggerBtn.textContent = `Act: ${shortTargetLabel(activeTarget.id, activeTarget.promptLabel)}`;
    }
    return;
  }

  const objTarget = p1.interactionSystem.getObjectiveTarget();
  if (obj && objTarget) {
    const dx = objTarget.position.x - p1.player.position.x;
    const dz = objTarget.position.z - p1.player.position.z;
    const dist = Math.round(Math.hypot(dx, dz));
    interactTriggerBtn.textContent = `Walk: ${obj.targetLocationName || objTarget.title} (${dist}m)`;
    return;
  }

  interactTriggerBtn.textContent = 'Act';
}

/** Shared Act press — button and E key. Never opens the hub. */
export function handleActPress(): void {
  const p1 = S.phase1SceneRef;
  if (!p1) return;
  const obj = getActiveObjectiveInfo();
  const objTarget = p1.interactionSystem.getObjectiveTarget();
  const decision = resolveActDecision({
    hasActiveTarget: p1.interactionSystem.getActiveTarget() !== null,
    objective: obj
      ? {
          targetInteractableId: obj.targetInteractableId,
          targetTitle: obj.targetLocationName || obj.stepTitle,
          stepTag: obj.tag,
        }
      : null,
    objectiveTargetPosition: objTarget
      ? { x: objTarget.position.x, z: objTarget.position.z }
      : null,
    playerPosition: p1.player.position,
  });
  if (decision.kind === 'interact') {
    p1.interactionSystem.triggerCurrentInteraction();
    return;
  }
  if (decision.kind === 'walk') {
    const where =
      decision.distanceM >= 0
        ? `${decision.targetTitle} (${decision.distanceM}m)`
        : decision.targetTitle;
    showInteractionFeedback(`Walk to ${where}`, true);
    p1.interactionSystem.flashObjectiveMarker();
    return;
  }
  showInteractionFeedback('No active hustle — tap JOBS to pick one', true);
}
