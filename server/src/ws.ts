import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { RawData } from "ws";

import {
  MESSAGE_TYPES,
  PROTOCOL_VERSION,
  parseClientMessage,
} from "./protocol.js";

import type {
  Message,
  ClientMessage,
  InputMessage,
} from "../../shared/protocol/messages.js";

import type { Room, RoomManager } from "./rooms.js";

import {
  encodeBinaryMessage,
  decodeBinaryMessage,
} from "../../shared/protocol/binary.js";

import { TokenBucket } from "./rate-limit.js";
import { logger } from "./app-logger.js";

import {
  recordIncomingMessage,
  recordRejection,
} from "./metrics.js";

import {
  ALLOWED_ORIGINS,
  MAX_CONNECTIONS_PER_IP,
} from "./config.js";

const JOIN_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 15_000;
const MAX_MISSED_PONGS = 2;
const MAX_BUFFERED_AMOUNT = 64 * 1024;

const USE_BINARY_PROTOCOL = process.env.BINARY_PROTOCOL === "true";

const TOKEN_BUCKET_CAPACITY = 120;
const TOKEN_REFILL_RATE = 60;

// Активні WebSocket-підключення за IP.
const activeConnectionsByIp = new Map<string, number>();

// IP, пов'язаний із кожним WebSocket.
const socketIpMap = new WeakMap<WebSocket, string>();

type Player = {
  id: string;
  name: string;
  room: Room | null;
  send: (message: unknown, isCritical?: boolean) => boolean;
};

type BinaryMessage = Extract<
  Message,
  {
    type:
      | typeof MESSAGE_TYPES.INPUT
      | typeof MESSAGE_TYPES.SNAPSHOT;
  }
>;

export function attachWebSocketServer(
  server: HttpServer,
  roomManager: RoomManager
): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
  });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`
    );

    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    // Перевірка Origin перед WebSocket handshake.
    const origin = request.headers.origin;

    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      logger.warn(
        {
          origin: origin ?? null,
          ip: normalizeIp(request.socket.remoteAddress),
        },
        "WebSocket connection rejected: origin not allowed"
      );

      recordRejection("origin_rejected");

      socket.end(
        "HTTP/1.1 403 Forbidden\r\n" +
        "Content-Type: text/plain; charset=utf-8\r\n" +
        "Connection: close\r\n\r\n" +
        "Підключення відхилено: недозволене джерело запиту."
      );

      return;
    }

    // Перевірка ліміту підключень з одного IP.
    const ip = normalizeIp(request.socket.remoteAddress);
    const activeConnections = activeConnectionsByIp.get(ip) ?? 0;

    if (activeConnections >= MAX_CONNECTIONS_PER_IP) {
      logger.warn(
        {
          ip,
          activeConnections,
          limit: MAX_CONNECTIONS_PER_IP,
        },
        "WebSocket connection rejected: IP connection limit"
      );

      recordRejection("ip_connection_limit");

      socket.end(
        "HTTP/1.1 429 Too Many Requests\r\n" +
        "Content-Type: text/plain; charset=utf-8\r\n" +
        "Connection: close\r\n\r\n" +
        "Підключення відхилено: перевищено ліміт з'єднань з вашої IP-адреси."
      );

      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      // Реєструємо підключення лише після успішного handshake.
      const current = activeConnectionsByIp.get(ip) ?? 0;

      activeConnectionsByIp.set(ip, current + 1);
      socketIpMap.set(ws, ip);

      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (rawSocket) => {
    const player: Player = {
      id: randomUUID(),
      name: "",
      room: null,
      send: () => false,
    };

    const socket = Object.assign(rawSocket, {
      player,
      room: null as Room | null,
    });

    let joined = false;
    let missedPongs = 0;

    const rateLimiter = new TokenBucket(
      TOKEN_BUCKET_CAPACITY,
      TOKEN_REFILL_RATE
    );

    const send = (
      message: unknown,
      isCritical = true
    ): boolean => {
      if (socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      if (socket.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        if (!isCritical) {
          return false;
        }

        logger.warn(
          {
            playerId: player.id,
            roomId: player.room?.id,
            bufferedAmount: socket.bufferedAmount,
          },
          "Terminating slow client: buffer overflow"
        );

        socket.close(1008, "Slow client: buffer overflow");
        return false;
      }

      const useBinary =
        USE_BINARY_PROTOCOL && isBinaryMessage(message);

      socket.send(
        useBinary
          ? encodeBinaryMessage(message)
          : JSON.stringify(message)
      );

      return true;
    };

    player.send = send;

    const sendError = (
      error: string,
      reason = "application_error"
    ): void => {
      recordRejection(reason);

      send(
        {
          version: PROTOCOL_VERSION,
          type: MESSAGE_TYPES.ERROR,
          error,
        },
        true
      );
    };

    const joinTimeout = setTimeout(() => {
      if (!joined) {
        sendError("Join required within 5 seconds", "join_timeout");
        socket.close(1008, "Join timeout");
      }
    }, JOIN_TIMEOUT_MS);

    const heartbeat = setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (missedPongs >= MAX_MISSED_PONGS) {
        logger.info(
          {
            playerId: player.id,
            roomId: player.room?.id,
          },
          "Terminating inactive socket"
        );

        socket.terminate();
        return;
      }

      missedPongs += 1;
      socket.ping();
    }, HEARTBEAT_MS);

    socket.on("pong", () => {
      missedPongs = 0;
    });

    socket.on("message", (raw: RawData, isBinary: boolean) => {
      recordIncomingMessage(rawByteLength(raw));

      if (!rateLimiter.check()) {
        logger.warn(
          {
            playerId: player.id,
            roomId: player.room?.id,
          },
          "Rate limit exceeded"
        );

        sendError("Rate limit exceeded", "rate_limit");
        socket.close(1008, "Rate limit exceeded");
        return;
      }

      let message: unknown;

      try {
        message = isBinary
          ? decodeBinaryMessage(rawToArrayBuffer(raw))
          : JSON.parse(raw.toString());
      } catch {
        sendError(
          isBinary ? "Invalid binary message" : "Invalid JSON",
          isBinary ? "invalid_binary" : "invalid_json"
        );

        socket.close(1007, "Invalid JSON");
        return;
      }

      const result = parseClientMessage(message);

      if (!result.ok) {
        logger.warn(
          {
            playerId: player.id,
            roomId: player.room?.id,
            reason: result.error,
          },
          "Invalid WebSocket message"
        );

        sendError(result.error, "invalid_message");
        socket.close(1008, "Invalid message");
        return;
      }

      handleMessage(result.message);
    });

    socket.on("close", () => {
      clearTimeout(joinTimeout);
      clearInterval(heartbeat);

      // Звільняємо слот IP після відключення.
      const ip = socketIpMap.get(socket);

      if (ip) {
        const current = activeConnectionsByIp.get(ip) ?? 0;

        if (current <= 1) {
          activeConnectionsByIp.delete(ip);
        } else {
          activeConnectionsByIp.set(ip, current - 1);
        }

        socketIpMap.delete(socket);
      }

      if (socket.room) {
        const room = socket.room;

        room.removePlayer(player.id);

        room.broadcast(
          {
            version: PROTOCOL_VERSION,
            type: MESSAGE_TYPES.ROSTER,
            roomId: room.id,
            players: room.roster(),
          },
          null,
          true
        );

        socket.room = null;
        player.room = null;
      }
    });

    socket.on("error", (error: Error) => {
      logger.error(
        {
          err: error,
          playerId: player.id,
          roomId: player.room?.id,
        },
        "WebSocket error"
      );
    });

    function handleMessage(message: ClientMessage): void {
      switch (message.type) {
        case MESSAGE_TYPES.PING:
          handlePing();
          break;

        case MESSAGE_TYPES.JOIN:
          joinRoom(message);
          break;

        case MESSAGE_TYPES.LEAVE:
          leaveRoom();
          break;

        case MESSAGE_TYPES.CHAT:
          chat(message);
          break;

        case MESSAGE_TYPES.INPUT:
          handleInput(message);
          break;

        default: {
          const neverMessage: never = message;

          sendError(
            `Unsupported message type: ` + String(neverMessage),
            "unsupported_message"
          );
        }
      }
    }

    function handlePing(): void {
      send(
        {
          version: PROTOCOL_VERSION,
          type: MESSAGE_TYPES.PONG,
        },
        true
      );
    }

    function joinRoom(
      message: Extract<
        ClientMessage,
        { type: typeof MESSAGE_TYPES.JOIN }
      >
    ): void {
      const roomId = message.roomId.trim();
      const name = message.name.trim().slice(0, 24);

      if (!name) {
        sendError(
          "Необхідно вказати ім'я гравця",
          "missing_player_name"
        );

        return;
      }

      if (!roomId) {
        sendError("roomId is required", "invalid_room_id");
        return;
      }

      const room = roomManager.get(roomId);

      if (!room) {
        sendError("Room not found", "room_not_found");
        return;
      }

      if (socket.room) {
        leaveRoom();
      }

      player.name = name;
      player.room = room;
      socket.room = room;
      joined = true;

      clearTimeout(joinTimeout);

      try {
        room.addPlayer(player);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        sendError(errorMessage, "join_failed");
        socket.close(1008, errorMessage);
        return;
      }

      room.emit("chat", {
        roomId: room.id,
        player,
        text: `${player.name} joined the room`,
      });

      broadcastRoster(room);
    }

    function handleInput(message: InputMessage): void {
      if (!socket.room) {
        sendError("Join a room first", "not_in_room");
        return;
      }

      const room = socket.room;

      if (!room.match) {
        sendError("Match is not available", "match_unavailable");
        return;
      }

      room.match.setInput(player.id, message.seq, message.input);
    }

    function leaveRoom(): void {
      const room = socket.room;

      if (!room) {
        return;
      }

      room.removePlayer(player.id);

      socket.room = null;
      player.room = null;

      broadcastRoster(room);
    }

    function chat(
      message: Extract<
        ClientMessage,
        { type: typeof MESSAGE_TYPES.CHAT }
      >
    ): void {
      const room = socket.room;

      if (!room) {
        sendError("Join a room first", "not_in_room");
        return;
      }

      if (!player.name) {
        sendError(
          "Необхідно вказати ім'я гравця",
          "missing_player_name"
        );

        return;
      }

      const text = message.text.trim().slice(0, 500);

      if (!text) {
        sendError("Chat text is required", "empty_chat");
        return;
      }

      room.emit("log-event", {
        type: "chat",
        playerId: player.id,
        name: player.name,
        text,
      });

      room.emit("chat", {
        roomId: room.id,
        player,
        text,
      });

      room.broadcast(
        {
          version: PROTOCOL_VERSION,
          type: MESSAGE_TYPES.CHAT,
          roomId: room.id,
          playerId: player.id,
          name: player.name,
          text,
        },
        null,
        false
      );
    }

    function broadcastRoster(room: Room): void {
      room.broadcast(
        {
          version: PROTOCOL_VERSION,
          type: MESSAGE_TYPES.ROSTER,
          roomId: room.id,
          players: room.roster(),
        },
        null,
        true
      );
    }
  });

  return wss;
}

function normalizeIp(address: string | undefined): string {
  if (!address) {
    return "unknown";
  }

  // IPv4 може відображатися як IPv4-mapped IPv6.
  if (address.startsWith("::ffff:")) {
    return address.slice(7);
  }

  return address;
}

function isBinaryMessage(message: unknown): message is BinaryMessage {
  if (
    typeof message !== "object" ||
    message === null ||
    !("type" in message)
  ) {
    return false;
  }

  return (
    message.type === MESSAGE_TYPES.INPUT ||
    message.type === MESSAGE_TYPES.SNAPSHOT
  );
}

function rawByteLength(raw: RawData): number {
  if (Array.isArray(raw)) {
    return raw.reduce(
      (total, chunk) => total + chunk.byteLength,
      0
    );
  }

  return raw.byteLength;
}

function rawToArrayBuffer(raw: RawData): ArrayBuffer | Uint8Array {
  if (raw instanceof ArrayBuffer) {
    return raw;
  }

  if (Array.isArray(raw)) {
    return Buffer.concat(raw);
  }

  return raw;
}

