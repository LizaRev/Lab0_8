import { describe, expect, test } from "vitest";
import { getCollisions } from "./collision.js";
import { Entity } from "./entity.js";

describe("getCollisions", () => {
  test("detects overlapping entities", () => {
    const a = new Entity(0, 0, 0, 0, 0, 10, "ship");
    const b = new Entity(15, 0, 0, 0, 0, 10, "ship");
    const collisions = getCollisions([a, b]);

    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toEqual([a, b]);
  });

  test("does not detect touching entities", () => {
    const a = new Entity(0, 0, 0, 0, 0, 10, "ship");
    const b = new Entity(20, 0, 0, 0, 0, 10, "ship");
    const collisions = getCollisions([a, b]);

    expect(collisions).toHaveLength(0);
  });

  test("does not detect entities that are apart", () => {
    const a = new Entity(0, 0, 0, 0, 0, 10, "ship");
    const b = new Entity(30, 0, 0, 0, 0, 10, "ship");
    const collisions = getCollisions([a, b]);

    expect(collisions).toHaveLength(0);
  });

  test("ignores dead entities", () => {
    const a = new Entity(0, 0, 0, 0, 0, 10, "ship");
    const b = new Entity(5, 0, 0, 0, 0, 10, "ship");

    a.alive = false;

    const collisions = getCollisions([a, b]);

    expect(collisions).toHaveLength(0);
  });

  test("detects a fast bullet passing through an entity", () => {
    const bullet = new Entity(0, 0, 100, 0, 0, 2, "bullet");
    const target = new Entity(50, 0, 0, 0, 0, 10, "ship");

    bullet.update(1);

    const collisions = getCollisions([bullet, target]);

    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toEqual([bullet, target]);
  });
});

