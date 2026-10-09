import { Entity } from "./entity.js";

function distanceToSegment(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number {
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      (
        (pointX - startX) * dx +
        (pointY - startY) * dy
      ) / lengthSquared
    )
  );

  const closestX = startX + t * dx;
  const closestY = startY + t * dy;

  return Math.hypot(
    pointX - closestX,
    pointY - closestY
  );
}

function bulletHitEntity(
  bullet: Entity,
  target: Entity
): boolean {
  const distance = distanceToSegment(
    target.pos.x,
    target.pos.y,
    bullet.previousPos.x,
    bullet.previousPos.y,
    bullet.pos.x,
    bullet.pos.y
  );

  return distance < bullet.radius + target.radius;
}

export function getCollisions(
  world: Iterable<Entity>
): Array<[Entity, Entity]> {
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

      if (a.kind === "bullet") {
        if (bulletHitEntity(a, b)) {
          collisions.push([a, b]);
        }

        continue;
      }

      if (b.kind === "bullet") {
        if (bulletHitEntity(b, a)) {
          collisions.push([a, b]);
        }

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

