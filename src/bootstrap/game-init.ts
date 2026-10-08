/**
 * game-init.ts — GameAPI instantiation with all game systems.
 *
 * Extracts the systems construction from startGame() in src/main.ts into a
 * factory function. Creates: EconomyManager, JobManager, CrimeSystem,
 * NeedsSystem, HomeSystem, TrotroService, VendorService, GameAPI bridge,
 * plus wires the EventScheduler + GameClock.
 *
 * Returns a GameContext object that bundles the GameAPI + all the systems
 * so callers (agent-runtime, GameLoop, HUD) can access them without
 * importing main.ts internals.
 */
import { EconomyManager } from '../game/Economy/EconomyManager';
import { createGameAPI, type GameAPI } from '../game/GameAPI';
import { TrotroService } from '../game/World/TrotroService';
import { VendorService } from '../game/Jobs/VendorService';
import { JobManager } from '../game/Jobs/JobManager';
import { HeatSystem } from '../game/Crime/HeatSystem';
import { NeedsSystem } from '../game/Needs/NeedsSystem';
import { HomeSystem } from '../game/Home/HomeSystem';
import { eventService } from '../game/World/EventService';
import { eventScheduler } from '../game/Events/EventScheduler';
import { gameClock } from '../game/Time/GameClock';
import { Phase1Scene } from '../game/Core/Phase1Scene';
import type { OnboardingResult } from '../onboarding';

export interface GameContext {
  gameAPI: GameAPI;
  economy: EconomyManager;
  jobs: JobManager;
  crime: HeatSystem;
  needs: NeedsSystem;
  home: HomeSystem;
  trotro: TrotroService;
  vendor: VendorService;
  eventService: typeof eventService;
  eventScheduler: typeof eventScheduler;
  gameClock: typeof gameClock;
  phase1: Phase1Scene | null;
}

/**
 * Initialize all game systems + construct the GameAPI bridge.
 * Returns a GameContext bundling everything the runtime needs.
 *
 * The `profile` parameter (from onboarding) provides the player's
 * trait + origin for system initialization.
 */
export function initGame(profile?: OnboardingResult): GameContext {
  // Core systems (JobManager + HeatSystem require EconomyManager)
  const economy = new EconomyManager();
  const jobs = new JobManager(economy);
  const crime = new HeatSystem(economy);
  const needs = new NeedsSystem();
  const home = new HomeSystem();

  // Services
  const trotro = new TrotroService();
  const vendor = new VendorService(economy);

  // GameAPI bridge — only accepts economy/player/input/interactions/trotro/vendor
  const gameAPI = createGameAPI({
    economy,
    trotro,
    vendor,
    // input, interactions, player wired later by Phase1Scene
  });

  // Load persisted state
  const restored = economy.loadFromPersistence();
  if (restored.jobs) jobs.hydrate(restored.jobs);
  if (restored.crime) crime.hydrate(restored.crime);

  // Event system: EventScheduler takes over from EventService's real-time
  // auto-cycle. GameClock starts at in-game hour 6 (dawn) so the first
  // morning rush fires ~1 min after game start.
  gameClock.setHour(6);
  eventScheduler.init();

  // Expose singletons on window for dev console / AI / debug access.
  if (typeof window !== 'undefined') {
    (window as unknown as { GameAPI?: GameAPI }).GameAPI = gameAPI;
    (window as unknown as { __eventService?: typeof eventService }).__eventService = eventService;
    (window as unknown as { __gameClock?: typeof gameClock }).__gameClock = gameClock;
    (window as unknown as { __eventScheduler?: typeof eventScheduler }).__eventScheduler = eventScheduler;
  }

  return {
    gameAPI,
    economy,
    jobs,
    crime,
    needs,
    home,
    trotro,
    vendor,
    eventService,
    eventScheduler,
    gameClock,
    phase1: null, // set later when Phase1Scene is constructed
  };
}
