
import WebSocket from "ws";
import { performance, eventLoopUtilization } from "node:perf_hooks";

const SERVER_URL = process.env.SERVER_URL ?? "ws://127.0.0.1:3000/ws";
const HTTP_SERVER_URL = process.env.HTTP_SERVER_URL ?? "http://127.0.0.1:3000";
const TEST_ORIGIN = process.env.TEST_ORIGIN ?? "http://localhost:5173";
const ROOM_PREFIX = process.env.ROOM_PREFIX ?? "load";

const CLIENTS = Number(process.env.CLIENTS ?? 8);
const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);

const MAX_CLIENTS_PER_ROOM = 16;
const PROTOCOL_VERSION = 1;

type TestClient = {
  socket: WebSocket;
  messages: number;
  bytesReceived: number;
  seq: number;
};

type TickStats = {
  samples: number;
  p50: number;
  p95: number;
  p99: number;
};

type RoomStats = {
  roomId: string;
  tick: TickStats;
};

type LoadResult = {
  clients: number;
  rooms: number;
  durationSeconds: number;
  messages: number;
  bytes: number;
  bytesPerSecond: number;
  messagesPerSecond: number;
  rssStartMb: number;
  rssEndMb: number;
  rssPeakMb: number;
  eventLoopUtilization: number;
  roomStats: RoomStats[];
};

function getMessageSize(data: WebSocket.RawData): number {
  if (typeof data === "string") {
    return Buffer.byteLength(data);
  }

  if (Buffer.isBuffer(data)) {
    return data.length;
  }

  if (data instanceof ArrayBuffer) {
    return data.byteLength;
  }

  if (Array.isArray(data)) {
    return data.reduce((total, part) => total + part.length, 0);
  }

  return 0;
}

function getRssMb(): number {
  return process.memoryUsage().rss / 1024 / 1024;
}

function getRoomCount(): number {
  return Math.ceil(CLIENTS / MAX_CLIENTS_PER_ROOM);
}

function getRoomId(roomIndex: number): string {
  return `${ROOM_PREFIX}-${roomIndex}`;
}

async function createRoom(roomId: string): Promise<void> {
  const response = await fetch(`${HTTP_SERVER_URL}/api/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: roomId,
      name: `Load Test ${roomId}`,
    }),
  });

  if (response.ok || response.status === 409) return;

  const body = await response.text();

  throw new Error(
    `Failed to create room ${roomId}: HTTP ${response.status} ${body}`
  );
}

async function prepareRooms(): Promise<string[]> {
  const roomCount = getRoomCount();
  const roomIds: string[] = [];

  for (let index = 0; index < roomCount; index++) {
    const roomId = getRoomId(index);

    await createRoom(roomId);
    roomIds.push(roomId);
  }

  return roomIds;
}

function getRoomForClient(clientIndex: number, roomIds: string[]): string {
  const roomIndex = Math.floor(clientIndex / MAX_CLIENTS_PER_ROOM);

  return roomIds[roomIndex] ?? roomIds[0] ?? "load-0";
}

function createClient(index: number, roomId: string): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(SERVER_URL, { origin: TEST_ORIGIN });

    const client: TestClient = {
      socket,
      messages: 0,
      bytesReceived: 0,
      seq: 0,
    };

    const timeout = setTimeout(() => {
      socket.terminate();
      reject(new Error(`Client ${index} connection timeout`));
    }, 5_000);

    socket.on("open", () => {
      clearTimeout(timeout);

      socket.send(JSON.stringify({
        version: PROTOCOL_VERSION,
        type: "join",
        roomId,
        name: `BotLoad-${index}`,
      }));

      resolve(client);
    });

    socket.on("message", (data) => {
      client.messages++;
      client.bytesReceived += getMessageSize(data);
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function sendInput(client: TestClient): void {
  if (client.socket.readyState !== WebSocket.OPEN) return;

  client.seq++;

  client.socket.send(JSON.stringify({
    version: PROTOCOL_VERSION,
    type: "input",
    seq: client.seq,
    input: {
      left: Math.random() < 0.5,
      right: Math.random() < 0.5,
      thrust: true,
      fire: Math.random() < 0.2,
      shotId: null,
    },
  }));
}

async function getTickStats(roomId: string): Promise<TickStats | null> {
  try {
    const response = await fetch(
      `${HTTP_SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/stats`
    );

    if (!response.ok) {
      console.error(
        `Stats request failed for ${roomId}: HTTP ${response.status}`
      );

      return null;
    }

    const data = (await response.json()) as {
      tick?: TickStats;
    };

    return data.tick ?? null;
  } catch (error: unknown) {
    console.error(`Failed to get tick stats for ${roomId}:`, error);
    return null;
  }
}

async function main(): Promise<void> {
  if (!Number.isInteger(CLIENTS) || CLIENTS < 1) {
    throw new Error("CLIENTS must be a positive integer");
  }

  if (!Number.isInteger(DURATION_MS) || DURATION_MS < 1_000) {
    throw new Error("DURATION_MS must be at least 1000");
  }

  const roomIds = await prepareRooms();

  console.log(`Starting load test: ${CLIENTS} clients`);
  console.log(`Rooms: ${roomIds.length}`);
  console.log(`Clients per room: maximum ${MAX_CLIENTS_PER_ROOM}`);
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Test Origin: ${TEST_ORIGIN}`);
  console.log(`Rooms: ${roomIds.join(", ")}`);

  const clients: TestClient[] = [];
  const start = performance.now();
  const rssStartMb = getRssMb();
  let rssPeakMb = rssStartMb;
  const eluStart = eventLoopUtilization();

  try {
    for (let index = 0; index < CLIENTS; index++) {
      const roomId = getRoomForClient(index, roomIds);
      const client = await createClient(index, roomId);

      clients.push(client);
    }

    console.log(`Connected clients: ${clients.length}`);

    const inputTimer = setInterval(() => {
      for (const client of clients) {
        sendInput(client);
      }

      rssPeakMb = Math.max(rssPeakMb, getRssMb());
    }, 33);

    try {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, DURATION_MS);
      });
    } finally {
      clearInterval(inputTimer);
    }

    const elapsed = performance.now() - start;
    const rssEndMb = getRssMb();

    rssPeakMb = Math.max(rssPeakMb, rssEndMb);

    const elu = eventLoopUtilization(eluStart);

    let totalMessages = 0;
    let totalBytes = 0;

    for (const client of clients) {
      totalMessages += client.messages;
      totalBytes += client.bytesReceived;
    }

    const roomStats: RoomStats[] = [];

    for (const roomId of roomIds) {
      const tick = await getTickStats(roomId);

      if (tick) {
        roomStats.push({
          roomId,
          tick,
        });
      }
    }

    const seconds = elapsed / 1000;

    const result: LoadResult = {
      clients: CLIENTS,
      rooms: roomIds.length,
      durationSeconds: seconds,
      messages: totalMessages,
      bytes: totalBytes,
      bytesPerSecond: totalBytes / seconds,
      messagesPerSecond: totalMessages / seconds,
      rssStartMb,
      rssEndMb,
      rssPeakMb,
      eventLoopUtilization: elu.utilization,
      roomStats,
    };

    console.log("");
    console.log("=== Load test result ===");
    console.log(`Clients: ${result.clients}`);
    console.log(`Rooms: ${result.rooms}`);
    console.log(`Duration: ${result.durationSeconds.toFixed(2)} s`);
    console.log(`Messages received: ${result.messages}`);
    console.log(`Bytes received: ${result.bytes}`);
    console.log(`Bytes/s: ${result.bytesPerSecond.toFixed(2)}`);
    console.log(`Messages/s: ${result.messagesPerSecond.toFixed(2)}`);
    console.log(`RSS start: ${result.rssStartMb.toFixed(2)} MB`);
    console.log(`RSS end: ${result.rssEndMb.toFixed(2)} MB`);
    console.log(`RSS peak: ${result.rssPeakMb.toFixed(2)} MB`);
    console.log(
      `Event loop utilization: ${(result.eventLoopUtilization * 100).toFixed(2)}%`
    );

    console.log("");
    console.log("Tick statistics ");

    for (const room of result.roomStats) {
      console.log(
        `${room.roomId}: p50=${room.tick.p50.toFixed(3)} ms, p95=${room.tick.p95.toFixed(3)} ms, p99=${room.tick.p99.toFixed(3)} ms`
      );
    }
  } finally {
    for (const client of clients) {
      if (client.socket.readyState !== WebSocket.CLOSED) {
        client.socket.close();
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error("Load test failed:", error);
  process.exitCode = 1;
});

