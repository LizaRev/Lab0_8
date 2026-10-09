import { describe, expect, test } from "vitest";
import fc from "fast-check";

import { encodeInput } from "../protocol/binary.js";
import { toSeq } from "../types.js";
import type { InputMessage } from "../protocol/messages.js";

const inputArb: fc.Arbitrary<InputMessage> = fc.record({
  version: fc.constant(1 as const),
  type: fc.constant("input" as const),
  seq: fc.integer({ min: 0, max: 4_294_967_295 }).map(toSeq),
  input: fc.record({
    left: fc.boolean(),
    right: fc.boolean(),
    thrust: fc.boolean(),
    fire: fc.boolean(),
  }),
});

describe("binary input codec properties", () => {
  test("encoded input length always equals the binary specification", () => {
    fc.assert(
      fc.property(inputArb, (message) => {
        const encoded = encodeInput(message);
        expect(encoded.byteLength).toBe(7);
      }),
      { numRuns: 100 }
    );
  });
});
