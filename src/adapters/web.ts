import { Cluster } from '@solana/web3.js';
import WalletAdapter from './base';
import { SolflareIframeMessage } from '../types';
import Wallet from '@project-serum/sol-wallet-adapter';
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

  async signTransaction (message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const response = (await this._instance!.sendRequest('signTransaction', {
      message: bs58.encode(message)
    })) as { publicKey: string; signature: string };

    return bs58.decode(response.signature);
  }

  async signAllTransactions (messages: Uint8Array[]): Promise<Uint8Array[]> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const response = (await this._instance!.sendRequest('signAllTransactions', {
      messages: messages.map((message) => bs58.encode(message))
    })) as { publicKey: string; signatures: string[] };

    return response.signatures.map((signature) => bs58.decode(signature));
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

  private _handleConnect = () => {
    this.emit('connect');
  };

  private _handleDisconnect = () => {
    window.clearInterval(this._pollTimer);
    this.emit('disconnect');
  };
}
