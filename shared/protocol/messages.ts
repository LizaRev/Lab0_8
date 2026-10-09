import { z } from "zod";

import type { Seq } from "../types.js";

export const PROTOCOL_VERSION = 1;

export const MESSAGE_TYPES: {
  readonly JOIN: "join";
  readonly LEAVE: "leave";
  readonly CHAT: "chat";
  readonly PING: "ping";
  readonly PONG: "pong";
  readonly ERROR: "error";
  readonly ROSTER: "roster";
  readonly INPUT: "input";
  readonly SNAPSHOT: "snapshot";
} = {
  JOIN: "join",
  LEAVE: "leave",
  CHAT: "chat",
  PING: "ping",
  PONG: "pong",
  ERROR: "error",
  ROSTER: "roster",
  INPUT: "input",
  SNAPSHOT: "snapshot",
};

export type MessageType =
  (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

const MAX_ROOM_ID_LENGTH = 32;
const MAX_NAME_LENGTH = 24;
const MAX_CHAT_LENGTH = 500;

const versionSchema = z.literal(PROTOCOL_VERSION);

const seqSchema = z.custom<Seq>(
  (value) =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
);

const joinSchema = z.object({
  version: versionSchema,
  type: z.literal(MESSAGE_TYPES.JOIN),
  roomId: z
    .string()
    .refine(
      (value) => value.trim().length > 0,
      "Invalid roomId"
    )
    .max(MAX_ROOM_ID_LENGTH),
  name: z
    .string()
    .refine(
      (value) => value.trim().length > 0,
      "Invalid player name"
    )
    .max(MAX_NAME_LENGTH),
});

const leaveSchema = z.object({
  version: versionSchema,
  type: z.literal(MESSAGE_TYPES.LEAVE),
});

const chatSchema = z.object({
  version: versionSchema,
  type: z.literal(MESSAGE_TYPES.CHAT),
  text: z
    .string()
    .refine(
      (value) => value.trim().length > 0,
      "Invalid chat text"
    )
    .max(MAX_CHAT_LENGTH),
  roomId: z.string().optional(),
  playerId: z.string().optional(),
  name: z.string().optional(),
});

const pingSchema = z.object({
  version: versionSchema,
  type: z.literal(MESSAGE_TYPES.PING),
});

const pongSchema = z.object({
  version: versionSchema,
  type: z.literal(MESSAGE_TYPES.PONG),
});

const errorSchema = z.object({
  version: versionSchema,
  type: z.literal(MESSAGE_TYPES.ERROR),
  error: z.string(),
});

const rosterPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const rosterSchema = z.object({
  version: versionSchema,
  type: z.literal(MESSAGE_TYPES.ROSTER),
  roomId: z.string(),
  players: z.array(rosterPlayerSchema),
});

const inputSchema = z.object({
  version: versionSchema,
  type: z.literal(MESSAGE_TYPES.INPUT),
  seq: seqSchema,
  input: z.record(
    z.string(),
    z.unknown()
  ),
});

const snapshotEntitySchema = z.object({
  id: z.union([
    z.number().int(),
    z.string(),
  ]),
  kind: z.string(),
  x: z.number(),
  y: z.number(),
  angle: z.number().optional(),
  vx: z.number(),
  vy: z.number(),
  radius: z.number(),
  hp: z.number().optional(),
  thrust: z.number().optional(),
  type: z.string().optional(),
  ttl: z.number().optional(),
  shield: z.boolean().optional(),
  alive: z.boolean().optional(),
});

const snapshotSchema = z.object({
  version: versionSchema,
  type: z.literal(MESSAGE_TYPES.SNAPSHOT),
  roomId: z.string(),

  playerId: z.string().optional(),

  playerShipId: z.union([
    z.number().int(),
    z.string(),
    z.null(),
  ]),

  lastProcessedSeq:
    z.number().int().min(-1),

  world: z.object({
    width: z.number(),
    height: z.number(),
    score: z.number(),

    entities: z.array(
      snapshotEntitySchema
    ),
  }),
});

export const messageSchema =
  z.discriminatedUnion("type", [
    joinSchema,
    leaveSchema,
    chatSchema,
    pingSchema,
    pongSchema,
    errorSchema,
    rosterSchema,
    inputSchema,
    snapshotSchema,
  ]);

export type JoinMessage =
  z.infer<typeof joinSchema>;

export type LeaveMessage =
  z.infer<typeof leaveSchema>;

export type ChatMessage =
  z.infer<typeof chatSchema>;

export type PingMessage =
  z.infer<typeof pingSchema>;

export type PongMessage =
  z.infer<typeof pongSchema>;

export type ErrorMessage =
  z.infer<typeof errorSchema>;

export type RosterMessage =
  z.infer<typeof rosterSchema>;

export type InputMessage =
  z.infer<typeof inputSchema>;

export type SnapshotMessage =
  z.infer<typeof snapshotSchema>;

export type Message =
  z.infer<typeof messageSchema>;

export type ClientMessage =
  | JoinMessage
  | LeaveMessage
  | ChatMessage
  | PingMessage
  | InputMessage;

export type ParseResult<T> =
  | {
      ok: true;
      message: T;
    }
  | {
      ok: false;
      error: string;
    };

export function parseClientMessage(
  value: unknown
): ParseResult<ClientMessage> {
  const result =
    messageSchema.safeParse(value);

  if (!result.success) {
    return {
      ok: false,
      error: result.error.message,
    };
  }

  switch (result.data.type) {
    case MESSAGE_TYPES.JOIN:
    case MESSAGE_TYPES.LEAVE:
    case MESSAGE_TYPES.CHAT:
    case MESSAGE_TYPES.PING:
    case MESSAGE_TYPES.INPUT:
      return {
        ok: true,
        message: result.data,
      };

    case MESSAGE_TYPES.PONG:
    case MESSAGE_TYPES.ERROR:
    case MESSAGE_TYPES.ROSTER:
    case MESSAGE_TYPES.SNAPSHOT:
      return {
        ok: false,
        error:
          `Unsupported client message type: ` +
          result.data.type,
      };

    default: {
      const neverType: never =
        result.data;

      return {
        ok: false,
        error:
          `Unsupported message type: ` +
          String(neverType),
      };
    }
  }
}

export function parseMessage(
  value: unknown
): ParseResult<Message> {
  const result =
    messageSchema.safeParse(value);

  if (!result.success) {
    return {
      ok: false,
      error: result.error.message,
    };
  }

  return {
    ok: true,
    message: result.data,
  };
}

