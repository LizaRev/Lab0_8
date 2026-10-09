import { describe, expect, it } from "vitest";
import { toSeq } from "../types.js";

import {
  BINARY_CODEC_VERSION,
  BINARY_MESSAGE,
  decodeBinaryMessage,
  decodeInput,
  decodeSnapshot,
  encodeBinaryMessage,
  encodeInput,
  encodeSnapshot,
} from "./binary.js";

const baseEntity = {
  id: "1",
  x: 100,
  y: 200,
  angle: Math.PI / 2,
  vx: 10,
  vy: 20,
  radius: 15,
};

describe("binary protocol coverage", () => {
  it("encodes and decodes input", () => {
    const message = {
      version: BINARY_CODEC_VERSION as typeof BINARY_CODEC_VERSION,
      type: "input" as const,
      seq: toSeq(42),
      input: {
        left: true,
        right: false,
        thrust: true,
        fire: true,
      },
    };

    const encoded = encodeInput(message);
    const decoded = decodeInput(encoded);

    expect(decoded).toEqual(message);
  });

  it("rejects invalid input version, type and extra bytes", () => {
    const message = {
      version: BINARY_CODEC_VERSION as typeof BINARY_CODEC_VERSION,
      type: "input" as const,
      seq: toSeq(1),
      input: {
        left: false,
        right: false,
        thrust: false,
        fire: false,
      },
    };

    const invalidVersion = new Uint8Array(encodeInput(message));
    invalidVersion[0] = 99;

    expect(() => decodeInput(invalidVersion)).toThrow(
      "Unsupported binary codec version"
    );

    const wrongType = new Uint8Array(encodeInput(message));
    wrongType[1] = BINARY_MESSAGE.SNAPSHOT;

    expect(() => decodeInput(wrongType)).toThrow(
      "Not a binary input message"
    );

    const extra = new Uint8Array([
      ...new Uint8Array(encodeInput(message)),
      1,
    ]);

    expect(() => decodeInput(extra)).toThrow(
      "Unexpected bytes after input message"
    );
  });

  it("encodes and decodes snapshot with every entity kind", () => {
    const message = {
      version: BINARY_CODEC_VERSION as typeof BINARY_CODEC_VERSION,
      type: "snapshot" as const,
      roomId: "alpha",
      playerShipId: "1",
      lastProcessedSeq: 10,
      world: {
        width: 800,
        height: 500,
        score: 300,
        entities: [
          {
            ...baseEntity,
            kind: "entity" as const,
            hp: 1,
            thrust: 0.5,
            type: "generic",
            ttl: 2,
          },
          {
            ...baseEntity,
            id: "2",
            kind: "ship" as const,
            hp: 3,
            thrust: 1,
          },
          {
            ...baseEntity,
            id: "3",
            kind: "asteroid" as const,
            hp: 2,
          },
          {
            ...baseEntity,
            id: "4",
            kind: "bullet" as const,
            ttl: 1.5,
          },
          {
            ...baseEntity,
            id: "5",
            kind: "pickup" as const,
            type: "shield",
          },
          {
            ...baseEntity,
            id: "6",
            kind: "explosion" as const,
          },
        ],
      },
    };

    const encoded = encodeSnapshot(message);
    const decoded = decodeSnapshot(encoded);

    expect(decoded.version).toBe(1);
    expect(decoded.type).toBe("snapshot");
    expect(decoded.roomId).toBe("alpha");
    expect(decoded.playerShipId).toBe("1");
    expect(decoded.lastProcessedSeq).toBe(10);
    expect(decoded.world.width).toBeCloseTo(800);
    expect(decoded.world.height).toBeCloseTo(500);
    expect(decoded.world.score).toBeCloseTo(300);
    expect(decoded.world.entities).toHaveLength(6);

    expect(decoded.world.entities[0]?.kind).toBe("entity");

    expect(decoded.world.entities[1]).toMatchObject({
      kind: "ship",
      hp: 3,
      thrust: 1,
    });

    expect(decoded.world.entities[2]).toMatchObject({
      kind: "asteroid",
      hp: 2,
    });

    expect(decoded.world.entities[3]).toMatchObject({
      kind: "bullet",
      ttl: 1.5,
    });

    expect(decoded.world.entities[4]).toMatchObject({
      kind: "pickup",
      type: "shield",
    });

    expect(decoded.world.entities[5]?.kind).toBe("explosion");
  });

  it("supports an empty player ship id", () => {
    const message = {
      version: BINARY_CODEC_VERSION as typeof BINARY_CODEC_VERSION,
      type: "snapshot" as const,
      roomId: "beta",
      playerShipId: null,
      lastProcessedSeq: 0,
      world: {
        width: 1200,
        height: 700,
        score: 0,
        entities: [],
      },
    };

    const decoded = decodeSnapshot(encodeSnapshot(message));

    expect(decoded.playerShipId).toBeNull();
    expect(decoded.world.entities).toEqual([]);
  });

  it("rejects invalid snapshot data", () => {
    const message = {
      version: BINARY_CODEC_VERSION as typeof BINARY_CODEC_VERSION,
      type: "snapshot" as const,
      roomId: "alpha",
      playerShipId: null,
      lastProcessedSeq: 0,
      world: {
        width: 800,
        height: 500,
        score: 0,
        entities: [],
      },
    };

    const invalidVersion = new Uint8Array(encodeSnapshot(message));
    invalidVersion[0] = 99;

    expect(() => decodeSnapshot(invalidVersion)).toThrow(
      "Unsupported binary codec version"
    );

    const wrongType = new Uint8Array(encodeSnapshot(message));
    wrongType[1] = BINARY_MESSAGE.INPUT;

    expect(() => decodeSnapshot(wrongType)).toThrow(
      "Not a binary snapshot message"
    );

    const extra = new Uint8Array([
      ...new Uint8Array(encodeSnapshot(message)),
      1,
    ]);

    expect(() => decodeSnapshot(extra)).toThrow(
      "Unexpected bytes after snapshot message"
    );
  });

  it("rejects unknown snapshot entity kind", () => {
    const message = {
      version: BINARY_CODEC_VERSION as typeof BINARY_CODEC_VERSION,
      type: "snapshot" as const,
      roomId: "alpha",
      playerShipId: null,
      lastProcessedSeq: 0,
      world: {
        width: 800,
        height: 500,
        score: 0,
        entities: [
          {
            ...baseEntity,
            kind: "ship" as const,
          },
        ],
      },
    };

    const encoded = new Uint8Array(encodeSnapshot(message));
    const shipBytes = new TextEncoder().encode("ship");
    let kindStart = -1;

    for (let i = 0; i <= encoded.length - shipBytes.length; i++) {
      let matches = true;

      for (let j = 0; j < shipBytes.length; j++) {
        if (encoded[i + j] !== shipBytes[j]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        kindStart = i;
        break;
      }
    }

    expect(kindStart).toBeGreaterThan(-1);

    encoded[kindStart] = "x".charCodeAt(0);

    expect(() => decodeSnapshot(encoded)).toThrow(
      "Unknown snapshot entity kind"
    );
  });

  it("handles binary message wrappers", () => {
    const input = {
      version: BINARY_CODEC_VERSION as typeof BINARY_CODEC_VERSION,
      type: "input" as const,
      seq: toSeq(7),
      input: {
        left: true,
        right: false,
        thrust: false,
        fire: false,
      },
    };

    expect(decodeBinaryMessage(encodeBinaryMessage(input))).toEqual(input);

    const snapshot = {
      version: BINARY_CODEC_VERSION as typeof BINARY_CODEC_VERSION,
      type: "snapshot" as const,
      roomId: "alpha",
      playerShipId: null,
      lastProcessedSeq: 0,
      world: {
        width: 800,
        height: 500,
        score: 0,
        entities: [],
      },
    };

    expect(() => encodeBinaryMessage(snapshot)).toThrow(
      "Snapshot message requires world data"
    );

    for (const type of [
      "join",
      "leave",
      "chat",
      "ping",
      "pong",
      "error",
      "roster",
    ] as const) {
      const message = {
        version: BINARY_CODEC_VERSION as typeof BINARY_CODEC_VERSION,
        type,
      } as never;

      expect(() => encodeBinaryMessage(message)).toThrow(
        `Unsupported binary message type: ${type}`
      );
    }
  });

  it("rejects unknown binary message type", () => {
    const buffer = new Uint8Array([
      BINARY_CODEC_VERSION,
      99,
    ]);

    expect(() => decodeBinaryMessage(buffer)).toThrow(
      "Unknown binary message type: 99"
    );

    const badVersion = new Uint8Array([
      99,
      BINARY_MESSAGE.INPUT,
    ]);

    expect(() => decodeBinaryMessage(badVersion)).toThrow(
      "Unsupported binary codec version"
    );
  });
});

