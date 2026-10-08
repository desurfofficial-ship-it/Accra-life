/**
 * bootstrap/index.ts — Clean orchestrator entry point (phase-0.5).
 *
 * This is the TARGET architecture for the game's boot flow:
 *   1. Initialize Firebase (auth + firestore)
 *   2. Initialize all game systems (economy, jobs, crime, needs, home,
 *      trotro, vendor, GameAPI bridge, event scheduler, game clock)
 *   3. Start the agent runtime (RAF loop that ticks all systems per frame)
 *   4. Render the R3F game canvas
 *
 * CURRENT STATE (phase-0.5):
 *   src/main.ts is still the live entry point (2718 lines, called from
 *   index.html's <script> tag). It calls startOnboarding() → startGame()
 *   which does all the above inline. This module provides the clean
 *   orchestrator interface that future refactors will migrate to.
 *
 * Migration path:
 *   1. ✅ Create the 6 modular files (this PR — phase-0.5)
 *   2. ⏳ Extract onboarding flow → src/ui/Onboarding.tsx (phase-1)
 *   3. ⏳ Extract HUD DOM → src/ui/HUD.tsx React components (phase-1)
 *   4. ⏳ Extract modal rendering → src/ui/Modals.tsx (phase-2)
 *   5. ⏳ Extract home sheet → src/ui/HomeSheet.tsx (phase-2)
 *   6. ⏳ Extract friends/chat → src/ui/SocialSheet.tsx (phase-3)
 *   7. ⏳ Switch index.html to load src/bootstrap/index.ts (phase-3)
 *
 * When fully migrated, src/main.ts will be DELETED and this file
 * becomes the sole entry point.
 */
import { initFirebase } from './firebase-init';
import { initGame, type GameContext } from './game-init';
import { startAgentRuntime, type AgentRuntime } from './agent-runtime';
import { renderGame } from '../r3f/GameCanvas';

export interface BootstrapResult {
  gameAPI: GameContext['gameAPI'];
  context: GameContext;
  runtime: AgentRuntime;
}

/**
 * The clean bootstrap orchestrator.
 *
 * This is the TARGET entry point — not yet wired to index.html.
 * Currently src/main.ts handles the full boot flow inline.
 * Call this function when the migration is complete.
 */
export async function bootstrap(): Promise<BootstrapResult> {
  // 1. Initialize Firebase
  await initFirebase();

  // 2. Initialize game systems
  const context = initGame();

  // 3. Start the agent runtime (per-frame system updates)
  const runtime = startAgentRuntime(context);

  // 4. Render the R3F game canvas
  renderGame(context.gameAPI);

  return {
    gameAPI: context.gameAPI,
    context,
    runtime,
  };
}

// Re-export for convenience
export { initFirebase, initGame, startAgentRuntime, renderGame };
export type { GameContext } from './game-init';
export type { AgentRuntime } from './agent-runtime';
