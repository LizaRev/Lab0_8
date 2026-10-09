import { getCollisions } from "./collision.js";
import { createExplosion } from "./explosion.js";
import { Ship } from "./ship.js";
import { Asteroid } from "./asteroid.js";
import { Bullet } from "./bullet.js";
import { Pickup } from "./pickup.js";
import { Entity } from "./entity.js";

export interface WorldInputs {
  width: number;
  height: number;
  input: {
    isDown(key: string): boolean;
  };
}

export class World extends EventTarget {
  #entities = new Map<number, Entity>();

  score: number;
  width: number;
  height: number;
  respawnTimer: number;
  asteroidRespawnTimers: number[];

  constructor() {
    super();

    this.score = 0;
    this.width = 800;
    this.height = 500;
    this.respawnTimer = 0;
    this.asteroidRespawnTimers = [];
  }

  spawn(entity: Entity): Entity {
    this.#entities.set(entity.id, entity);
    entity.world = this;

    return entity;
  }

  despawn(id: number): void {
    const entity = this.#entities.get(id);

    if (entity) {
      entity.alive = false;
    }
  }

  get(id: number): Entity | undefined {
    return this.#entities.get(id);
  }

  [Symbol.iterator](): Iterator<Entity> {
    return this.#entities.values();
  }

  *ofKind(kind: string): Generator<Entity> {
    for (const entity of this.#entities.values()) {
      if (entity.kind === kind && entity.alive) {
        yield entity;
      }
    }
  }

  step(dt: number, inputs: WorldInputs): void {
    this.width = inputs.width;
    this.height = inputs.height;

    for (const entity of this.#entities.values()) {
      if (entity.alive) {
        entity.update(dt, inputs);
      }
    }

    const collisions = getCollisions(this);

    for (const [a, b] of collisions) {
      this.handleCollision(a, b);
    }

    for (const [id, entity] of this.#entities) {
      if (!entity.alive) {
        this.#entities.delete(id);
      }
    }

    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;

      if (this.respawnTimer <= 0) {
        const newShip = this.createSafeShip();

        this.spawn(newShip);
        this.respawnTimer = 0;
      }
    }

    for (let i = this.asteroidRespawnTimers.length - 1; i >= 0; i--) {
      const timer = this.asteroidRespawnTimers[i];

      if (timer === undefined) {
        continue;
      }

      const newTimer = timer - dt;
      this.asteroidRespawnTimers[i] = newTimer;

      if (newTimer <= 0) {
        const newAsteroid = this.createAsteroid();

        this.spawn(newAsteroid);
        this.asteroidRespawnTimers.splice(i, 1);
      }
    }
  }

  handleCollision(a: Entity, b: Entity): void {
    if (
      a instanceof Bullet &&
      b instanceof Ship &&
      a.owner &&
      a.owner.kind === "asteroid"
    ) {
      b.takeDamage(1);
      a.alive = false;

      this.dispatchEvent(new CustomEvent("hit"));

      if (!b.alive) {
        this.destroyShip(b);
      }
    }

    if (
      a instanceof Ship &&
      b instanceof Bullet &&
      b.owner &&
      b.owner.kind === "asteroid"
    ) {
      a.takeDamage(1);
      b.alive = false;

      this.dispatchEvent(new CustomEvent("hit"));

      if (!a.alive) {
        this.destroyShip(a);
      }
    }

    if (
      a instanceof Bullet &&
      a.alive &&
      b instanceof Asteroid &&
      a.owner &&
      a.owner.kind === "ship"
    ) {
      b.takeDamage(1);
      a.alive = false;

      this.dispatchEvent(new CustomEvent("hit"));

      if (!b.alive) {
        this.score += 100;

        this.dispatchEvent(
          new CustomEvent("scoreChanged", {
            detail: {
              score: this.score,
            },
          })
        );

        createExplosion(this, b.pos.x, b.pos.y);
        this.dispatchEvent(new CustomEvent("exploded"));
        this.asteroidRespawnTimers.push(2);
      }
    }

    if (
      a instanceof Asteroid &&
      b instanceof Bullet &&
      b.alive &&
      b.owner &&
      b.owner.kind === "ship"
    ) {
      a.takeDamage(1);
      b.alive = false;

      this.dispatchEvent(new CustomEvent("hit"));

      if (!a.alive) {
        this.score += 100;

        this.dispatchEvent(
          new CustomEvent("scoreChanged", {
            detail: {
              score: this.score,
            },
          })
        );

        createExplosion(this, a.pos.x, a.pos.y);
        this.dispatchEvent(new CustomEvent("exploded"));
        this.asteroidRespawnTimers.push(2);
      }
    }

    if (a instanceof Ship && b instanceof Pickup) {
      this.collectPickup(a, b);
    }

    if (a instanceof Pickup && b instanceof Ship) {
      this.collectPickup(b, a);
    }
  }

  collectPickup(ship: Ship, pickup: Pickup): void {
    if (!ship.alive || !pickup.alive) {
      return;
    }

    if (pickup.type === "shield") {
      ship.restoreHp();
      ship.shield = true;
    }

    pickup.alive = false;
  }

  destroyShip(ship: Ship): void {
    createExplosion(this, ship.pos.x, ship.pos.y);
    ship.alive = false;

    this.dispatchEvent(new CustomEvent("exploded"));

    this.respawnTimer = 2;
  }

  createSafeShip(): Ship {
    const shipRadius = 20;

    for (let attempt = 0; attempt < 100; attempt++) {
      const x = shipRadius + Math.random() * (this.width - shipRadius * 2);
      const y = shipRadius + Math.random() * (this.height - shipRadius * 2);

      let safe = true;

      for (const asteroid of this.ofKind("asteroid")) {
        if (!(asteroid instanceof Asteroid)) {
          continue;
        }

        const dx = asteroid.pos.x - x;
        const dy = asteroid.pos.y - y;
        const distance = Math.hypot(dx, dy);

        if (distance < asteroid.radius + shipRadius + 30) {
          safe = false;
          break;
        }
      }

      if (safe) {
        return new Ship(x, y);
      }
    }

    return new Ship(this.width / 2, this.height / 2);
  }

  createAsteroid(): Asteroid {
    const radius = 30;
    const x = radius + Math.random() * (this.width - radius * 2);
    const y = radius + Math.random() * (this.height - radius * 2);
    const vx = -100 + Math.random() * 200;
    const vy = -100 + Math.random() * 200;

    return new Asteroid(x, y, vx, vy, radius);
  }
}

