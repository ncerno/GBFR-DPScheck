export type GbfrActConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface GbfrActConnectionState {
  status: GbfrActConnectionStatus;
  url: string;
  lastError?: string;
}

export const defaultGbfrActConnectionState: GbfrActConnectionState = {
  status: 'idle',
  url: 'ws://127.0.0.1:24399',
};
