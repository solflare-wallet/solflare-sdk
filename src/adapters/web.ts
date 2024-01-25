import { Cluster, SendOptions } from '@solana/web3.js';
import WalletAdapter from './base';
import { SolflareIframeMessage } from '../types';
import Wallet from './WalletProvider';
import bs58 from 'bs58';

export default class WebAdapter extends WalletAdapter {
  private _instance: Wallet | null = null;
  private _provider: string;
  private _network: Cluster;
  private _pollTimer: number;

  get publicKey () {
    return this._instance!.publicKey || null;
  }

  get connected () {
    return this._instance!.connected || false;
  }

  // @ts-ignore
  constructor (iframe: HTMLIFrameElement, network: Cluster, provider: string) {
    super();
    this._network = network;
    this._provider = provider;
  }

  async connect () {
    this._instance = new Wallet(this._provider, this._network);

    this._instance.on('connect', this._handleConnect);
    this._instance.on('disconnect', this._handleDisconnect);

    this._pollTimer = window.setInterval(() => {
      // @ts-ignore
      if (this._instance?._popup?.closed !== false) {
        this._handleDisconnect();
      }
    }, 200);

    await this._instance.connect();
  }

  async disconnect () {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    this._instance!.removeAllListeners('connect');
    this._instance!.removeAllListeners('disconnect');

    await this._instance!.disconnect();
  }

  async signTransaction (transaction: Uint8Array): Promise<Uint8Array> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const { transaction: signedTransaction } = (await this._sendRequest('signTransactionV2', {
      transaction: bs58.encode(transaction)
    })) as { transaction: string };

    return bs58.decode(signedTransaction);
  }

  async signAllTransactions (transactions: Uint8Array[]): Promise<Uint8Array[]> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const { transactions: signedTransactions } = (await this._sendRequest('signAllTransactionsV2', {
      transactions: transactions.map((transaction) => bs58.encode(transaction))
    })) as { transactions: string[] };

    return signedTransactions.map((transaction) => bs58.decode(transaction));
  }

  async signAndSendTransaction (transaction: Uint8Array, options?: SendOptions): Promise<string> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const response = (await this._sendRequest('signAndSendTransaction', {
      transaction: bs58.encode(transaction),
      options
    })) as { publicKey: string; signature: string };

    return response.signature;
  }

  async signMessage (data: Uint8Array, display: 'hex' | 'utf8' = 'hex'): Promise<Uint8Array> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const { signature } = await this._instance!.sign(data, display);
    return Uint8Array.from(signature);
  }

  // @ts-ignore
  handleMessage = (data: SolflareIframeMessage) => {
    // nothing to do here
  };

  private _sendRequest = async (method, params) => {
    if ((this._instance as any)?.sendRequest) {
      return await (this._instance as any).sendRequest(method, params);
    } else if (this._instance?._sendRequest) {
      return await this._instance._sendRequest(method, params);
    } else {
      throw new Error('Unsupported version of `@project-serum/sol-wallet-adapter`');
    }
  };

  private _handleConnect = () => {
    this.emit('connect');
  };

  private _handleDisconnect = () => {
    window.clearInterval(this._pollTimer);
    this.emit('disconnect');
  };
}
