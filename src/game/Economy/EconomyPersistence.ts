import {
  createInitialOwnershipFoundations,
  EconomicProgressionLevel,
  PlayerOwnershipFoundations
} from './EconomicTypes';
import { SerializedWalletState } from './Wallet';

export interface PersistedJobState {
  activeJobId: string | null;
  status: 'AVAILABLE' | 'ACCEPTED' | 'WORKING' | 'COMPLETED' | 'PAID';
  currentStepIndex: number;
  completedJobCounts: Record<string, number>;
  activeHustleId: string | null;
  activeHustleStepIndex: number;
}

export interface PersistedCrimeState {
  heatLevel: number;
  policeStatus: 'NORMAL' | 'SUSPICIOUS' | 'WANTED' | 'ARRESTED';
  activeIllegalId: string | null;
  activeIllegalStepIndex: number;
  arrestCount: number;
}

export interface PersistedPhase3EconomySnapshot {
  version: 1;
  savedAt: number;
  wallet: SerializedWalletState;
  progressionLevel: EconomicProgressionLevel;
  ownership: PlayerOwnershipFoundations;
  jobs: PersistedJobState;
  crime: PersistedCrimeState;
}

const STORAGE_KEY = 'chale_life_phase3_economy_v1';

export class EconomyPersistence {
  public static loadLocal(): PersistedPhase3EconomySnapshot | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedPhase3EconomySnapshot;
      if (!parsed || parsed.version !== 1 || !parsed.wallet) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  public static saveLocal(snapshot: PersistedPhase3EconomySnapshot): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore quota errors in restricted browser contexts
    }

    // Also sync asynchronously to existing Firebase player document if authenticated
    void EconomyPersistence.syncToAuthenticatedFirestore(snapshot);
  }

  public static clearLocal(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
  }

  public static createDefaultSnapshot(): PersistedPhase3EconomySnapshot {
    return {
      version: 1,
      savedAt: Date.now(),
      wallet: {
        cashBalance: 0,
        momoBalance: 0,
        bankBalance: 0,
        unsecuredIllegalCash: 0,
        lifetimeEarnedGHS: 0,
        lifetimeSpentGHS: 0,
        transactions: []
      },
      progressionLevel: 'LEVEL_1_SURVIVAL',
      ownership: createInitialOwnershipFoundations(),
      jobs: {
        activeJobId: null,
        status: 'AVAILABLE',
        currentStepIndex: 0,
        completedJobCounts: {},
        activeHustleId: null,
        activeHustleStepIndex: 0
      },
      crime: {
        heatLevel: 0,
        policeStatus: 'NORMAL',
        activeIllegalId: null,
        activeIllegalStepIndex: 0,
        arrestCount: 0
      }
    };
  }

  private static async syncToAuthenticatedFirestore(
    snapshot: PersistedPhase3EconomySnapshot
  ): Promise<void> {
    try {
      const { auth, db } = await import('../../firebase');
      if (!auth.currentUser) return;
      const { doc, setDoc } = await import('firebase/firestore');
      const playerRef = doc(db, 'players', auth.currentUser.uid);
      await setDoc(
        playerRef,
        {
          phase3Economy: snapshot,
          updatedAt: Date.now()
        },
        { merge: true }
      );
    } catch {
      // Operate cleanly offline if user is not signed in or Firestore is unreachable
    }
  }
}
