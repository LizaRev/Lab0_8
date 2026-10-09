import { describe, expect, test } from "vitest";
import fc from "fast-check";

import { parseClientMessage } from "./messages.js";

const roomIdArb = fc
  .string({
    unit: "grapheme",
    minLength: 1,
    maxLength: 32,
  })
  .filter((value) => value.trim().length > 0);

const nameArb = fc
  .string({
    unit: "grapheme",
    minLength: 1,
    maxLength: 24,
  })
  .filter((value) => value.trim().length > 0);

const chatTextArb = fc
  .string({
    unit: "grapheme",
    minLength: 1,
    maxLength: 500,
  })
  .filter((value) => value.trim().length > 0);

const inputArb = fc.record({
  version: fc.constant(1 as const),
  type: fc.constant("input" as const),
  seq: fc.integer({
    min: 0,
    max: 4_294_967_295,
  }),
  input: fc.dictionary(
    fc.string({
      unit: "grapheme",
      minLength: 1,
      maxLength: 10,
    }),
    fc.jsonValue()
  ),
});

const clientMessageArb = fc.oneof(
  fc.record({
    version: fc.constant(1 as const),
    type: fc.constant("join" as const),
    roomId: roomIdArb,
    name: nameArb,
  }),

  fc.record({
    version: fc.constant(1 as const),
    type: fc.constant("leave" as const),
  }),

  fc.record({
    version: fc.constant(1 as const),
    type: fc.constant("chat" as const),
    text: chatTextArb,
  }),

  fc.record({
    version: fc.constant(1 as const),
    type: fc.constant("ping" as const),
  }),

  inputArb
);

describe("parseClientMessage properties", () => {
  test("accepts every generated valid client message", () => {
    fc.assert(
      fc.property(clientMessageArb, (message) => {
        const result = parseClientMessage(message);

        expect(result.ok).toBe(true);

        if (result.ok) {
          expect(result.message.type).toBe(message.type);
        }
      }),
      { numRuns: 100 }
    );
  });

  test("rejects every generated client message with a mutated version", () => {
    fc.assert(
      fc.property(clientMessageArb, (message) => {
        const mutated = {
          ...message,
          version: 999,
        };

        const result = parseClientMessage(mutated);

        expect(result.ok).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

