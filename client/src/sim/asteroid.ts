import { Entity } from "./entity.js";
import { Vector2 } from "./vector.js";
import { Bullet } from "./bullet.js";
import type { World } from "./world.js";

type AsteroidInputs = {
  width: number;
  height: number;
};

export class Asteroid extends Entity {
  hp: number;
  homing: unknown;
  shootTimer: number;

  declare world: World | null;

  constructor(x: number, y: number, vx: number, vy: number, radius = 30) {
    super(x, y, vx, vy, 0, radius, "asteroid");

    this.hp = 3;
    this.homing = null;
    this.shootTimer = 3;
  }

  update(dt: number, inputs?: AsteroidInputs): void {
    if (this.homing) {
      const homing = this.homing as {
        update: (entity: Entity, dt: number) => void;
      };

      homing.update(this, dt);
    }

    super.update(dt);

    if (!inputs) {
      return;
    }

    const width = inputs.width;
    const height = inputs.height;

    if (this.pos.x - this.radius < 0) {
      this.pos = new Vector2(this.radius, this.pos.y);
      this.vel = new Vector2(Math.abs(this.vel.x), this.vel.y);
    }

    if (this.pos.x + this.radius > width) {
      this.pos = new Vector2(width - this.radius, this.pos.y);
      this.vel = new Vector2(-Math.abs(this.vel.x), this.vel.y);
    }

    if (this.pos.y - this.radius < 0) {
      this.pos = new Vector2(this.pos.x, this.radius);
      this.vel = new Vector2(this.vel.x, Math.abs(this.vel.y));
    }

    if (this.pos.y + this.radius > height) {
      this.pos = new Vector2(this.pos.x, height - this.radius);
      this.vel = new Vector2(this.vel.x, -Math.abs(this.vel.y));
    }

    this.shootTimer -= dt;

    if (this.shootTimer <= 0) {
      this.shootAtShip();
      this.shootTimer = 3;
    }
  }

  shootAtShip(): void {
    if (!this.world) {
      return;
    }

    let target: Entity | null = null;

    for (const ship of this.world.ofKind("ship")) {
      target = ship;
      break;
    }

    if (!target) {
      return;
    }

    const direction = new Vector2(
      target.pos.x - this.pos.x,
      target.pos.y - this.pos.y
    ).normalize();

    const bulletSpeed = 500;
    const bulletX = this.pos.x + direction.x * (this.radius + 5);
    const bulletY = this.pos.y + direction.y * (this.radius + 5);
    const bulletVx = direction.x * bulletSpeed;
    const bulletVy = direction.y * bulletSpeed;

    const bullet = new Bullet(bulletX, bulletY, bulletVx, bulletVy, this);

    this.world.spawn(bullet);
  }

  takeDamage(amount: number): void {
    this.hp -= amount;

    if (this.hp <= 0) {
      this.alive = false;
    }
  }
}

