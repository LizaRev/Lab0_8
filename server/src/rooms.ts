import { EventEmitter } from "node:events";
import { setupRoomLogging } from "./logger.js";
import { Match } from "./match.js";

export const MAX_PLAYERS_PER_ROOM = 16;
export const MAX_ROOMS = 50;

type Player = {
  id: string;
  name: string;
  send: (message: unknown, isCritical?: boolean) => void;
};

type RoomEvents = {
  "log-event": [
    {
      type: "join" | "leave";
      playerId: string;
      name: string;
    } | {
      type: "chat";
      playerId: string;
      name: string;
      text: string;
    }
  ];
  join: [
    {
      roomId: string;
      player: Player;
    }
  ];
  leave: [
    {
      roomId: string;
      player: Player;
    }
  ];
  empty: [
    {
      roomId: string;
    }
  ];
};

export class Room extends EventEmitter<RoomEvents> {
  id: string;
  name: string;
  players: Map<string, Player>;
  match: Match;

  constructor(id: string, name: string = id) {
    super();

    this.id = id;
    this.name = name;
    this.players = new Map<string, Player>();
    this.match = new Match(id);

    // M4: автоматично додаємо 8 ботів лише в Beta.
    if (id === "beta") {
      this.match.addBots(8);
    }

    setupRoomLogging(this);
  }

  addPlayer(player: Player): void {
    if (this.players.size >= MAX_PLAYERS_PER_ROOM) {
      throw new Error("Room is full");
    }

    this.players.set(player.id, player);

    // M1: реєструємо клієнта в Match.
    this.match.addClient(player.id, player);

    if (this.players.size === 1) {
      this.match.start();
    }

    this.emit("log-event", {
      type: "join",
      playerId: player.id,
      name: player.name,
    });

    this.emit("join", {
      roomId: this.id,
      player,
    });
  }

  removePlayer(playerId: string): Player | null {
    const player = this.players.get(playerId);

    if (!player) {
      return null;
    }

    this.players.delete(playerId);

    // M1: видаляємо клієнта з Match.
    this.match.removeClient(playerId);

    this.emit("log-event", {
      type: "leave",
      playerId: player.id,
      name: player.name,
    });

    this.emit("leave", {
      roomId: this.id,
      player,
    });

    if (this.players.size === 0) {
      this.match.stop();

      this.emit("empty", {
        roomId: this.id,
      });
    }

    return player;
  }

  broadcast(
    message: unknown,
    exceptId: string | null = null,
    isCritical: boolean = true
  ): void {
    for (const player of this.players.values()) {
      if (player.id === exceptId) {
        continue;
      }

      player.send(message, isCritical);
    }
  }

  roster(): Array<{ id: string; name: string }> {
    return [...this.players.values()].map(
      ({ id, name }) => ({
        id,
        name,
      })
    );
  }
}

export class RoomManager {
  rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map<string, Room>();
  }

  create(id: string, name: string = id): Room {
    if (this.rooms.size >= MAX_ROOMS) {
      throw new Error("Server room limit reached");
    }

    if (this.rooms.has(id)) {
      throw new Error(`Room already exists: ${id}`);
    }

    const room = new Room(id, name);

    room.on("empty", ({ roomId }) => {
      if (roomId !== "alpha" && roomId !== "beta") {
        this.rooms.delete(roomId);
      }
    });

    this.rooms.set(id, room);

    return room;
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  list(): Array<{
    id: string;
    name: string;
    players: number;
  }> {
    return [...this.rooms.values()].map((room) => ({
      id: room.id,
      name: room.name,
      players: room.players.size,
    }));
  }

  getOrCreate(id: string, name: string = id): Room {
    return this.get(id) || this.create(id, name);
  }
}

