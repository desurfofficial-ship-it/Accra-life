/**
 * Gameplay system singletons + persistence (Task 18 modular refactor).
 *
 * Created at module load exactly as in the original main.ts so hydration
 * and provider bindings run in the same order relative to HUD callback
 * registration (main.ts import order: services -> HUD).
 */

import { HeatSystem } from '../game/Crime/HeatSystem';
import { EconomyManager } from '../game/Economy/EconomyManager';
import { TrotroService } from '../game/World/TrotroService';
import { JobManager } from '../game/Jobs/JobManager';
import { VendorService } from '../game/Jobs/VendorService';
import { NeedsSystem } from '../game/Needs/NeedsSystem';
import { HomeSystem } from '../game/Home/HomeSystem';

export const economyManager = new EconomyManager();
/** Real passenger/capacity state for the ACC_TROTRO_001 van (skills v3.1). */
export const trotroService = new TrotroService();
// Persist ACC_TROTRO_001 seat counts inside the economy snapshot (and
// restore them on loadFromPersistence).
economyManager.bindTrotroPassengerState(
  () => trotroService.getSnapshot(),
  (n) => trotroService.loadPassengers(n)
);
export const jobSystem = new JobManager(economyManager);
/** Makola street-vendor timed shift (skills/vendor-system.md). */
export const vendorService = new VendorService(economyManager);
export const crimeSystem = new HeatSystem(economyManager);
export const needsSystem = new NeedsSystem();
export const homeSystem = new HomeSystem();
economyManager.bindExternalStateProviders(
  () => jobSystem.getPersistedState(),
  () => crimeSystem.getPersistedState()
);

const hydrated = economyManager.loadFromPersistence();
if (hydrated.jobs) jobSystem.hydrate(hydrated.jobs);
if (hydrated.crime) crimeSystem.hydrate(hydrated.crime);
