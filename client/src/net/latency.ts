type LatencyOptions = {
  latency?: number;
  jitter?: number;
  packetLoss?: number;
};

export class LatencyInjector {
  latency: number;
  jitter: number;
  packetLoss: number;

  constructor(options: LatencyOptions = {}) {
    this.latency = options.latency ?? 0;
    this.jitter = options.jitter ?? 0;
    this.packetLoss = options.packetLoss ?? 0;
  }

  setLatency(ms: number): void {
    this.latency = Math.max(0, ms);
  }

  setJitter(ms: number): void {
    this.jitter = Math.max(0, ms);
  }

  setPacketLoss(percent: number): void {
    this.packetLoss = Math.max(0, Math.min(100, percent));
  }

  shouldDrop(): boolean {
    return Math.random() * 100 < this.packetLoss;
  }

  getDelay(): number {
    if (this.jitter === 0) {
      return this.latency;
    }

    const variation = (Math.random() * 2 - 1) * this.jitter;

    return Math.max(0, this.latency + variation);
  }

  send(callback: () => void): boolean {
    if (this.shouldDrop()) {
      return false;
    }

    const delay = this.getDelay();

    setTimeout(callback, delay);

    return true;
  }
}

