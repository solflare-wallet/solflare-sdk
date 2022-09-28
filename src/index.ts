import { Cluster, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
  PromiseCallback,
  SolflareConfig,
  SolflareIframeEvent,
  SolflareIframeMessage,
  SolflareIframeResizeMessage,
  TransactionOrVersionedTransaction
} from './types';
import EventEmitter from 'eventemitter3';
import WalletAdapter from './adapters/base';
import WebAdapter from './adapters/web';
import IframeAdapter from './adapters/iframe';
import { isLegacyTransactionInstance } from './utils';

export default class Solflare extends EventEmitter {
  private _network: Cluster = 'mainnet-beta';
  private _provider: string | null = null;
  private _adapterInstance: WalletAdapter | null = null;
  private _element: HTMLElement | null = null;
  private _iframe: HTMLIFrameElement | null = null;
  private _connectHandler: { resolve: PromiseCallback, reject: PromiseCallback } | null = null;

  private _flutterHandlerInterval: any = null;

  private static IFRAME_URL = 'https://connect.solflare.com/';
  // private static IFRAME_URL = 'http://localhost:3090/';
  // private static IFRAME_URL = 'https://feature-react-refactor.d3jmxkbfuqcbli.amplifyapp.com/';

  constructor (config?: SolflareConfig) {
    super();

    if (config?.network) {
      this._network = config?.network;
    }

    if (config?.provider) {
      this._provider = config?.provider;
    }
  }

  get publicKey () {
    return this._adapterInstance?.publicKey || null;
  }

  get isConnected () {
    return !!this._adapterInstance?.connected;
  }

  get connected () {
    return this.isConnected;
  }

  get autoApprove () {
    return false;
  }

  async connect () {
    if (this.connected) {
      return;
    }

    this._injectElement();

    await new Promise((resolve, reject) => {
      this._connectHandler = { resolve, reject };
    });
  }

  async disconnect () {
    if (!this._adapterInstance) {
      return;
    }

    await this._adapterInstance.disconnect();

    this._disconnected();

    this.emit('disconnect');
  }

  async signTransaction (transaction: TransactionOrVersionedTransaction): Promise<TransactionOrVersionedTransaction> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const serializedMessage: Uint8Array = isLegacyTransactionInstance(transaction) ? (transaction as Transaction).serializeMessage() : (transaction as VersionedTransaction).message.serialize();

    const signature = await this._adapterInstance!.signTransaction(serializedMessage);

    if (isLegacyTransactionInstance(transaction)) {
      (transaction as Transaction).addSignature(this.publicKey!, Buffer.from(signature));
    } else {
      const signerPubkeys = (transaction as VersionedTransaction).message.staticAccountKeys.slice(
        0,
        (transaction as VersionedTransaction).message.header.numRequiredSignatures,
      );
      const signerIndex = signerPubkeys.findIndex((pubkey) => pubkey.equals(this.publicKey!));
      if (signerIndex >= 0) {
        transaction.signatures[signerIndex] = signature;
      }
    }

    return transaction;
  }

  async signAllTransactions (transactions: TransactionOrVersionedTransaction[]): Promise<TransactionOrVersionedTransaction[]> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const serializedMessages = transactions.map((transaction) => {
      return isLegacyTransactionInstance(transaction) ? (transaction as Transaction).serializeMessage() : (transaction as VersionedTransaction).message.serialize();
    });

    const signatures = await this._adapterInstance!.signAllTransactions(serializedMessages);

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];

      if (isLegacyTransactionInstance(transaction)) {
        (transaction as Transaction).addSignature(this.publicKey!, Buffer.from(signatures[i]));
      } else {
        const signerPubkeys = (transaction as VersionedTransaction).message.staticAccountKeys.slice(
          0,
          (transaction as VersionedTransaction).message.header.numRequiredSignatures,
        );
        const signerIndex = signerPubkeys.findIndex((pubkey) => pubkey.equals(this.publicKey!));
        if (signerIndex >= 0) {
          transaction.signatures[signerIndex] = signatures[i];
        }
      }
    }

    return transactions;
  }

  async signMessage (data: Uint8Array, display: 'hex' | 'utf8' = 'utf8'): Promise<Uint8Array> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    return await this._adapterInstance!.signMessage(data, display);
  }

  async sign (data: Uint8Array, display: 'hex' | 'utf8' = 'utf8'): Promise<Uint8Array> {
    return await this.signMessage(data, display);
  }

  async detectWallet (timeout = 10): Promise<boolean> {
    if ((window as any).SolflareApp || (window as any).solflare?.isSolflare) {
      return true;
    }

    return new Promise((resolve) => {
      let pollInterval, pollTimeout;

      pollInterval = setInterval(() => {
        if ((window as any).SolflareApp || (window as any).solflare?.isSolflare) {
          clearInterval(pollInterval);
          clearTimeout(pollTimeout);
          resolve(true);
        }
      }, 500);

      pollTimeout = setTimeout(() => {
        clearInterval(pollInterval);
        resolve(false);
      }, timeout * 1000);
    });
  }

  private _handleEvent = (event: SolflareIframeEvent) => {
    switch (event.type) {
      case 'connect_native_web': {
        this._collapseIframe();

        this._adapterInstance = new WebAdapter(this._iframe!, this._network, event.data?.provider || this._provider || 'https://solflare.com/provider');

        this._adapterInstance.on('connect', this._webConnected);
        this._adapterInstance.on('disconnect', this._webDisconnected);

        this._adapterInstance.connect();

        this._setPreferredAdapter('native_web');

        return;
      }
      case 'connect': {
        this._collapseIframe();

        this._adapterInstance = new IframeAdapter(this._iframe!, event.data?.publicKey || '');
        this._adapterInstance.connect();

        this._setPreferredAdapter(event.data?.adapter);

        if (this._connectHandler) {
          this._connectHandler.resolve();
          this._connectHandler = null;
        }

        this.emit('connect', this.publicKey);

        return;
      }
      case 'disconnect': {
        if (this._connectHandler) {
          this._connectHandler.reject();
          this._connectHandler = null;
        }

        this._disconnected();

        this.emit('disconnect');

        return;
      }
      // legacy event, use resize message type instead
      case 'collapse': {
        this._collapseIframe();
        return;
      }
      default: {
        return;
      }
    }
  }

  private _handleResize = (data: SolflareIframeResizeMessage) => {
    if (data.resizeMode === 'full') {
      if (data.params.mode === 'fullscreen') {
        this._expandIframe();
      } else if (data.params.mode === 'hide') {
        this._collapseIframe();
      }
    } else if (data.resizeMode === 'coordinates') {
      if (this._iframe) {
        this._iframe.style.top = isFinite(data.params.top as number) ? `${data.params.top}px` : '';
        this._iframe.style.bottom = isFinite(data.params.bottom as number) ? `${data.params.bottom}px` : '';
        this._iframe.style.left = isFinite(data.params.left as number) ? `${data.params.left}px` : '';
        this._iframe.style.right = isFinite(data.params.right as number) ? `${data.params.right}px` : '';
        this._iframe.style.width = isFinite(data.params.width as number) ? `${data.params.width}px` : (data.params.width as string);
        this._iframe.style.height = isFinite(data.params.height as number) ? `${data.params.height}px` : (data.params.height as string);
      }
    }
  }

  private _handleMessage = (event: MessageEvent) => {
    if (event.data?.channel !== 'solflareIframeToWalletAdapter') {
      return;
    }

    const data: SolflareIframeMessage = event.data.data || {};

    if (data.type === 'event') {
      this._handleEvent(data.event);
    } else if (data.type === 'resize') {
      this._handleResize(data);
    } else if (data.type === 'response') {
      if (this._adapterInstance) {
        this._adapterInstance.handleMessage(data);
      }
    }
  }

  private _removeElement = () => {
    if (this._flutterHandlerInterval !== null) {
      clearInterval(this._flutterHandlerInterval);
      this._flutterHandlerInterval = null;
    }


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

    let iframeUrl = `${Solflare.IFRAME_URL}?cluster=${encodeURIComponent(this._network)}&origin=${encodeURIComponent(window.location.origin)}&version=1`;
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

    // @ts-ignore
    window.fromFlutter = this._handleMobileMessage;
    this._flutterHandlerInterval = setInterval(() => {
      // @ts-ignore
      window.fromFlutter = this._handleMobileMessage;
    }, 100);

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

  private _expandIframe = () => {
    if (this._iframe) {
      this._iframe.style.top = '0px';
      this._iframe.style.bottom = '0px';
      this._iframe.style.left = '0px';
      this._iframe.style.right = '0px';
      this._iframe.style.width = '100%';
      this._iframe.style.height = '100%';
    }
  };

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

  private _webConnected = () => {
    if (this._connectHandler) {
      this._connectHandler.resolve();
      this._connectHandler = null;
    }

    this.emit('connect', this.publicKey);
  };

  private _webDisconnected = () => {
    if (this._connectHandler) {
      this._connectHandler.reject();
      this._connectHandler = null;
    }

    this._disconnected();

    this.emit('disconnect');
  };

  private _disconnected = () => {
    window.removeEventListener('message', this._handleMessage, false);
    this._removeElement();

    this._clearPreferredAdapter();

    this._adapterInstance = null;
  }

  private _handleMobileMessage = (data) => {
    this._iframe?.contentWindow?.postMessage({
      channel: 'solflareMobileToIframe',
      data
    }, '*');
  };
}
