import { Entity } from "./entity.js";
import { Vector2 } from "./vector.js";
import { Bullet } from "./bullet.js";

type ShipInput = {
  input: {
    isDown(key: string): boolean;
  };
};

export class Ship extends Entity {
  #hp = 3;

  thrust: number;
  shield: boolean;

  constructor(x: number, y: number) {
    super(x, y, 0, 0, 0, 20, "ship");
    this.thrust = 0;
    this.shield = false;
  }

  get hp(): number {
    return this.#hp;
  }

  update(dt: number, inputs: ShipInput): void {
    const input = inputs.input;
    const rotationSpeed = 3;
    const thrustPower = 200;
    const drag = 0.99;
    const maxSpeed = 400;

    if (input.isDown("ArrowLeft")) {
      this.angle -= rotationSpeed * dt;
    }

    if (input.isDown("ArrowRight")) {
      this.angle += rotationSpeed * dt;
    }

    this.thrust = input.isDown("ArrowUp") ? 1 : 0;

    const velocity = this.vel;

    if (this.thrust) {
      const angle = this.angle - Math.PI / 2;
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);

      velocity.x += directionX * thrustPower * dt;
      velocity.y += directionY * thrustPower * dt;
    }

    const dragFactor = Math.pow(drag, dt * 60);

    velocity.x *= dragFactor;
    velocity.y *= dragFactor;

    const speed = Math.hypot(velocity.x, velocity.y);

    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      velocity.x *= scale;
      velocity.y *= scale;
    }

    super.update(dt);
  }

  takeDamage(amount: number): void {
    if (this.shield) {
      this.shield = false;
      return;
    }

    this.#hp -= amount;

    if (this.#hp <= 0) {
      this.#hp = 0;
      this.alive = false;
    }
  }

  restoreHp(): void {
    this.#hp = 3;
  }

  fire(): void {
    if (!this.world) {
      return;
    }

    const direction = Vector2.fromAngle(this.angle - Math.PI / 2);
    const bulletX = this.pos.x + direction.x * (this.radius + 4);
    const bulletY = this.pos.y + direction.y * (this.radius + 4);
    const bulletSpeed = 500;
    const bulletVx = this.vel.x + direction.x * bulletSpeed;
    const bulletVy = this.vel.y + direction.y * bulletSpeed;

    const bullet = new Bullet(
      bulletX,
      bulletY,
      bulletVx,
      bulletVy,
      this
    );

    this.world.spawn(bullet);

    this.world.dispatchEvent(
      new CustomEvent("fired", {
        detail: {
          ship: this,
          bullet
        }
      })
    );
  }
}

