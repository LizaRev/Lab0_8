import type {
  InputMessage,
  Message,
} from "../../../shared/protocol/messages.js";

import type {
  SnapshotMessageWithWorld,
} from "../../../shared/protocol/binary.js";

import { LatencyInjector } from "./latency.js";
import { NetGraph } from "./netgraph.js";
import { InputSender } from "./input-sender.js";
import { SnapshotClient } from "./snapshot-client.js";

type Connection = {
  send(message: InputMessage): void;
};

type InputState = {
  left?: boolean;
  right?: boolean;
  thrust?: boolean;
  fire?: boolean;
  shotId?: string | null;
};

type SnapshotCallback = (
  snapshot: SnapshotMessageWithWorld
) => void;

function isSnapshotMessageWithWorld(
  message: Message
): message is SnapshotMessageWithWorld {
  if (message.type !== "snapshot") {
    return false;
  }

  if (
    typeof message.roomId !== "string" ||
    !("playerShipId" in message) ||
    !("world" in message)
  ) {
    return false;
  }

  if (
    typeof message.world !== "object" ||
    message.world === null
  ) {
    return false;
  }

  return true;
}

export class ClientNetwork {
  connection: Connection;
  netgraph: NetGraph;
  latency: LatencyInjector;
  snapshotClient: SnapshotClient;
  inputSender: InputSender;

  constructor(connection: Connection) {
    this.connection = connection;
    this.netgraph = new NetGraph();
    this.latency = new LatencyInjector({ latency: 0 });
    this.snapshotClient = new SnapshotClient(this.netgraph);

    this.inputSender = new InputSender(
      (message) => {
        this.send(message);
      },
      this.netgraph
    );
  }

  send(message: InputMessage): void {
    this.latency.send(() => {
      this.connection.send(message);
    });
  }

  sendInput(input: InputState): number {
    return this.inputSender.send(input);
  }

  handleMessage(message: Message): void {
    if (!isSnapshotMessageWithWorld(message)) {
      return;
    }

    this.latency.send(() => {
      this.snapshotClient.receive(message);
    });
  }

  onSnapshot(callback: SnapshotCallback): () => void {
    return this.snapshotClient.onSnapshot(callback);
  }

  setLatency(ms: number): void {
    this.latency.setLatency(ms);
  }

  setJitter(ms: number): void {
    this.latency.setJitter(ms);
  }

  setPacketLoss(percent: number): void {
    this.latency.setPacketLoss(percent);
  }

  getInterpolationDelay(): number {
    return this.netgraph.getInterpolationDelay();
  }
}

