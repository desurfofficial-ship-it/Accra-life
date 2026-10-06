import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';

export type CloudSaveAuthStatus =
  | 'verified_account'
  | 'unverified_email'
  | 'anonymous_guest'
  | 'local_guest';
import { PaymentChannel, TransactionCategory } from './EconomicTypes';
import { createTransactionRecord, TransactionRecord } from './Transaction';

export interface SerializedWalletState {
  cashBalance: number;
  momoBalance: number;
  bankBalance: number;
  unsecuredIllegalCash: number;
  lifetimeEarnedGHS: number;
  lifetimeSpentGHS: number;
  transactions: TransactionRecord[];
}

export interface AddFundsParams {
  amount: number;
  category: TransactionCategory;
  description: string;
  sourceEntityId?: string;
  channel?: PaymentChannel;
  isIllegalOrigin?: boolean;
}

export interface RemoveFundsParams {
  amount: number;
  category: TransactionCategory;
  description: string;
  targetEntityId?: string;
  channel?: PaymentChannel;
}

export interface WalletValidationResult {
  success: boolean;
  error?: string;
  transaction: TransactionRecord | null;
  balanceAfter: number;
}

export type WalletChangeListener = (
  balance: number,
  transaction: TransactionRecord | null
) => void;

const MAX_TRANSACTION_HISTORY = 40;
const LOCAL_WALLET_STORAGE_KEY = 'chale_life_wallet_v1';
const MAX_SINGLE_CREDIT_GHS = 5000;

const ALLOWED_INCOME_CATEGORIES: ReadonlySet<TransactionCategory> = new Set([
  'WAGES',
  'JOB_PAYMENT',
  'SIDE_HUSTLE',
  'SALE',
  'REWARD',
  'RISKY_HUSTLE'
]);

const ALLOWED_EXPENSE_CATEGORIES: ReadonlySet<TransactionCategory> = new Set([
  'FOOD',
  'TRANSPORT',
  'PURCHASE',
  'FINE',
  'CONFISCATION'
]);

export class Wallet {
  private cashBalance = 0;
  private momoBalance = 0;
  private bankBalance = 0;
  private unsecuredIllegalCash = 0;
  private lifetimeEarnedGHS = 0;
  private lifetimeSpentGHS = 0;
  private transactions: TransactionRecord[] = [];
  private listeners: Set<WalletChangeListener> = new Set();

  constructor(enableFirebaseAutoSync = true) {
    // Strictly initialize the player at ₵0.00 across all channels
    this.cashBalance = 0;
    this.momoBalance = 0;
    this.bankBalance = 0;
    this.unsecuredIllegalCash = 0;
    this.lifetimeEarnedGHS = 0;
    this.lifetimeSpentGHS = 0;

    if (enableFirebaseAutoSync) {
      this.bindFirebaseAuthSync();
    }
  }

  public getCashBalance(): number {
    return this.cashBalance;
  }

  public getMomoBalance(): number {
    return this.momoBalance;
  }

  public getBankBalance(): number {
    return this.bankBalance;
  }

  public getUnsecuredIllegalCash(): number {
    return this.unsecuredIllegalCash;
  }

  public getLifetimeEarned(): number {
    return this.lifetimeEarnedGHS;
  }

  public getLifetimeSpent(): number {
    return this.lifetimeSpentGHS;
  }

  public getTransactions(): ReadonlyArray<TransactionRecord> {
    return this.transactions;
  }

  public canAfford(amount: number, channel: PaymentChannel = 'CASH'): boolean {
    if (!Number.isFinite(amount) || amount < 0) return false;
    if (amount === 0) return true;
    const balance = this.getChannelBalance(channel);
    return balance + 0.0001 >= amount;
  }

  /**
   * Validated method to add funds to the player's wallet.
   * Rejects invalid amounts, unverified categories, empty descriptions, or "magic money" spikes.
   */
  public addFunds(params: AddFundsParams): WalletValidationResult {
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      return {
        success: false,
        error: 'Invalid fund amount: must be a positive finite number.',
        transaction: null,
        balanceAfter: this.cashBalance
      };
    }

    const cleanAmount = Math.round(params.amount * 100) / 100;
    if (cleanAmount <= 0 || cleanAmount > MAX_SINGLE_CREDIT_GHS) {
      return {
        success: false,
        error: `Rejected unverified credit amount (₵${cleanAmount.toFixed(2)}).`,
        transaction: null,
        balanceAfter: this.cashBalance
      };
    }

    if (!ALLOWED_INCOME_CATEGORIES.has(params.category)) {
      return {
        success: false,
        error: `Category "${params.category}" is not a valid income source.`,
        transaction: null,
        balanceAfter: this.cashBalance
      };
    }

    const cleanDesc = (params.description ?? '').trim();
    if (cleanDesc.length < 3) {
      return {
        success: false,
        error: 'Every credit requires a verified work or hustle description.',
        transaction: null,
        balanceAfter: this.cashBalance
      };
    }

    const channel = params.channel ?? 'CASH';
    this.addChannelBalance(channel, cleanAmount);
    this.lifetimeEarnedGHS = Math.round((this.lifetimeEarnedGHS + cleanAmount) * 100) / 100;

    if (params.isIllegalOrigin) {
      this.unsecuredIllegalCash = Math.round(
        (this.unsecuredIllegalCash + cleanAmount) * 100
      ) / 100;
    }

    const finalDescription = params.sourceEntityId
      ? `${cleanDesc} [${params.sourceEntityId}]`
      : cleanDesc;

    const tx = createTransactionRecord({
      amount: cleanAmount,
      type: 'INCOME',
      category: params.category,
      channel,
      description: finalDescription,
      balanceAfter: this.cashBalance,
      isIllegalOrigin: params.isIllegalOrigin
    });

    this.recordTransaction(tx);
    this.persistState();
    this.notifyListeners(tx);

    return {
      success: true,
      transaction: tx,
      balanceAfter: this.cashBalance
    };
  }

  /**
   * Validated method to remove funds from the player's wallet.
   * Ensures the player can afford the expense and never permits negative balances.
   */
  public removeFunds(params: RemoveFundsParams): WalletValidationResult {
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      return {
        success: false,
        error: 'Invalid deduction amount: must be a positive finite number.',
        transaction: null,
        balanceAfter: this.cashBalance
      };
    }

    const cleanAmount = Math.round(params.amount * 100) / 100;
    if (cleanAmount <= 0) {
      return {
        success: false,
        error: 'Deduction amount must be greater than ₵0.00.',
        transaction: null,
        balanceAfter: this.cashBalance
      };
    }

    if (!ALLOWED_EXPENSE_CATEGORIES.has(params.category)) {
      return {
        success: false,
        error: `Category "${params.category}" is not a valid expense category.`,
        transaction: null,
        balanceAfter: this.cashBalance
      };
    }

    const channel = params.channel ?? 'CASH';
    if (!this.canAfford(cleanAmount, channel)) {
      return {
        success: false,
        error: `Insufficient funds in ${channel} (Requires ₵${cleanAmount.toFixed(2)}, Available ₵${this.getChannelBalance(channel).toFixed(2)}).`,
        transaction: null,
        balanceAfter: this.cashBalance
      };
    }

    const cleanDesc = (params.description ?? '').trim() || 'Accra Expense';
    this.addChannelBalance(channel, -cleanAmount);
    this.lifetimeSpentGHS = Math.round((this.lifetimeSpentGHS + cleanAmount) * 100) / 100;

    if (channel === 'CASH' && this.unsecuredIllegalCash > 0) {
      this.unsecuredIllegalCash = Math.max(
        0,
        Math.round((this.unsecuredIllegalCash - cleanAmount) * 100) / 100
      );
    }

    const tx = createTransactionRecord({
      amount: cleanAmount,
      type: 'EXPENSE',
      category: params.category,
      channel,
      description: cleanDesc,
      balanceAfter: this.cashBalance
    });

    this.recordTransaction(tx);
    this.persistState();
    this.notifyListeners(tx);

    return {
      success: true,
      transaction: tx,
      balanceAfter: this.cashBalance
    };
  }

  public receiveMoney(params: AddFundsParams): TransactionRecord | null {
    return this.addFunds(params).transaction;
  }

  public spendMoney(params: RemoveFundsParams): TransactionRecord | null {
    return this.removeFunds(params).transaction;
  }

  /**
   * Confiscates any remaining illegal earnings held in cash and optionally applies a fine
   * up to the player's available cash balance.
   */
  public applyPoliceConfiscationAndFine(maxFineGHS: number): {
    confiscatedGHS: number;
    finePaidGHS: number;
    transaction: TransactionRecord | null;
  } {
    const confiscatedGHS = Math.min(this.cashBalance, this.unsecuredIllegalCash);
    this.cashBalance = Math.max(0, Math.round((this.cashBalance - confiscatedGHS) * 100) / 100);
    this.unsecuredIllegalCash = 0;

    const finePaidGHS = Math.min(
      this.cashBalance,
      Math.max(0, Math.round(maxFineGHS * 100) / 100)
    );
    this.cashBalance = Math.max(0, Math.round((this.cashBalance - finePaidGHS) * 100) / 100);

    const totalDeducted = Math.round((confiscatedGHS + finePaidGHS) * 100) / 100;
    if (totalDeducted <= 0) {
      return { confiscatedGHS: 0, finePaidGHS: 0, transaction: null };
    }

    this.lifetimeSpentGHS = Math.round((this.lifetimeSpentGHS + totalDeducted) * 100) / 100;

    const tx = createTransactionRecord({
      amount: totalDeducted,
      type: 'EXPENSE',
      category: confiscatedGHS > 0 ? 'CONFISCATION' : 'FINE',
      channel: 'CASH',
      description:
        confiscatedGHS > 0 && finePaidGHS > 0
          ? `Police seizure (₵${confiscatedGHS.toFixed(2)}) & fine (₵${finePaidGHS.toFixed(2)})`
          : confiscatedGHS > 0
            ? 'Police confiscation of contraband proceeds'
            : 'Police misdemeanor fine',
      balanceAfter: this.cashBalance
    });

    this.recordTransaction(tx);
    this.persistState();
    this.notifyListeners(tx);
    return { confiscatedGHS, finePaidGHS, transaction: tx };
  }

  public onBalanceChange(listener: WalletChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public serialize(): SerializedWalletState {
    return {
      cashBalance: this.cashBalance,
      momoBalance: this.momoBalance,
      bankBalance: this.bankBalance,
      unsecuredIllegalCash: this.unsecuredIllegalCash,
      lifetimeEarnedGHS: this.lifetimeEarnedGHS,
      lifetimeSpentGHS: this.lifetimeSpentGHS,
      transactions: [...this.transactions]
    };
  }

  public hydrate(state: Partial<SerializedWalletState> | null | undefined): void {
    if (!state) return;
    this.cashBalance = Math.max(0, Number(state.cashBalance) || 0);
    this.momoBalance = Math.max(0, Number(state.momoBalance) || 0);
    this.bankBalance = Math.max(0, Number(state.bankBalance) || 0);
    this.unsecuredIllegalCash = Math.max(0, Number(state.unsecuredIllegalCash) || 0);
    this.lifetimeEarnedGHS = Math.max(0, Number(state.lifetimeEarnedGHS) || 0);
    this.lifetimeSpentGHS = Math.max(0, Number(state.lifetimeSpentGHS) || 0);
    if (Array.isArray(state.transactions)) {
      this.transactions = state.transactions.slice(0, MAX_TRANSACTION_HISTORY);
    }
    this.notifyListeners(null);
  }

  public resetToZero(): void {
    this.cashBalance = 0;
    this.momoBalance = 0;
    this.bankBalance = 0;
    this.unsecuredIllegalCash = 0;
    this.lifetimeEarnedGHS = 0;
    this.lifetimeSpentGHS = 0;
    this.transactions = [];
    this.persistState();
    this.notifyListeners(null);
  }

  /**
   * Persists wallet state to localStorage and syncs with the existing Firebase
   * `/players/{userId}` and `/profiles/{userId}` documents when authenticated.
   */
  public persistState(): void {
    const serialized = this.serialize();
    try {
      localStorage.setItem(LOCAL_WALLET_STORAGE_KEY, JSON.stringify(serialized));
    } catch {
      // Ignore storage quota errors in restricted frames
    }
    void this.saveToFirebase();
  }

  public getAuthCloudSaveStatus(): {
    status: CloudSaveAuthStatus;
    email: string | null;
    uid: string | null;
  } {
    const user = auth.currentUser;
    if (!user) {
      return { status: 'local_guest', email: null, uid: null };
    }
    if (user.isAnonymous) {
      return { status: 'anonymous_guest', email: null, uid: user.uid };
    }
    if (user.email && !user.emailVerified) {
      return { status: 'unverified_email', email: user.email, uid: user.uid };
    }
    return { status: 'verified_account', email: user.email, uid: user.uid };
  }

  public async sendVerificationEmailToCurrentUser(): Promise<{
    ok: boolean;
    message: string;
  }> {
    const user = auth.currentUser;
    if (!user || user.isAnonymous || !user.email) {
      return {
        ok: false,
        message: 'Sign in with an email account first to send a verification link.'
      };
    }
    if (user.emailVerified) {
      return { ok: true, message: 'Email is already verified!' };
    }
    try {
      await sendEmailVerification(user);
      return {
        ok: true,
        message: `Verification link sent to ${user.email}. Check your inbox or spam folder.`
      };
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error
            ? err.message.replace('Firebase: ', '')
            : 'Could not send verification email right now.'
      };
    }
  }

  public async checkAndReloadEmailVerification(): Promise<{
    verified: boolean;
    message: string;
  }> {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      return { verified: false, message: 'No email account signed in.' };
    }
    try {
      await user.reload();
    } catch {
      /* ignore reload error if offline */
    }
    if (auth.currentUser?.emailVerified) {
      await this.saveToFirebase();
      return {
        verified: true,
        message: 'Email verified! Your wallet & progress are now synced to Cloud Save.'
      };
    }
    return {
      verified: false,
      message: `Still waiting for verification on ${user.email ?? 'your email'}. Click the link in your email first.`
    };
  }

  /**
   * Saves wallet state directly into the existing Firebase structure (`/players/{userId}`
   * and `/profiles/{userId}`) defined in `firebase-blueprint.json` and `firestore.rules`.
   * For unverified email/password accounts, saves are kept in local storage until the
   * user completes email verification.
   */
  /**
   * Saves wallet + needs + housing state to Firestore.
   *
   * @param needs Optional needs snapshot (hunger/energy/fun/social/hygiene/bladder)
   * @param homeState Optional housing snapshot (housingTier/unlockedTiers/owned/placedFurniture)
   */
  public async saveToFirebase(
    needs?: {
      hunger: number; energy: number; fun: number;
      social: number; hygiene: number; bladder: number;
    },
    homeState?: {
      housingTier: string;
      unlockedTiers: string[];
      owned: string[];
      placed: unknown[];
    }
  ): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    if (!user.isAnonymous && user.email && !user.emailVerified) {
      return false;
    }

    const playerPath = `players/${user.uid}`;
    const serialized = this.serialize();

    // Build the player payload — server-set timestamp (blocks Payload 10
    // forged-timestamp attack per the strict security rules).
    const playerPayload: Record<string, unknown> = {
      ownerId: user.uid,
      displayName: user.displayName || 'Kwame (Accra Resident)',
      state: { wallet: serialized },
      updatedAt: serverTimestamp()
    };
    if (needs) {
      playerPayload.hunger = Math.round(needs.hunger);
      playerPayload.energy = Math.round(needs.energy);
      playerPayload.fun = Math.round(needs.fun);
      playerPayload.social = Math.round(needs.social);
      playerPayload.hygiene = Math.round(needs.hygiene);
      playerPayload.bladder = Math.round(needs.bladder);
    }
    if (homeState) {
      playerPayload.housingTier = homeState.housingTier;
      playerPayload.unlockedTiers = homeState.unlockedTiers;
      playerPayload.owned = homeState.owned;
      playerPayload.placedFurniture = homeState.placed;
    }

    try {
      await setDoc(doc(db, 'players', user.uid), playerPayload, { merge: true });

      await setDoc(
        doc(db, 'profiles', user.uid),
        {
          ownerId: user.uid,
          displayName: user.displayName || 'Kwame (Accra Resident)',
          day: 1,
          career: 'Adabraka Hustler',
          money: Math.floor(this.cashBalance),
          location: 'Adabraka Neighborhood',
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (msg.includes('permission') || msg.includes('insufficient')) {
        try {
          handleFirestoreError(error, OperationType.WRITE, playerPath);
        } catch {
          // Structured error logged for permission diagnostics
        }
      }
      return false;
    }
  }

  /**
   * Loads wallet state from Firebase `/players/{userId}` if signed in,
   * falling back to local persistence or initializing at ₵0.00.
   */
  public async loadFromFirebase(): Promise<SerializedWalletState | null> {
    const user = auth.currentUser;
    if (!user) {
      return this.loadFromLocalCache();
    }

    const playerPath = `players/${user.uid}`;
    try {
      const snap = await getDoc(doc(db, 'players', user.uid));
      if (snap.exists()) {
        const data = snap.data() as {
          state?: { wallet?: Partial<SerializedWalletState> };
          phase3Economy?: { wallet?: Partial<SerializedWalletState> };
        };
        const cloudWallet = data?.state?.wallet ?? data?.phase3Economy?.wallet;
        if (cloudWallet) {
          this.hydrate(cloudWallet);
          return this.serialize();
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (msg.includes('permission') || msg.includes('insufficient')) {
        try {
          handleFirestoreError(error, OperationType.GET, playerPath);
        } catch {
          // Fall back to local cache if permission denied
        }
      }
    }

    return this.loadFromLocalCache();
  }

  private loadFromLocalCache(): SerializedWalletState | null {
    try {
      const raw = localStorage.getItem(LOCAL_WALLET_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SerializedWalletState>;
      if (parsed && typeof parsed.cashBalance === 'number') {
        this.hydrate(parsed);
        return this.serialize();
      }
    } catch {
      // Ignore malformed cache
    }
    return null;
  }

  private bindFirebaseAuthSync(): void {
    try {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          void this.loadFromFirebase();
        }
      });
    } catch {
      // Ignore auth listener errors in offline test environments
    }
  }

  private getChannelBalance(channel: PaymentChannel): number {
    if (channel === 'MOMO_WALLET') return this.momoBalance;
    if (channel === 'BANK') return this.bankBalance;
    return this.cashBalance;
  }

  private addChannelBalance(channel: PaymentChannel, delta: number): void {
    if (channel === 'MOMO_WALLET') {
      this.momoBalance = Math.max(0, Math.round((this.momoBalance + delta) * 100) / 100);
    } else if (channel === 'BANK') {
      this.bankBalance = Math.max(0, Math.round((this.bankBalance + delta) * 100) / 100);
    } else {
      this.cashBalance = Math.max(0, Math.round((this.cashBalance + delta) * 100) / 100);
    }
  }

  private recordTransaction(tx: TransactionRecord): void {
    this.transactions.unshift(tx);
    if (this.transactions.length > MAX_TRANSACTION_HISTORY) {
      this.transactions.length = MAX_TRANSACTION_HISTORY;
    }
  }

  private notifyListeners(tx: TransactionRecord | null): void {
    for (const listener of this.listeners) {
      listener(this.cashBalance, tx);
    }
  }
}
