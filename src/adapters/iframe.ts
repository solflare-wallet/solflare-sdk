import { MessageHandlers, SolflareIframeMessage, SolflareIframeRequest } from '../types';
import { PublicKey } from '@solana/web3.js';
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

  async signTransaction (message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const { signature } = await this._sendMessage({
        method: 'signTransaction',
        params: {
          message: bs58.encode(message)
        }
      }) as { publicKey: string, signature: string };

      return bs58.decode(signature);
    } catch (e) {
      console.log(e);
      throw new Error('Failed to sign transaction');
    }
  }

  async signAllTransactions (messages: Uint8Array[]): Promise<Uint8Array[]> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const { signatures } = await this._sendMessage({
        method: 'signAllTransactions',
        params: {
          messages: messages.map((message) => bs58.encode(message))
        }
      }) as { publicKey: string, signatures: string[] };

      return signatures.map((signature) => bs58.decode(signature));
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
