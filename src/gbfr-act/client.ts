import type { GbfrActRawEvent } from './events';

export interface GbfrActClientOptions {
  url: string;
  onEvent: (event: GbfrActRawEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export class GbfrActClient {
  private socket: WebSocket | null = null;

  constructor(private readonly options: GbfrActClientOptions) {}

  connect() {
    this.disconnect();

    this.socket = new WebSocket(this.options.url);
    this.socket.addEventListener('open', () => this.options.onOpen?.());
    this.socket.addEventListener('close', () => this.options.onClose?.());
    this.socket.addEventListener('error', (event) => this.options.onError?.(event));
    this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
  }

  disconnect() {
    if (!this.socket) {
      return;
    }

    this.socket.close();
    this.socket = null;
  }

  private handleMessage(data: unknown) {
    if (typeof data !== 'string') {
      return;
    }

    try {
      const parsed = JSON.parse(data) as GbfrActRawEvent;
      this.options.onEvent(parsed);
    } catch (error) {
      console.warn('无法解析 GBFR-ACT 事件', error);
    }
  }
}
