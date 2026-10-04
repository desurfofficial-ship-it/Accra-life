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

export type WalletChangeListener = (
  balance: number,
  transaction: TransactionRecord | null
) => void;

const MAX_TRANSACTION_HISTORY = 40;

export class Wallet {
  private cashBalance = 0;
  private momoBalance = 0;
  private bankBalance = 0;
  private unsecuredIllegalCash = 0;
  private lifetimeEarnedGHS = 0;
  private lifetimeSpentGHS = 0;
  private transactions: TransactionRecord[] = [];
  private listeners: Set<WalletChangeListener> = new Set();

  constructor() {
    // New players strictly start at ₵0.00 across all channels
    this.cashBalance = 0;
    this.momoBalance = 0;
    this.bankBalance = 0;
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
    if (amount <= 0) return true;
    const balance = this.getChannelBalance(channel);
    return balance + 0.0001 >= amount;
  }

  public receiveMoney(params: {
    amount: number;
    category: TransactionCategory;
    description: string;
    channel?: PaymentChannel;
    isIllegalOrigin?: boolean;
  }): TransactionRecord | null {
    const cleanAmount = Math.round(params.amount * 100) / 100;
    if (cleanAmount <= 0) return null;

    const channel = params.channel ?? 'CASH';
    this.addChannelBalance(channel, cleanAmount);
    this.lifetimeEarnedGHS = Math.round((this.lifetimeEarnedGHS + cleanAmount) * 100) / 100;

    if (params.isIllegalOrigin) {
      this.unsecuredIllegalCash = Math.round((this.unsecuredIllegalCash + cleanAmount) * 100) / 100;
    }

    const tx = createTransactionRecord({
      amount: cleanAmount,
      type: 'INCOME',
      category: params.category,
      channel,
      description: params.description,
      balanceAfter: this.cashBalance,
      isIllegalOrigin: params.isIllegalOrigin
    });

    this.recordTransaction(tx);
    this.notifyListeners(tx);
    return tx;
  }

  public spendMoney(params: {
    amount: number;
    category: TransactionCategory;
    description: string;
    channel?: PaymentChannel;
  }): TransactionRecord | null {
    const cleanAmount = Math.round(params.amount * 100) / 100;
    if (cleanAmount <= 0) return null;

    const channel = params.channel ?? 'CASH';
    if (!this.canAfford(cleanAmount, channel)) {
      return null;
    }

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
      description: params.description,
      balanceAfter: this.cashBalance
    });

    this.recordTransaction(tx);
    this.notifyListeners(tx);
    return tx;
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

    const finePaidGHS = Math.min(this.cashBalance, Math.max(0, Math.round(maxFineGHS * 100) / 100));
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
            ? `Police confiscation of contraband proceeds`
            : `Police misdemeanor fine`,
      balanceAfter: this.cashBalance
    });

    this.recordTransaction(tx);
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
    this.notifyListeners(null);
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
