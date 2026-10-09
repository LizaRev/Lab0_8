import type { InputMessage } from "../../../shared/protocol/messages.js";
import { toSeq, type Seq } from "../../../shared/types.js";
import type { NetGraph } from "./netgraph.js";

type InputState = {
  left?: boolean;
  right?: boolean;
  thrust?: boolean;
  fire?: boolean;
  shotId?: string | null;
};

type SendMessage = (message: InputMessage) => void;

export class InputSender {
  sendMessage: SendMessage;
  netgraph: NetGraph | null;
  seq: Seq;

  constructor(send: SendMessage, netgraph: NetGraph | null = null) {
    this.sendMessage = send;
    this.netgraph = netgraph;
    this.seq = toSeq(0);
  }

  send(input: InputState): Seq {
    const seq = this.seq;
    this.seq = toSeq(this.seq + 1);

    this.sendMessage({
      version: 1,
      type: "input",
      seq,
      input: {
        left: Boolean(input.left),
        right: Boolean(input.right),
        thrust: Boolean(input.thrust),
        fire: Boolean(input.fire),
        shotId: null,
      },
    });

    this.netgraph?.recordInput();

    return seq;
  }
}

