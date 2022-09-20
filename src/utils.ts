import { TransactionOrVersionedTransaction } from './types';
import { VersionedTransaction } from '@solana/web3.js';

export function isLegacyTransactionInstance (transaction: TransactionOrVersionedTransaction) {
  return (transaction as VersionedTransaction).version === undefined;
}
