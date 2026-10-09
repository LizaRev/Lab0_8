import { World } from "../../shared/sim/world.js";
import { Ship } from "../../shared/sim/ship.js";
import { Asteroid } from "../../shared/sim/asteroid.js";
import { Pickup } from "../../shared/sim/pickup.js";
import { attachHoming } from "../../shared/sim/homing.js";
import { Vector2 } from "../../shared/sim/vector.js";
import { Entity } from "../../shared/sim/entity.js";
import { BotAI } from "./bot-ai.js";

import {
  MESSAGE_TYPES,
  PROTOCOL_VERSION,
} from "../../shared/protocol/messages.js";

type PlayerId = string;

type InputState = {
  left: boolean;
  right: boolean;
  thrust: boolean;
  fire: boolean;
  shotId: number | null;
};

type StoredInput = {
  seq: number;
  input: InputState;
  previousFire: boolean;
};

type InputHandler = {
  isDown: (action: string) => boolean;
};

type PlayerInput = {
  ship: Ship;
  input: InputHandler;
  state: StoredInput;
};

type Client = {
  id: string;
  send: (message: unknown, isCritical?: boolean) => void;
};

export class Match {
  roomId: PlayerId;

  world: World;

  clients: Map<PlayerId, Client>;

  inputs: Map<PlayerId, StoredInput>;

  ships: Map<PlayerId, Ship>;

  bots: Map<PlayerId, BotAI>;

  botShips: Map<PlayerId, Ship>;

  tickRate: number;
  tickMs: number;

  tickDurations: number[];
  tickSamplesLimit: number;

  timer: ReturnType<typeof setTimeout> | null;
  nextTickTime: number | null;
  running: boolean;

  asteroid1!: Asteroid;

  constructor(roomId: PlayerId) {
    this.roomId = roomId;

    this.world = new World();

    this.clients = new Map<PlayerId, Client>();

    this.inputs = new Map<PlayerId, StoredInput>();

    this.ships = new Map<PlayerId, Ship>();

    this.bots = new Map<PlayerId, BotAI>();

    this.botShips = new Map<PlayerId, Ship>();

    this.tickRate = 30;
    this.tickMs = 1000 / this.tickRate;

    this.tickDurations = [];
    this.tickSamplesLimit = 5000;

    this.timer = null;
    this.nextTickTime = null;
    this.running = false;

    this.seedWorld();
  }

  seedWorld(): void {
    const ship = new Ship(
      400,
      250
    );

    this.world.spawn(
      ship
    );

    this.asteroid1 = new Asteroid(
      200,
      200,
      100,
      80,
      30
    );

    this.world.spawn(
      this.asteroid1
    );

    attachHoming(
      this.asteroid1,
      ship
    );

    const asteroid2 = new Asteroid(
      600,
      350,
      -80,
      -60,
      30
    );

    this.world.spawn(
      asteroid2
    );

    // Два дополнительных астероида только в Beta.
    if (this.roomId === "beta") {
      const asteroid3 = new Asteroid(
        150,
        400,
        70,
        -90,
        30
      );

      this.world.spawn(
        asteroid3
      );

      const asteroid4 = new Asteroid(
        650,
        150,
        -90,
        70,
        30
      );

      this.world.spawn(
        asteroid4
      );
    }

    const pickup = new Pickup(
      600,
      300,
      "shield"
    );

    this.world.spawn(
      pickup
    );
  }



  addClient(
    playerId: PlayerId,
    player: Client | null = null
  ): void {
    const client = player ?? {
      id: playerId,
      send: () => {},
    };

    const id = player
      ? playerId
      : client.id;

    this.clients.set(
      id,
      client
    );

    let ship = this.ships.get(
      id
    );

    if (!ship) {
      ship = this.findFreeShip();

      if (!ship) {
        const spawnIndex =
          this.ships.size;

        const spawnPositions = [
          {
            x: 400,
            y: 250,
          },
          {
            x: 200,
            y: 250,
          },
          {
            x: 600,
            y: 250,
          },
          {
            x: 400,
            y: 120,
          },
          {
            x: 400,
            y: 380,
          },
        ];

        const position =
          spawnPositions[
            spawnIndex %
            spawnPositions.length
          ];

        if (!position) {
          return;
        }

        ship = new Ship(
          position.x,
          position.y
        );

        this.world.spawn(
          ship
        );
      }

      this.ships.set(
        id,
        ship
      );
    }

    this.inputs.set(
      id,
      {
        seq: -1,

        input: {
          left: false,
          right: false,
          thrust: false,
          fire: false,
          shotId: null,
        },

        previousFire: false,
      }
    );
  }

  addBots(
    count: number
  ): void {
    if (
      !Number.isInteger(count) ||
      count <= 0
    ) {
      return;
    }

    const existingBots =
      this.bots.size;

    for (
      let index = 0;
      index < count;
      index++
    ) {
      const botNumber =
        existingBots +
        index +
        1;

      const botId =
        `bot-${botNumber}`;

      if (
        this.bots.has(botId)
      ) {
        continue;
      }

      const spawnPositions = [
        {
          x: 200,
          y: 150,
        },
        {
          x: 600,
          y: 150,
        },
        {
          x: 200,
          y: 400,
        },
        {
          x: 600,
          y: 400,
        },
        {
          x: 100,
          y: 300,
        },
        {
          x: 700,
          y: 300,
        },
        {
          x: 350,
          y: 100,
        },
        {
          x: 450,
          y: 400,
        },
      ];

      const position =
        spawnPositions[
          index %
          spawnPositions.length
        ];

      if (!position) {
        continue;
      }

      const ship =
        new Ship(
          position.x,
          position.y
        );

      this.world.spawn(
        ship
      );

      const ai =
        new BotAI(
          ship,
          this.world
        );

      this.botShips.set(
        botId,
        ship
      );

      this.bots.set(
        botId,
        ai
      );
    }
  }

  findFreeShip(): Ship | undefined {
    for (
      const entity of
      this.world.ofKind("ship")
    ) {
      if (!(entity instanceof Ship)) {
        continue;
      }

      const ship = entity;

      if (!ship.alive) {
        continue;
      }

      let assigned = false;

      for (
        const assignedShip of
        this.ships.values()
      ) {
        if (
          assignedShip === ship
        ) {
          assigned = true;
          break;
        }
      }

      if (assigned) {
        continue;
      }

      for (
        const assignedShip of
        this.botShips.values()
      ) {
        if (
          assignedShip === ship
        ) {
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        return ship;
      }
    }

    return undefined;
  }

  removeClient(
    playerId: PlayerId
  ): void {
    this.clients.delete(
      playerId
    );

    this.inputs.delete(
      playerId
    );

    const ship =
      this.ships.get(
        playerId
      );

    if (ship) {
      ship.alive = false;

      this.ships.delete(
        playerId
      );
    }
  }

  setInput(
    playerId: PlayerId,
    seq: number,
    input: Partial<InputState> | null | undefined
  ): void {
    if (
      !this.clients.has(
        playerId
      )
    ) {
      return;
    }

    if (
      !Number.isInteger(seq) ||
      seq < 0
    ) {
      return;
    }

    const current =
      this.inputs.get(
        playerId
      );

    if (!current) {
      return;
    }

    if (
      seq <= current.seq
    ) {
      return;
    }

    current.seq =
      seq;

    current.input =
      this.normalizeInput(
        input
      );
  }

  normalizeInput(
    input: Partial<InputState> | null | undefined
  ): InputState {
    return {
      left:
        Boolean(
          input?.left
        ),

      right:
        Boolean(
          input?.right
        ),

      thrust:
        Boolean(
          input?.thrust
        ),

      fire:
        Boolean(
          input?.fire
        ),

      shotId:
        input?.shotId ?? null,
    };
  }

  start(): void {
    if (
      this.running
    ) {
      return;
    }

    this.running =
      true;

    this.nextTickTime =
      performance.now() +
      this.tickMs;

    this.scheduleNextTick();
  }

  scheduleNextTick(): void {
    if (
      !this.running
    ) {
      return;
    }

    const now =
      performance.now();

    const delay =
      Math.max(
        0,
        (this.nextTickTime ?? now) - now
      );

    this.timer =
      setTimeout(
        () => {
          this.tick();

          if (
            this.nextTickTime !== null
          ) {
            this.nextTickTime +=
              this.tickMs;
          }

          this.scheduleNextTick();
        },
        delay
      );
  }

  stop(): void {
    this.running =
      false;

    if (
      this.timer
    ) {
      clearTimeout(
        this.timer
      );

      this.timer =
        null;
    }

    this.nextTickTime =
      null;
  }

  tick(): void {
    const tickStart =
      performance.now();

    const dt =
      this.tickMs / 1000;

    const playerInputs =
      new Map<PlayerId, PlayerInput>();

    const shipInputs =
      new Map<Ship, InputHandler>();

    for (
      const [playerId, state]
      of this.inputs
    ) {
      if (
        !this.clients.has(
          playerId
        )
      ) {
        continue;
      }

      let ship =
        this.ships.get(
          playerId
        );

      if (
        !ship ||
        !ship.alive
      ) {
        ship =
          this.findFreeShip();

        if (ship) {
          this.ships.set(
            playerId,
            ship
          );
        }
      }

      if (
        !ship ||
        !ship.alive
      ) {
        continue;
      }

      const current =
        state.input;

      const input: InputHandler = {
        isDown: (
          action: string
        ): boolean => {
          if (
            action ===
            "ArrowLeft"
          ) {
            return current.left;
          }

          if (
            action ===
            "ArrowRight"
          ) {
            return current.right;
          }

          if (
            action ===
            "ArrowUp"
          ) {
            return current.thrust;
          }

          if (
            action ===
            "Space"
          ) {
            return current.fire;
          }

          return false;
        },
      };

      playerInputs.set(
        playerId,
        {
          ship,
          input,
          state,
        }
      );

      shipInputs.set(
        ship,
        input
      );

      if (
        current.fire &&
        !state.previousFire
      ) {
        const bulletsBefore =
          new Set(
            this.world.ofKind(
              "bullet"
            )
          );

        ship.fire();

        const bulletsAfter =
          this.world.ofKind(
            "bullet"
          );

        let firedBullet:
          Entity | null = null;

        for (
          const bullet of bulletsAfter
        ) {
          if (
            !bulletsBefore.has(
              bullet
            )
          ) {
            firedBullet =
              bullet;

            break;
          }
        }

        if (
          firedBullet &&
          current.shotId !== null &&
          current.shotId !== undefined
        ) {
          Reflect.set(
            firedBullet,
            "id",
            String(
              current.shotId
            )
          );
        }
      }

      state.previousFire =
        current.fire;
    }

    for (
      const [botId, ai]
      of this.bots
    ) {
      let ship =
        this.botShips.get(
          botId
        );

      if (
        !ship ||
        !ship.alive
      ) {
        const newShip =
          this.createBotShip(
            botId
          );

        if (!newShip) {
          continue;
        }

        ship = newShip;
      }

      const botInput =
        ai.update(
          dt
        );

      const input: InputHandler = {
        isDown: (
          action: string
        ): boolean => {
          if (
            action ===
            "ArrowLeft"
          ) {
            return botInput.left;
          }

          if (
            action ===
            "ArrowRight"
          ) {
            return botInput.right;
          }

          if (
            action ===
            "ArrowUp"
          ) {
            return botInput.thrust;
          }

          if (
            action ===
            "Space"
          ) {
            return botInput.fire;
          }

          return false;
        },
      };

      shipInputs.set(
        ship,
        input
      );

      if (
        botInput.fire
      ) {
        ship.fire();
      }
    }

    this.world.step(
      dt,
      {
        width:
          this.world.width,

        height:
          this.world.height,

        input: {
          isDown: () => false,
        },

        inputForEntity:
          (entity) => {
            if (
              entity.kind === "ship" &&
              entity instanceof Ship
            ) {
              return (
                shipInputs.get(entity) || {
                  isDown: () => false,
                }
              );
            }

            return {
              isDown: () => false,
            };
          },
      }
    );

    for (
      const [playerId]
      of playerInputs
    ) {
      const ship =
        this.ships.get(
          playerId
        );

      if (
        !ship ||
        !ship.alive
      ) {
        const newShip =
          this.findFreeShip();

        if (newShip) {
          this.ships.set(
            playerId,
            newShip
          );
        }

        continue;
      }

      this.wrapShip(
        ship
      );
    }

    for (
      const ship of
      this.botShips.values()
    ) {
      if (
        ship.alive
      ) {
        this.wrapShip(
          ship
        );
      }
    }

    this.broadcastSnapshots();

    const tickDuration =
      performance.now() -
      tickStart;

    if (
      this.tickDurations.length <
      this.tickSamplesLimit
    ) {
      this.tickDurations.push(
        tickDuration
      );
    }
  }

  getTickStats(): {
    samples: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const sorted =
      [...this.tickDurations].sort(
        (a, b) => a - b
      );

    if (
      sorted.length === 0
    ) {
      return {
        samples: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const percentile = (
      value: number
    ): number => {
      const index =
        Math.min(
          sorted.length - 1,
          Math.max(
            0,
            Math.ceil(
              (value / 100) *
                sorted.length
            ) - 1
          )
        );

      return (
        sorted[index] ?? 0
      );
    };

    return {
      samples:
        sorted.length,

      p50:
        percentile(50),

      p95:
        percentile(95),

      p99:
        percentile(99)
    };
  }

  createBotShip(
    botId: PlayerId
  ): Ship | null {
    const spawnPositions = [
      {
        x: 200,
        y: 150,
      },
      {
        x: 600,
        y: 150,
      },
      {
        x: 200,
        y: 400,
      },
      {
        x: 600,
        y: 400,
      },
      {
        x: 100,
        y: 300,
      },
      {
        x: 700,
        y: 300,
      },
      {
        x: 350,
        y: 100,
      },
      {
        x: 450,
        y: 400,
      },
    ];

    const botIndex =
      Number(
        botId.replace(
          "bot-",
          ""
        )
      ) - 1;

    const position =
      spawnPositions[
        Math.max(
          0,
          botIndex
        ) %
        spawnPositions.length
      ];

    if (!position) {
      return null;
    }

    const ship =
      new Ship(
        position.x,
        position.y
      );

    this.world.spawn(
      ship
    );

    ship.restoreHp();

    this.botShips.set(
      botId,
      ship
    );

    this.bots.set(
      botId,
      new BotAI(
        ship,
        this.world
      )
    );

    return ship;
  }

  wrapShip(
    ship: Ship
  ): void {
    if (
      !ship.alive
    ) {
      return;
    }

    const margin =
      210;

    if (
      ship.pos.x < -margin
    ) {
      ship.pos = new Vector2(
        this.world.width + margin,
        ship.pos.y
      );
    }

    if (
      ship.pos.x >
      this.world.width +
      margin
    ) {
      ship.pos = new Vector2(
        -margin,
        ship.pos.y
      );
    }

    if (
      ship.pos.y < -margin
    ) {
      ship.pos = new Vector2(
        ship.pos.x,
        this.world.height + margin
      );
    }

    if (
      ship.pos.y >
      this.world.height +
      margin
    ) {
      ship.pos = new Vector2(
        ship.pos.x,
        -margin
      );
    }
  }

  createSnapshot(
    playerId: PlayerId
  ) {
    const inputState =
      this.inputs.get(
        playerId
      );

    const playerShip =
      this.ships.get(
        playerId
      );

    return {
      version:
        PROTOCOL_VERSION,

      type:
        MESSAGE_TYPES.SNAPSHOT,

      roomId:
        this.roomId,

      playerId:
        playerId,

      playerShipId:
        playerShip?.id ?? null,

      lastProcessedSeq:
        inputState?.seq ?? -1,

      world:
        this.serializeWorld(),
    };
  }

  serializeWorld() {
    const entities: Array<{
      id: number;
      kind: string;
      x: number;
      y: number;
      angle: number;
      vx: number;
      vy: number;
      radius: number;
      hp: number | undefined;
      thrust: number | undefined;
      type: string | undefined;
      ttl: number | undefined;
    }> = [];

    for (
      const entity of
      this.world
    ) {
      if (
        !entity.alive
      ) {
        continue;
      }

      const hp =
        getNumberProperty(
          entity,
          "hp"
        );

      const thrust =
        getNumberProperty(
          entity,
          "thrust"
        );

      const type =
        getStringProperty(
          entity,
          "type"
        );

      const ttl =
        getNumberProperty(
          entity,
          "ttl"
        );

      entities.push({
        id:
          entity.id,

        kind:
          entity.kind,

        x:
          entity.pos.x,

        y:
          entity.pos.y,

        angle:
          entity.angle,

        vx:
          entity.vel.x,

        vy:
          entity.vel.y,

        radius:
          entity.radius,

        hp,

        thrust,

        type,

        ttl,
      });
    }

    return {
      width:
        this.world.width,

      height:
        this.world.height,

      score:
        this.world.score,

      entities,
    };
  }

  broadcastSnapshots(): void {
    for (
      const [playerId, client]
      of this.clients
    ) {
      client.send(
        this.createSnapshot(
          playerId
        ),
        false
      );
    }
  }
}

function getNumberProperty(
  entity: Entity,
  property: string
): number | undefined {
  const value =
    Reflect.get(
      entity,
      property
    );

  return typeof value === "number"
    ? value
    : undefined;
}

function getStringProperty(
  entity: Entity,
  property: string
): string | undefined {
  const value =
    Reflect.get(
      entity,
      property
    );

  return typeof value === "string"
    ? value
    : undefined;
}
