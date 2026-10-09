import { Vector2 } from "./vector.js";
import type { World } from "./world.js";

export class Entity {
  static #nextId = 1;

  id: number;
  pos: Vector2;
  vel: Vector2;
  angle: number;
  radius: number;
  alive: boolean;
  kind: string;
  world: World | null;

  constructor(
    x = 0,
    y = 0,
    vx = 0,
    vy = 0,
    angle = 0,
    radius = 10,
    kind = "entity"
  ) {
    this.id = Entity.#nextId++;
    this.pos = new Vector2(x, y);
    this.vel = new Vector2(vx, vy);
    this.angle = angle;
    this.radius = radius;
    this.alive = true;
    this.kind = kind;
    this.world = null;
  }

  update(dt: number, _inputs?: unknown): void {
    this.pos = this.pos.add(this.vel.scale(dt));
  }
}

