import { describe, expect, test } from "vitest";
import { Entity } from "./entity.js";
import { getCollisions } from "./collision.js";

describe("collision extra cases", () => {
  test("detects collision when entities overlap diagonally", () => {
    const first = new Entity(0, 0, 0, 0, 0, 10);
    const second = new Entity(6, 8, 0, 0, 0, 5);
    const collisions = getCollisions([first, second]);

    expect(collisions).toHaveLength(1);
  });

  test("does not detect collision when entities are farther than their radii", () => {
    const first = new Entity(0, 0, 0, 0, 0, 10);
    const second = new Entity(16, 0, 0, 0, 0, 5);
    const collisions = getCollisions([first, second]);

    expect(collisions).toHaveLength(0);
  });

  test("does not detect collisions for an empty world", () => {
    const collisions = getCollisions([]);

    expect(collisions).toHaveLength(0);
  });
});

