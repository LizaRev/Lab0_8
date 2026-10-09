import {
  parseMessage,
  type Message,
} from "../../shared/protocol/messages.js";

const DEFAULT_RECONNECT_DELAYS: number[] = [500, 1000, 2000, 4000, 8000, 15000];

type ConnectionOptions = {
  url?: string;
  reconnectDelays?: number[];
  onmessage?: ((message: Message) => void) | null;
  onopen?: (() => void) | null;
  onclose?: ((event: CloseEvent) => void) | null;
  onerror?: ((event: Event | Error) => void) | null;
};

type DecodeResponse =
  | {
      ok: true;
      message: Message;
    }
  | {
      ok: false;
      error: string;
    };

export class Connection {
  url: string;
  reconnectDelays: number[];

  onmessage: ((message: Message) => void) | null;
  onopen: (() => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event | Error) => void) | null;

  socket: WebSocket | null;
  queue: string[];
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  closedManually: boolean;

  decodeWorker: Worker | null;

  constructor({
    url = "/ws",
    reconnectDelays = DEFAULT_RECONNECT_DELAYS,
    onmessage = null,
    onopen = null,
    onclose = null,
    onerror = null,
  }: ConnectionOptions = {}) {
    this.url = url;
    this.reconnectDelays = reconnectDelays;
    this.onmessage = onmessage;
    this.onopen = onopen;
    this.onclose = onclose;
    this.onerror = onerror;
    this.socket = null;
    this.queue = [];
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.closedManually = false;
    this.decodeWorker = null;
  }

  connect(): void {
    this.closedManually = false;

    if (
      this.socket &&
      (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      )
    ) {
      return;
    }

    this.clearReconnectTimer();

    const socket = new WebSocket(this.url);
    this.socket = socket;

    const worker = new Worker(
      new URL("./decode.worker.ts", import.meta.url),
      { type: "module" }
    );

    this.decodeWorker = worker;

    worker.addEventListener("message", (event: MessageEvent<DecodeResponse>) => {
      if (socket !== this.socket || worker !== this.decodeWorker) {
        return;
      }

      const response = event.data;

      performance.mark("m3-decode-end");
      performance.measure("m3-decode", "m3-decode-start", "m3-decode-end");

      if (!response.ok) {
        this.onerror?.(
          new Error(`Failed to decode WebSocket message: ${response.error}`)
        );

        return;
      }

      this.onmessage?.(response.message);
    });

    worker.addEventListener("error", (event: ErrorEvent) => {
      if (socket !== this.socket || worker !== this.decodeWorker) {
        return;
      }

      this.onerror?.(new Error(`Decode worker error: ${event.message}`));
    });

    socket.addEventListener("open", () => {
      if (socket !== this.socket) {
        return;
      }

      this.reconnectAttempt = 0;
      this.flushQueue();
      this.onopen?.();
    });

    socket.addEventListener("message", async (event: MessageEvent) => {
      if (socket !== this.socket) {
        return;
      }

      performance.mark("m3-decode-start");

      if (event.data instanceof ArrayBuffer) {
        worker.postMessage({ buffer: event.data }, [event.data]);
        return;
      }

      if (event.data && typeof event.data.arrayBuffer === "function") {
        try {
          const buffer = await event.data.arrayBuffer();

          if (socket !== this.socket || worker !== this.decodeWorker) {
            return;
          }

          worker.postMessage({ buffer }, [buffer]);
        } catch (error: unknown) {
          performance.mark("m3-decode-end");
          performance.measure("m3-decode", "m3-decode-start", "m3-decode-end");

          const message = error instanceof Error ? error.message : String(error);

          this.onerror?.(
            new Error(`Failed to read WebSocket binary message: ${message}`, {
              cause: error,
            })
          );
        }

        return;
      }

      if (typeof event.data === "string") {
        try {
          const result = parseMessage(JSON.parse(event.data));

          if (!result.ok) {
            throw new Error(result.error);
          }

          performance.mark("m3-decode-end");
          performance.measure("m3-decode", "m3-decode-start", "m3-decode-end");

          this.onmessage?.(result.message);
        } catch (error: unknown) {
          performance.mark("m3-decode-end");
          performance.measure("m3-decode", "m3-decode-start", "m3-decode-end");

          const message = error instanceof Error ? error.message : String(error);

          this.onerror?.(
            new Error(`Failed to decode WebSocket message: ${message}`, {
              cause: error,
            })
          );
        }

        return;
      }

      performance.mark("m3-decode-end");
      performance.measure("m3-decode", "m3-decode-start", "m3-decode-end");

      this.onerror?.(
        new Error(`Unsupported WebSocket data type: ${typeof event.data}`)
      );
    });

    socket.addEventListener("error", (event: Event) => {
      if (socket !== this.socket) {
        return;
      }

      this.onerror?.(event);
    });

    socket.addEventListener("close", (event: CloseEvent) => {
      if (socket !== this.socket) {
        return;
      }

      this.socket = null;

      if (worker === this.decodeWorker) {
        worker.terminate();
        this.decodeWorker = null;
      }

      this.onclose?.(event);

      if (!this.closedManually) {
        this.scheduleReconnect();
      }
    });
  }

  send(message: unknown): boolean {
    const encoded = JSON.stringify(message);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(encoded);
      return true;
    }

    this.queue.push(encoded);
    this.connect();

    return false;
  }

  close(): void {
    this.closedManually = true;
    this.clearReconnectTimer();

    if (this.decodeWorker) {
      this.decodeWorker.terminate();
      this.decodeWorker = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  scheduleReconnect(): void {
    if (this.closedManually || this.reconnectTimer) {
      return;
    }

    const index = Math.min(
      this.reconnectAttempt,
      this.reconnectDelays.length - 1
    );

    const delay = this.reconnectDelays[index];
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  flushQueue(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.queue.length > 0) {
      const message = this.queue.shift();

      if (message !== undefined) {
        this.socket.send(message);
      }
    }
  }

  clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

