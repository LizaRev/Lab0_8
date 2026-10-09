import { Asteroid } from "../../shared/sim/asteroid.js";
import { Ship } from "../../shared/sim/ship.js";
import { World } from "../../shared/sim/world.js";

export type BotInput = {
  left: boolean;
  right: boolean;
  thrust: boolean;
  fire: boolean;
};

export class BotAI {
  private fireCooldown = 0;

  constructor(
    private readonly ship: Ship,
    private readonly world: World
  ) {}

  update(dt: number): BotInput {
    this.fireCooldown -= dt;

    const asteroid = this.findNearestAsteroid();
    const dangerousShip = this.findDangerousShip();

    if (dangerousShip) {
      return this.evadeShip(dangerousShip);
    }

    if (!asteroid) {
      return {
        left: true,
        right: false,
        thrust: true,
        fire: false,
      };
    }

    return this.attackAsteroid(asteroid);
  }

  private attackAsteroid(asteroid: Asteroid): BotInput {
    const dx = asteroid.pos.x - this.ship.pos.x;
    const dy = asteroid.pos.y - this.ship.pos.y;
    const targetAngle = Math.atan2(dy, dx) + Math.PI / 2;

    let angleDifference = targetAngle - this.ship.angle;

    while (angleDifference > Math.PI) {
      angleDifference -= Math.PI * 2;
    }

    while (angleDifference < -Math.PI) {
      angleDifference += Math.PI * 2;
    }

    const left = angleDifference < -0.1;
    const right = angleDifference > 0.1;
    const fire =
      Math.abs(angleDifference) < 0.2 &&
      this.fireCooldown <= 0;

    if (fire) {
      this.fireCooldown = 0.5;
    }

    return {
      left,
      right,
      thrust: true,
      fire,
    };
  }

  private evadeShip(dangerousShip: Ship): BotInput {
    const dx = dangerousShip.pos.x - this.ship.pos.x;
    const dy = dangerousShip.pos.y - this.ship.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return {
        left: true,
        right: false,
        thrust: true,
        fire: false,
      };
    }

    const dangerousAngle = Math.atan2(dy, dx) + Math.PI / 2;

    let angleDifference = dangerousAngle - this.ship.angle;

    while (angleDifference > Math.PI) {
      angleDifference -= Math.PI * 2;
    }

    while (angleDifference < -Math.PI) {
      angleDifference += Math.PI * 2;
    }

    const left = angleDifference >= 0;
    const right = angleDifference < 0;

    return {
      left,
      right,
      thrust: true,
      fire: false,
    };
  }

  private findNearestAsteroid(): Asteroid | null {
    let closest: Asteroid | null = null;
    let closestDistance = Infinity;

    for (const entity of this.world.ofKind("asteroid")) {
      if (!(entity instanceof Asteroid) || !entity.alive) {
        continue;
      }

      const dx = entity.pos.x - this.ship.pos.x;
      const dy = entity.pos.y - this.ship.pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance) {
        closest = entity;
        closestDistance = distance;
      }
    }

    return closest;
  }

  private findDangerousShip(): Ship | null {
    const SAFE_DISTANCE = 100;

    let closest: Ship | null = null;
    let closestDistance = SAFE_DISTANCE;

    for (const entity of this.world.ofKind("ship")) {
      if (
        !(entity instanceof Ship) ||
        entity === this.ship ||
        !entity.alive
      ) {
        continue;
      }

      const dx = entity.pos.x - this.ship.pos.x;
      const dy = entity.pos.y - this.ship.pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance) {
        closest = entity;
        closestDistance = distance;
      }
    }

    return closest;
  }
}

