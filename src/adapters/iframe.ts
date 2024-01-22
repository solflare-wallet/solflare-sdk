import { MessageHandlers, SolflareIframeRequest, SolflareIframeResponseMessage } from '../types';
import { PublicKey, SendOptions } from '@solana/web3.js';
import WalletAdapter from './base';
import { v4 as uuidv4 } from 'uuid';
import bs58 from 'bs58';

export default class IframeAdapter extends WalletAdapter {
  private _iframe: HTMLIFrameElement;
  private _publicKey: PublicKey | null = null;
  private _messageHandlers: MessageHandlers = {};

  get publicKey () {
    return this._publicKey || null;
  }

  get connected () {
    return true;
  }

  constructor (iframe: HTMLIFrameElement, publicKey: any) {
    super();
    this._iframe = iframe;
    this._publicKey = new PublicKey(publicKey?.toString?.());
  }

  async connect () {
    // nothing to do here, the iframe already told us we're connected
  }

  async disconnect () {
    await this._sendMessage({
      method: 'disconnect'
    });
  }

  async signTransaction (transaction: Uint8Array): Promise<Uint8Array> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTransaction = await this._sendMessage({
        method: 'signTransaction',
        params: {
          transaction: bs58.encode(transaction)
        }
      }) as string;

      return bs58.decode(signedTransaction);
    } catch (e) {
      throw new Error(e?.toString?.() || 'Failed to sign transaction');
    }
  }

  async signAllTransactions (transactions: Uint8Array[]): Promise<Uint8Array[]> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTransactions = await this._sendMessage({
        method: 'signAllTransactions',
        params: {
          transactions: transactions.map((transaction) => bs58.encode(transaction))
        }
      }) as string[];

      return signedTransactions.map((transaction) => bs58.decode(transaction));
    } catch (e) {
      throw new Error(e?.toString?.() || 'Failed to sign transactions');
    }
  }

  async signAndSendTransaction (transaction: Uint8Array, options?: SendOptions): Promise<string> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await this._sendMessage({
        method: 'signAndSendTransaction',
        params: {
          transaction: bs58.encode(transaction),
          options
        }
      });

      return result as string;
    } catch (e) {
      throw new Error(e?.toString?.() || 'Failed to sign and send transaction');
    }
  }

  async signMessage (data: Uint8Array, display: 'hex' | 'utf8' = 'hex'): Promise<Uint8Array> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await this._sendMessage({
        method: 'signMessage',
        params: {
          data,
          display
        }
      });

      return Uint8Array.from(bs58.decode(result as string));
    } catch (e) {
      throw new Error(e?.toString?.() || 'Failed to sign message');
    }
  }

  handleMessage = (data: SolflareIframeResponseMessage) => {
    if (this._messageHandlers[data.id]) {
      const { resolve, reject } = this._messageHandlers[data.id];

      delete this._messageHandlers[data.id];

      if (data.error) {
        reject(data.error);
      } else {
        resolve(data.result);
      }
    }
  };

  private _sendMessage = (data: SolflareIframeRequest) => {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    return new Promise((resolve, reject) => {
      const messageId = uuidv4();

      this._messageHandlers[messageId] = { resolve, reject };

      this._iframe?.contentWindow?.postMessage({
        channel: 'solflareWalletAdapterToIframe',
        data: { id: messageId, ...data }
      }, '*');
    });
  };
}
