import type { Entity } from "./entity.js";

export function getCollisions(world: Iterable<Entity>): Array<[Entity, Entity]> {
  const collisions: Array<[Entity, Entity]> = [];
  const entities = [...world];

  for (let i = 0; i < entities.length; i++) {
    const a = entities[i];

    if (!a || !a.alive) {
      continue;
    }

    for (let j = i + 1; j < entities.length; j++) {
      const b = entities[j];

      if (!b || !b.alive) {
        continue;
      }

      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = a.radius + b.radius;

      if (distance < minDistance) {
        collisions.push([a, b]);
      }
    }
  }

  return collisions;
}

