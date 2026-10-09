import { decodeBinaryMessage } from "../../shared/protocol/binary.js";
import type { Message } from "../../shared/protocol/messages.js";

type DecodeRequest = {
  buffer: ArrayBuffer;
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

self.addEventListener("message", (event: MessageEvent<DecodeRequest>) => {
  try {
    const message = decodeBinaryMessage(event.data.buffer);
    const response: DecodeResponse = {
      ok: true,
      message
    };

    self.postMessage(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const response: DecodeResponse = {
      ok: false,
      error: message
    };

    self.postMessage(response);
  }
});

