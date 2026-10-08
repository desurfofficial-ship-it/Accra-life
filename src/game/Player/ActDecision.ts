/**
 * Pure Act-button decision core (playability patch rule 3).
 *
 * Deliberately dependency-free (no THREE, no DOM, no bootstrap state) so
 * scripts/test_playability.ts can pin the decision matrix in plain node.
 * The DOM side (toast, marker flash, button caption) lives in
 * src/bootstrap/act.ts and feeds this function with plain numbers.
 */

export interface ActDecisionInput {
  /** InteractionSystem has a focused target (player inside its radius). */
  hasActiveTarget: boolean;
  /** Active job/hustle/illegal step targeting info, or null when idle. */
  objective: {
    targetInteractableId: string;
    targetTitle: string;
    stepTag: string;
  } | null;
  /** World-space position of the objective's registered target. */
  objectiveTargetPosition: { x: number; z: number } | null;
  /** Live player position (the R3F avatar, mirrored into the sim). */
  playerPosition: { x: number; z: number };
}

export type ActDecision =
  | { kind: 'interact' }
  | { kind: 'walk'; targetTitle: string; distanceM: number }
  | { kind: 'noObjective' };

/**
 * Decide what Act means right now. There is deliberately NO 'hub' kind —
 * the compile-time union makes the old openEconomyModal fallthrough
 * ("if (!triggerCurrentInteraction()) openEconomyModal('jobs')") unrepo-
 *resentable from this path. In range → interact; objective active but
 * out of range → walk guidance with live distance; idle → noObjective.
 */
export function resolveActDecision(input: ActDecisionInput): ActDecision {
  if (input.hasActiveTarget) return { kind: 'interact' };

  if (input.objective) {
    // The objective's target may not exist as a registered interactable
    // (e.g. a step keyed to an id the world doesn't register) — still
    // guide the player rather than dumping them into a menu. distanceM
    // -1 signals "direction known, no live distance".
    if (!input.objectiveTargetPosition) {
      return { kind: 'walk', targetTitle: input.objective.targetTitle, distanceM: -1 };
    }
    const dx = input.objectiveTargetPosition.x - input.playerPosition.x;
    const dz = input.objectiveTargetPosition.z - input.playerPosition.z;
    const distanceM = Math.round(Math.hypot(dx, dz));
    return {
      kind: 'walk',
      targetTitle: input.objective.targetTitle,
      distanceM
    };
  }

  return { kind: 'noObjective' };
}
