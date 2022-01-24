import { MessageHandlers, SolflareIframeMessage, SolflareIframeRequest } from '../types';
import { PublicKey, Transaction } from '@solana/web3.js';
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

  async signTransaction (transaction: Transaction): Promise<Transaction> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });

      const result = await this._sendMessage({
        method: 'signTransaction',
        params: {
          transaction: bs58.encode(serialized)
        }
      });

      const transactionBytes = bs58.decode(result as string);

      return Transaction.from(transactionBytes);
    } catch (e) {
      console.log(e);
      throw new Error('Failed to sign transaction');
    }
  }

  async signAllTransactions (transactions: Transaction[]): Promise<Transaction[]> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const txs = transactions.map((transaction) => transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      })).map((transaction) => bs58.encode(transaction))

      const result = await this._sendMessage({
        method: 'signAllTransactions',
        params: {
          transactions: txs
        }
      });

      return (result as string[])
        .map((transaction) => bs58.decode(transaction))
        .map((transaction) => Transaction.from(transaction));
    } catch (e) {
      console.log(e);
      throw new Error('Failed to sign transactions');
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
      console.log(e);
      throw new Error('Failed to sign message');
    }
  }

  handleMessage = (data: SolflareIframeMessage) => {
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
