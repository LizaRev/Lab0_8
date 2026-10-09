import { Entity } from "./entity.js";

export class Bullet extends Entity {
  ttl: number;
  homing: unknown;
  owner: Entity | null;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    owner: Entity | null = null
  ) {
    super(x, y, vx, vy, 0, 4, "bullet");

    this.ttl = 2;
    this.homing = null;
    this.owner = owner;
  }

  update(dt: number, _inputs?: unknown): void {
    if (this.homing) {
      const homing = this.homing as {
        update: (entity: Entity, dt: number) => void;
      };

      homing.update(this, dt);
    }

    super.update(dt);

    this.ttl -= dt;

    if (this.ttl <= 0) {
      this.alive = false;
    }
  }
}

