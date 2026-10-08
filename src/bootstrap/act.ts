/**
 * Act-button decision layer (playability patch rule 3).
 *
 * The old handler was one line that broke the whole core loop:
 *
 *   if (!phase1.interactionSystem.triggerCurrentInteraction()) openEconomyModal('jobs');
 *
 * Act used to fall through to the JOBS hub whenever no interactable was
 * focused, so players who accepted a job/hustle but stood outside the
 * (invisible) target radius got a menu instead of gameplay — no objective
 * ever advanced and nobody earned. This module owns the NEW contract:
 *
 *   1. A focused target is in range  → run the interaction (return true).
 *   2. An objective is active but the player is out of range → tell them
 *      WHERE to walk and HOW FAR ("Walk to Aunty Ba (32m)") and flash the
 *      objective marker. NEVER open a menu.
 *   3. No objective at all → a one-line nudge toward the JOBS button.
 *      The hub itself stays on the JOBS button, exactly as before.
 *
 * resolveActDecision() is pure so scripts/test_playability.ts can pin the
 * matrix (in-range Acts; 50 m walks; no hub kind exists at all).
 */

import { S } from './state';
import { getActiveObjectiveInfo } from '../ui/HUD';
import { interactTriggerBtn } from '../ui/dom-refs';

// The pure decision matrix lives in src/game/Player/ActDecision.ts (no
// DOM/three imports) so the headless test suite can pin it. Re-exported
// here for game-init's single import surface.
export { resolveActDecision } from '../game/Player/ActDecision';
export type { ActDecision, ActDecisionInput } from '../game/Player/ActDecision';

/** Short Act-button caption for a focused interactable id (prompt map
 * mirrors updateInteractionPromptUI's short labels). */
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
    npc_female_001: 'Ama'
  };
  return short[targetId] || fallback;
}

/**
 * Refresh the Act button caption on the 500 ms UI cadence:
 *   - focused target + objective step → "Act: Carry Pans"
 *   - focused target, no objective   → "Act: Waakye Joint"
 *   - objective active, out of range → "Walk: Aunty Ba (32m)"
 *   - idle                           → "Act"
 */
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
