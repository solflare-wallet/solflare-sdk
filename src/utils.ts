import { Transaction as LegacyTransaction, VersionedTransaction } from '@solana/web3.js';
import { Transaction as SolanaKitTransaction, getTransactionEncoder, getTransactionDecoder } from '@solana/kit';
import type { Transaction } from './types';


type TransactionOrigin = 'legacy' | 'versioned' | 'kit';

export const isLegacyTransaction = (transaction: Transaction): transaction is LegacyTransaction =>
  (transaction as VersionedTransaction).version === undefined;

export const isFromSolanaKitTransaction = (
  transaction: Transaction
): transaction is SolanaKitTransaction =>
  'messageBytes' in transaction && 'signatures' in transaction;

export const getTransactionOrigin = (transaction: Transaction): TransactionOrigin => {
  if (isFromSolanaKitTransaction(transaction)) {
    return 'kit';
  }

  if (isLegacyTransaction(transaction)) {
    return 'legacy';
  }

  return 'versioned';
};

const encodeTransaction = (origin: TransactionOrigin, transaction: Transaction): Uint8Array => {
  switch (origin) {
    case 'legacy':
      return (transaction as LegacyTransaction).serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
    case 'kit':
      return getTransactionEncoder().encode(transaction as SolanaKitTransaction) as unknown as Uint8Array;
    case 'versioned':
      return (transaction as VersionedTransaction).serialize();
  }
};

const decodeTransaction = (origin: TransactionOrigin, bytes: Uint8Array): Transaction => {
  switch (origin) {
    case 'legacy':
      return LegacyTransaction.from(bytes);
    case 'kit':
      return getTransactionDecoder().decode(bytes);
    case 'versioned':
      return VersionedTransaction.deserialize(bytes);
  }
};

export function transactionPipeline(
  transaction: Transaction,
  callback: (bytes: Uint8Array) => Promise<Uint8Array>,
): Promise<Transaction>;
export function transactionPipeline(
  transactions: Transaction[],
  callback: (bytesArray: Uint8Array[]) => Promise<Uint8Array[]>,
): Promise<Transaction[]>;
export function transactionPipeline<T>(
  transaction: Transaction,
  callback: (bytes: Uint8Array) => T,
  opts: { decode: false },
): T;

export function transactionPipeline(
  input: Transaction | Transaction[],
  callback: Function,
  opts?: { decode?: boolean },
) {
  const shouldDecode = opts?.decode !== false;

  if (Array.isArray(input)) {
    const origin = getTransactionOrigin(input[0]);
    const transactionsBytes = input.map((transaction) => encodeTransaction(origin, transaction));
    const result = callback(transactionsBytes);

    if (!shouldDecode) {
      return result;
    }

    const decodeAll = (signedTransactionsBytes: Uint8Array[]) =>
      signedTransactionsBytes.map((signedTransactionBytes: Uint8Array) => decodeTransaction(origin, signedTransactionBytes));

    return result instanceof Promise ? result.then(decodeAll) : decodeAll(result);
  }

  const origin = getTransactionOrigin(input);
  const transactionBytes = encodeTransaction(origin, input);
  const result = callback(transactionBytes);

  if (!shouldDecode) {
    return result;
  }

  const decode = (signedTransactionBytes: Uint8Array) => decodeTransaction(origin, signedTransactionBytes);

  return result instanceof Promise ? result.then(decode) : decode(result);
}
