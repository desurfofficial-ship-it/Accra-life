import {
  PaymentChannel,
  TransactionCategory,
  TransactionType
} from './EconomicTypes';

export interface TransactionRecord {
  readonly id: string;
  readonly timestamp: number;
  readonly amount: number;
  readonly type: TransactionType;
  readonly category: TransactionCategory;
  readonly channel: PaymentChannel;
  readonly description: string;
  readonly balanceAfter: number;
  readonly isIllegalOrigin?: boolean;
}

let txCounter = 0;

export function createTransactionRecord(params: {
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  channel?: PaymentChannel;
  description: string;
  balanceAfter: number;
  isIllegalOrigin?: boolean;
  timestamp?: number;
}): TransactionRecord {
  txCounter += 1;
  const now = params.timestamp ?? Date.now();
  return {
    id: `tx_${now}_${txCounter}`,
    timestamp: now,
    amount: Math.round(params.amount * 100) / 100,
    type: params.type,
    category: params.category,
    channel: params.channel ?? 'CASH',
    description: params.description,
    balanceAfter: Math.round(params.balanceAfter * 100) / 100,
    isIllegalOrigin: params.isIllegalOrigin ?? false
  };
}
