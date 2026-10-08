/**
 * Accra Life — application entry point.
 *
 * Task 18 modular refactor: this file is deliberately tiny. It only
 * orchestrates the boot flow — every system now has a clear home:
 *
 *   - Gameplay system singletons + persistence: src/bootstrap/services.ts
 *   - HUD sync/feedback layer:                  src/ui/HUD.tsx
 *   - Game bootstrap (startGame):               src/bootstrap/game-init.ts
 *   - Agent runtime (GameAPI + debug handles):  src/bootstrap/agent-runtime.ts
 *   - 3D scene:                                 src/r3f/GameCanvas.tsx
 *   - Shared mutable state:                     src/bootstrap/state.ts
 *
 * Import order matters and mirrors the original monolith's module-scope
 * execution order: services are created + hydrated first, then the HUD
 * registers its wallet/needs callbacks, then onboarding starts the game.
 */
import { startOnboarding } from './onboarding';
import './bootstrap/services';
import './ui/HUD';
import { startGame } from './bootstrap/game-init';

startOnboarding((profile) => startGame(profile));
