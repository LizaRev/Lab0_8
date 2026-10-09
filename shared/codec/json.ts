import type { Codec } from "./codec.js";

export const jsonCodec: Codec<string, unknown> = {
  encode(value: unknown): string {
    return JSON.stringify(value);
  },

  decode(value: string): unknown {
    return JSON.parse(value);
  },
};

