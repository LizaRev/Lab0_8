import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  Registry,
  Counter,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";

import { LOG_DIR } from "./config.js";
import type { Room, RoomManager } from "./rooms.js";

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
});

const incomingMessages = new Counter({
  name: "dogfight_incoming_messages_total",
  help: "Total number of incoming WebSocket messages",
  registers: [metricsRegistry],
});

const incomingBytes = new Counter({
  name: "dogfight_incoming_message_bytes_total",
  help: "Total bytes received in WebSocket messages",
  registers: [metricsRegistry],
});

const rejections = new Counter({
  name: "dogfight_rejections_total",
  help: "Total number of rejected requests or messages",
  labelNames: ["reason"] as const,
  registers: [metricsRegistry],
});

const roomCount = new Gauge({
  name: "dogfight_rooms",
  help: "Current number of rooms",
  registers: [metricsRegistry],
});

const playerCount = new Gauge({
  name: "dogfight_players",
  help: "Current number of connected players in rooms",
  registers: [metricsRegistry],
});

const tickP99 = new Gauge({
  name: "dogfight_tick_p99_ms",
  help: "Maximum p99 tick duration across rooms in milliseconds",
  registers: [metricsRegistry],
});

const eventLoopUtilization = new Gauge({
  name: "dogfight_event_loop_utilization",
  help: "Event loop utilization between 0 and 1",
  registers: [metricsRegistry],
});

const messagesPerScrape = new Gauge({
  name: "dogfight_messages_per_scrape",
  help: "Incoming WebSocket messages since the previous metrics scrape",
  registers: [metricsRegistry],
});

const bytesPerScrape = new Gauge({
  name: "dogfight_bytes_per_scrape",
  help: "Incoming WebSocket bytes since the previous metrics scrape",
  registers: [metricsRegistry],
});

let messagesSinceScrape = 0;
let bytesSinceScrape = 0;
let previousUtilization = performance.eventLoopUtilization();

export function recordIncomingMessage(bytes: number): void {
  const safeBytes = Math.max(0, bytes);

  incomingMessages.inc();
  incomingBytes.inc(safeBytes);

  messagesSinceScrape += 1;
  bytesSinceScrape += safeBytes;
}

export function recordRejection(reason: string): void {
  rejections.inc({ reason });
}

export function updateMetrics(roomManager: RoomManager): void {
  roomCount.set(roomManager.rooms.size);

  let totalPlayers = 0;
  let maximumP99 = 0;

  for (const room of roomManager.rooms.values()) {
    totalPlayers += room.players.size;
    maximumP99 = Math.max(
      maximumP99,
      room.match.getTickStats().p99,
    );
  }

  playerCount.set(totalPlayers);
  tickP99.set(maximumP99);

  const currentUtilization = performance.eventLoopUtilization();
  const utilization = performance.eventLoopUtilization(
    currentUtilization,
    previousUtilization,
  );

  previousUtilization = currentUtilization;
  eventLoopUtilization.set(utilization.utilization);

  messagesPerScrape.set(messagesSinceScrape);
  bytesPerScrape.set(bytesSinceScrape);

  messagesSinceScrape = 0;
  bytesSinceScrape = 0;
}

export function setupRoomLogging(room: Room): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = path.join(LOG_DIR, `${room.id}-${timestamp}.ndjson`);
  const writeStream = fs.createWriteStream(logPath, { flags: "a" });

  const serializer = new Transform({
    objectMode: true,
    transform(chunk: Record<string, unknown>, _encoding, callback) {
      const eventWithTime = {
        t: Date.now(),
        ...chunk,
      };

      callback(null, JSON.stringify(eventWithTime) + "\n");
    },
  });

  const eventsStream = new Transform({
    objectMode: true,
    transform(event: unknown, _encoding, callback) {
      callback(null, event);
    },
  });

  const onEvent = (eventData: unknown): void => {
    eventsStream.write(eventData);
  };

  room.on("log-event", onEvent);

  room.once("empty", () => {
    room.off("log-event", onEvent);
    eventsStream.end();
  });

  pipeline(eventsStream, serializer, writeStream).catch((err: unknown) => {
    console.error(`Logging pipeline error for room ${room.id}:`, err);
  });
}
