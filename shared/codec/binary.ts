import type { Codec } from "./codec.js";
import type { SnapshotMessageWithWorld } from "../protocol/binary.js";

import {
  encodeSnapshot,
  decodeSnapshot,
} from "../protocol/binary.js";

export const binaryCodec: Codec<ArrayBuffer, SnapshotMessageWithWorld> = {
  encode(message: SnapshotMessageWithWorld): ArrayBuffer {
    return encodeSnapshot(message);
  },

  decode(data: ArrayBuffer): SnapshotMessageWithWorld {
    return decodeSnapshot(data);
  },
};

