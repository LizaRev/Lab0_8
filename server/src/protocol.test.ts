import { describe, expect, test } from "vitest";

import {
  MESSAGE_TYPES,
  PROTOCOL_VERSION,
  parseClientMessage,
} from "./protocol.js";

describe("client message protocol", () => {
  test("accepts a valid join message", () => {
    const result = parseClientMessage({
      version: PROTOCOL_VERSION,
      type: MESSAGE_TYPES.JOIN,
      roomId: "alpha",
      name: "Liza",
    });

    expect(result.ok).toBe(true);

    if (result.ok && result.message.type === "join") {
      expect(result.message.roomId).toBe("alpha");
      expect(result.message.name).toBe("Liza");
    }
  });

  test("rejects an empty player name", () => {
    const result = parseClientMessage({
      version: PROTOCOL_VERSION,
      type: MESSAGE_TYPES.JOIN,
      roomId: "alpha",
      name: "   ",
    });

    expect(result.ok).toBe(false);
  });

  test("rejects a message with the wrong protocol version", () => {
    const result = parseClientMessage({
      version: 999,
      type: MESSAGE_TYPES.JOIN,
      roomId: "alpha",
      name: "Liza",
    });

    expect(result.ok).toBe(false);
  });

  test("rejects server-only message types from clients", () => {
    const result = parseClientMessage({
      version: PROTOCOL_VERSION,
      type: MESSAGE_TYPES.PONG,
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error).toContain("Unsupported client message type");
    }
  });

  test("accepts a valid chat message", () => {
    const result = parseClientMessage({
      version: PROTOCOL_VERSION,
      type: MESSAGE_TYPES.CHAT,
      text: "Hello!",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.message.type).toBe("chat");
    }
  });
});
