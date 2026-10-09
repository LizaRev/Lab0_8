import { describe, expect, test } from "vitest";
import fc from "fast-check";

import { decodeInput } from "../protocol/binary.js";

describe("binary decoder properties", () => {
  test(
    "arbitrary garbage buffers are rejected without crashing the test runner",
    () => {
      fc.assert(
        fc.property(fc.uint8Array({ maxLength: 64 }), (buffer) => {
          try {
            const decoded = decodeInput(buffer);

            expect(decoded.version).toBe(1);
            expect(decoded.type).toBe("input");
            expect(decoded.input).toBeDefined();
            expect(decoded.input.left).toBeTypeOf("boolean");
            expect(decoded.input.right).toBeTypeOf("boolean");
            expect(decoded.input.thrust).toBeTypeOf("boolean");
            expect(decoded.input.fire).toBeTypeOf("boolean");
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
          }
        }),
        { numRuns: 100 }
      );
    }
  );
});

