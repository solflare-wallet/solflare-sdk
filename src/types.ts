import { Cluster } from '@solana/web3.js';

export interface SolflareConfig {
  network?: Cluster,
  provider?: string
}

export interface SolflareIframeEvent {
  type: string;
  data: any;
}

export interface SolflareIframeRequest {
  method: string;
  params?: unknown;
}

export interface SolflareIframeResponseMessage {
  type: 'response';
  id: string;
  result?: unknown;
  error?: unknown;
}

export interface SolflareIframeEventMessage {
  type: 'event';
  id: string;
  event: SolflareIframeEvent;
}

export interface SolflareIframeResizeCoordinates {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  width: number | string;
  height: number | string;
}

export interface SolflareIframeResizeCoordinatesMessage {
  resizeMode: 'coordinates';
  params: SolflareIframeResizeCoordinates;
}

export interface SolflareIframeResizeModes {
  mode: 'fullscreen' | 'hide';
}

export interface SolflareIframeResizeMode {
  resizeMode: 'full';
  params: SolflareIframeResizeModes
}

export type SolflareIframeResizeMessage = {
  type: 'resize';
  id: string;
} & (SolflareIframeResizeCoordinatesMessage | SolflareIframeResizeMode);

export type SolflareIframeMessage = SolflareIframeResponseMessage | SolflareIframeEventMessage | SolflareIframeResizeMessage;

export type PromiseCallback = (...args: unknown[]) => unknown;

export type MessageHandlers = {
  [id: string]: {
    resolve: PromiseCallback,
    reject: PromiseCallback
  }
}
