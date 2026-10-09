import { Entity } from "./entity.js";
import { Vector2 } from "./vector.js";  
import { Bullet } from "./bullet.js";

type AsteroidInput = {
  width: number;
  height: number;
};

export class Asteroid extends Entity {
  hp: number;
  homing: null;
  shootTimer: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number = 30
  ) {
    super(x, y, vx, vy, 0, radius, "asteroid");

    this.hp = 3;
    this.homing = null;
    this.shootTimer = 3;
  }

  update(dt: number, inputs: AsteroidInput): void {
    super.update(dt);

    const width = inputs.width;
    const height = inputs.height;

    if (this.pos.x - this.radius < 0) {
      this.pos.x = this.radius;
      this.vel.x = Math.abs(this.vel.x);
    }

    if (this.pos.x + this.radius > width) {
      this.pos.x = width - this.radius;
      this.vel.x = -Math.abs(this.vel.x);
    }

    if (this.pos.y - this.radius < 0) {
      this.pos.y = this.radius;
      this.vel.y = Math.abs(this.vel.y);
    }

    if (this.pos.y + this.radius > height) {
      this.pos.y = height - this.radius;
      this.vel.y = -Math.abs(this.vel.y);
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

    let target: Entity | undefined;

    for (const ship of this.world.ofKind("ship")) {
      target = ship;
      break;
    }

    if (!target) {
      return;
    }

    const dx = target.pos.x - this.pos.x;
    const dy = target.pos.y - this.pos.y;
    const length = Math.hypot(dx, dy);

    if (length === 0) {
      return;
    }

    const directionX = dx / length;
    const directionY = dy / length;
    const bulletSpeed = 500;

    const bulletX = this.pos.x + directionX * (this.radius + 5);
    const bulletY = this.pos.y + directionY * (this.radius + 5);
    const bulletVx = directionX * bulletSpeed;
    const bulletVy = directionY * bulletSpeed;

    const bullet = new Bullet(
      bulletX,
      bulletY,
      bulletVx,
      bulletVy,
      this
    );

    this.world.spawn(bullet);
  }

  takeDamage(amount: number): void {
    this.hp -= amount;

    if (this.hp <= 0) {
      this.alive = false;
    }
  }
}

