import { Cluster, PublicKey, Transaction } from '@solana/web3.js';
import { MessageHandlers, SolflareConfig, SolflareIframeEvent, SolflareIframeMessage, SolflareIframeRequest } from './types';
import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import bs58 from 'bs58';

export default class Solflare extends EventEmitter {
  private _network: Cluster = 'mainnet-beta';
  private _isConnected: boolean = false;
  private _publicKey: PublicKey | null = null;
  private _element: HTMLElement | null = null;
  private _iframe: HTMLIFrameElement | null = null;
  private _messageHandlers: MessageHandlers = {};

  private static IFRAME_URL = 'https://connect.solflare.com/';
  // private static IFRAME_URL = 'http://localhost:3090/';

  constructor (config: SolflareConfig) {
    super();
    this._network = config?.network || 'mainnet-beta';
  }

  get publicKey () {
    return this._publicKey || null;
  }

  get connected () {
    return this._isConnected;
  }

  async connect () {
    if (this.connected) {
      return;
    }

    this._injectElement();

    await new Promise((resolve, reject) => {
      this._messageHandlers['connect'] = { resolve, reject };
    });
  }

  async disconnect () {
    await this._sendMessage({
      method: 'disconnect'
    });

    this._disconnected();

    this.emit('disconnect');
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

  async signMessage (data: Buffer | Uint8Array, display: 'hex' | 'utf8' = 'hex'): Promise<Uint8Array> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await this._sendMessage({
        method: 'signMessage',
        params: {
          data: bs58.encode(data),
          display
        }
      });

      return bs58.decode(result as string);
    } catch (e) {
      console.log(e);
      throw new Error('Failed to sign message');
    }
  }

  private _handleEvent = (event: SolflareIframeEvent) => {
    switch (event.type) {
      case 'connect': {
        this._collapseIframe();

        this._isConnected = true;
        this._publicKey = new PublicKey(event.data?.publicKey);

        this._setPreferredAdapter(event.data?.adapter);

        if (this._messageHandlers['connect']) {
          this._messageHandlers['connect'].resolve();
          delete this._messageHandlers['connect'];
        }

        this.emit('connect', this._publicKey);

        return;
      }
      case 'disconnect': {
        this._disconnected();

        if (this._messageHandlers['connect']) {
          this._messageHandlers['connect'].reject();
          delete this._messageHandlers['connect'];
        }

        this.emit('disconnect');

        return;
      }
      case 'collapse': {
        this._collapseIframe();
        return;
      }
      default: {
        return;
      }
    }
  }

  private _handleMessage = (event: MessageEvent) => {
    if (event.data?.channel !== 'solflareIframeToWalletAdapter') {
      return;
    }

    const data: SolflareIframeMessage = event.data.data || {};

    if (data.type === 'event') {
      this._handleEvent(data.event!);
    } else if (this._messageHandlers[data.id]) {
      const { resolve, reject } = this._messageHandlers[data.id];

      delete this._messageHandlers[data.id];

      if (data.error) {
        reject(data.error);
      } else {
        resolve(data.result);
      }
    }
  }

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
  }

  private _removeElement = () => {
    if (this._element) {
      this._element.remove();
      this._element = null;
    }
  }

  private _removeDanglingElements = () => {
    const elements = document.getElementsByClassName('solflare-wallet-adapter-iframe');
    for (const element of elements) {
      if (element.parentElement) {
        element.remove();
      }
    }
  }

  private _injectElement = () => {
    this._removeElement();
    this._removeDanglingElements();

    let iframeUrl = `${Solflare.IFRAME_URL}?cluster=${encodeURIComponent(this._network)}&origin=${encodeURIComponent(window.location.origin)}`;
    const preferredAdapter = this._getPreferredAdapter();
    if (preferredAdapter) {
      iframeUrl += `&adapter=${encodeURIComponent(preferredAdapter)}`;
    }

    this._element = document.createElement('div');
    this._element.className = 'solflare-wallet-adapter-iframe';
    this._element.innerHTML = `
      <iframe src='${iframeUrl}' style='position: fixed; top: 0; bottom: 0; left: 0; right: 0; width: 100%; height: 100%; border: none; border-radius: 0; z-index: 99999; color-scheme: auto;' allowtransparency='true'></iframe>
    `;
    document.body.appendChild(this._element);
    this._iframe = this._element.querySelector('iframe');

    window.addEventListener('message', this._handleMessage, false);
  }

  private _collapseIframe = () => {
    if (this._iframe) {
      this._iframe.style.top = '';
      this._iframe.style.right = '';
      this._iframe.style.height = '2px';
      this._iframe.style.width = '2px';
    }
  }

  private _getPreferredAdapter = () => {
    if (localStorage) {
      return localStorage.getItem('solflarePreferredWalletAdapter') || null;
    }
    return null;
  };

  private _setPreferredAdapter = (adapter: string) => {
    if (localStorage && adapter) {
      localStorage.setItem('solflarePreferredWalletAdapter', adapter);
    }
  };

  private _clearPreferredAdapter = () => {
    if (localStorage) {
      localStorage.removeItem('solflarePreferredWalletAdapter');
    }
  };

  private _disconnected = () => {
    window.removeEventListener('message', this._handleMessage, false);
    this._removeElement();

    this._clearPreferredAdapter();

    this._isConnected = false;
    this._publicKey = null;
  }
}
