import { describe, expect, test } from "vitest";
import fc from "fast-check";

import { binaryCodec } from "./binary.js";

import type {
  SnapshotMessageWithWorld,
  SnapshotEntity,
} from "../protocol/binary.js";

const finiteNumberArb = fc.double({
  min: -1000,
  max: 1000,
  noNaN: true,
  noDefaultInfinity: true,
});

const optionalNumberArb = fc.option(finiteNumberArb, {
  nil: undefined,
});

const baseEntityArb = fc.record({
  id: fc.string({
    unit: "grapheme",
    minLength: 1,
    maxLength: 12,
  }),
  x: finiteNumberArb,
  y: finiteNumberArb,
  angle: optionalNumberArb,
  vx: finiteNumberArb,
  vy: finiteNumberArb,
  radius: fc.double({
    min: 0,
    max: 100,
    noNaN: true,
    noDefaultInfinity: true,
  }),
});

const entityArb: fc.Arbitrary<SnapshotEntity> = fc.oneof(
  baseEntityArb.map((entity) => ({
    ...entity,
    kind: "entity" as const,
  })),

  baseEntityArb.chain((entity) =>
    fc
      .record({
        hp: optionalNumberArb,
        thrust: optionalNumberArb,
      })
      .map((extra) => ({
        ...entity,
        ...extra,
        kind: "ship" as const,
      }))
  ),

  baseEntityArb.chain((entity) =>
    fc
      .record({
        hp: optionalNumberArb,
      })
      .map((extra) => ({
        ...entity,
        ...extra,
        kind: "asteroid" as const,
      }))
  ),

  baseEntityArb.chain((entity) =>
    fc
      .record({
        ttl: optionalNumberArb,
      })
      .map((extra) => ({
        ...entity,
        ...extra,
        kind: "bullet" as const,
      }))
  ),

  baseEntityArb.chain((entity) =>
    fc
      .record({
        type: fc.string({
          unit: "grapheme",
          maxLength: 12,
        }),
      })
      .map((extra) => ({
        ...entity,
        ...extra,
        kind: "pickup" as const,
      }))
  ),

  baseEntityArb.map((entity) => ({
    ...entity,
    kind: "explosion" as const,
  }))
);

const snapshotArb: fc.Arbitrary<SnapshotMessageWithWorld> = fc.record({
  version: fc.constant(1 as const),
  type: fc.constant("snapshot" as const),
  roomId: fc.string({
    unit: "grapheme",
    minLength: 1,
    maxLength: 12,
  }),
  playerShipId: fc.option(
    fc.string({
      unit: "grapheme",
      minLength: 1,
      maxLength: 12,
    }),
    {
      nil: null,
    }
  ),
  lastProcessedSeq: fc.integer({
    min: -1,
    max: 2_147_483_647,
  }),
  world: fc.record({
    width: fc.double({
      min: 1,
      max: 2000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    height: fc.double({
      min: 1,
      max: 2000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    score: finiteNumberArb,
    entities: fc.array(entityArb, {
      maxLength: 8,
    }),
  }),
});

function expectClose(
  actual: number,
  expected: number,
  tolerance = 0.001
): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe("binary codec properties", () => {
  test("snapshot codec round-trips generated messages", () => {
    fc.assert(
      fc.property(snapshotArb, (message) => {
        const encoded = binaryCodec.encode(message);
        const decoded = binaryCodec.decode(encoded);

        expect(decoded.version).toBe(message.version);
        expect(decoded.type).toBe(message.type);
        expect(decoded.roomId).toBe(message.roomId);
        expect(decoded.playerShipId).toBe(message.playerShipId);
        expect(decoded.lastProcessedSeq).toBe(message.lastProcessedSeq);

        expectClose(decoded.world.width, message.world.width);
        expectClose(decoded.world.height, message.world.height);
        expectClose(decoded.world.score, message.world.score);

        expect(decoded.world.entities.length).toBe(
          message.world.entities.length
        );

        for (let i = 0; i < message.world.entities.length; i++) {
          const original = message.world.entities[i];
          const result = decoded.world.entities[i];

          expect(result).toBeDefined();

          if (!result) {
            continue;
          }

          expect(result.id).toBe(original.id);
          expect(result.kind).toBe(original.kind);

          expectClose(result.x, original.x);
          expectClose(result.y, original.y);
          expectClose(result.vx, original.vx);
          expectClose(result.vy, original.vy);
          expectClose(result.radius, original.radius);

          if (original.hp !== undefined) {
            expect(result.hp).toBeDefined();
            expectClose(result.hp ?? 0, original.hp);
          }

          if (original.thrust !== undefined) {
            expect(result.thrust).toBeDefined();
            expectClose(result.thrust ?? 0, original.thrust);
          }

          if (original.type !== undefined) {
            expect(result.type).toBe(original.type);
          }

          if (original.ttl !== undefined) {
            expect(result.ttl).toBeDefined();
            expectClose(result.ttl ?? 0, original.ttl);
          }
        }
      }),
      {
        numRuns: 100,
      }
    );
  });
});

