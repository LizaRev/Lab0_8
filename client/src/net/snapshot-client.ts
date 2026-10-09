import type { SnapshotMessageWithWorld } from "../../../shared/protocol/binary.js";
import type { NetGraph } from "./netgraph.js";

type BufferedSnapshot = {
  snapshot: SnapshotMessageWithWorld;
  receivedAt: number;
};

type SnapshotListener = (snapshot: SnapshotMessageWithWorld) => void;

export type InterpolationPair = {
  previous: SnapshotMessageWithWorld;
  next: SnapshotMessageWithWorld;
  alpha: number;
};

export class SnapshotClient {
  netgraph: NetGraph | null;
  latestSnapshot: SnapshotMessageWithWorld | null;
  snapshots: BufferedSnapshot[];
  maxSnapshots: number;
  listeners: Set<SnapshotListener>;

  constructor(netgraph: NetGraph | null = null) {
    this.netgraph = netgraph;
    this.latestSnapshot = null;
    this.snapshots = [];
    this.maxSnapshots = 30;
    this.listeners = new Set();
  }

  receive(snapshot: SnapshotMessageWithWorld): void {
    if (!snapshot || snapshot.type !== "snapshot") {
      return;
    }

    const receivedAt = performance.now();
    const bufferedSnapshot: BufferedSnapshot = { snapshot, receivedAt };

    this.snapshots.push(bufferedSnapshot);

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.latestSnapshot = snapshot;
    this.netgraph?.recordSnapshot(snapshot.lastProcessedSeq);

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  onSnapshot(callback: SnapshotListener): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  getSnapshot(): SnapshotMessageWithWorld | null {
    return this.latestSnapshot;
  }

  getSnapshots(): BufferedSnapshot[] {
    return this.snapshots;
  }

  getInterpolationPair(renderTime: number): InterpolationPair | null {
    if (this.snapshots.length < 2) {
      return null;
    }

    for (let i = 0; i < this.snapshots.length - 1; i++) {
      const previous = this.snapshots[i];
      const next = this.snapshots[i + 1];

      if (previous === undefined || next === undefined) {
        continue;
      }

      if (previous.receivedAt <= renderTime && renderTime <= next.receivedAt) {
        const duration = next.receivedAt - previous.receivedAt;
        const alpha = duration > 0
          ? (renderTime - previous.receivedAt) / duration
          : 0;

        return {
          previous: previous.snapshot,
          next: next.snapshot,
          alpha: Math.max(0, Math.min(1, alpha)),
        };
      }
    }

    const first = this.snapshots[0];
    const second = this.snapshots[1];

    if (first === undefined || second === undefined) {
      return null;
    }

    if (renderTime < first.receivedAt) {
      return {
        previous: first.snapshot,
        next: second.snapshot,
        alpha: 0,
      };
    }

    const previous = this.snapshots[this.snapshots.length - 2];
    const next = this.snapshots[this.snapshots.length - 1];

    if (previous === undefined || next === undefined) {
      return null;
    }

    const duration = next.receivedAt - previous.receivedAt;
    const alpha = duration > 0
      ? (renderTime - previous.receivedAt) / duration
      : 1;

    return {
      previous: previous.snapshot,
      next: next.snapshot,
      alpha: Math.max(0, Math.min(1, alpha)),
    };
  }
}

