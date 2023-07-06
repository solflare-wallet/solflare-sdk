import EventEmitter from 'eventemitter3';
import { PublicKey, SendOptions } from '@solana/web3.js';
import { SolflareIframeMessage } from '../types';

export default abstract class WalletAdapter extends EventEmitter {
  abstract get publicKey (): PublicKey | null;
  abstract get connected (): boolean;

  abstract connect (): Promise<void>;
  abstract disconnect (): Promise<void>;
  abstract signTransaction (message: Uint8Array): Promise<Uint8Array>;
  abstract signAllTransactions (messages: Uint8Array[]): Promise<Uint8Array[]>;
  abstract signAndSendTransaction (transaction: Uint8Array, options?: SendOptions): Promise<string>;
  abstract signMessage (data: Uint8Array, display: 'hex' | 'utf8'): Promise<Uint8Array>;
  abstract handleMessage (data: SolflareIframeMessage): void;
}
