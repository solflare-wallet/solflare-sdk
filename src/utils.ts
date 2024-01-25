import { TransactionOrVersionedTransaction } from './types';
import { Transaction, VersionedTransaction } from '@solana/web3.js';

export function isLegacyTransactionInstance (transaction: TransactionOrVersionedTransaction): transaction is Transaction {
  return (transaction as VersionedTransaction).version === undefined;
}
