import { describe, expect, test } from "vitest";

import { Entity } from "./entity.js";

describe("integration", () => {
  test("moves an entity using velocity and delta time", () => {
    const entity = new Entity(10, 20, 5, -4);

    entity.update(2);

    expect(entity.pos.x).toBe(20);
    expect(entity.pos.y).toBe(12);
  });

  test("does not move an entity with zero velocity", () => {
    const entity = new Entity(10, 20, 0, 0);

    entity.update(5);

    expect(entity.pos.x).toBe(10);
    expect(entity.pos.y).toBe(20);
  });

  test("uses a fractional delta time correctly", () => {
    const entity = new Entity(100, 50, 20, -10);

    entity.update(0.25);

    expect(entity.pos.x).toBe(105);
    expect(entity.pos.y).toBe(47.5);
  });

  test("stores the previous position before integration", () => {
    const entity = new Entity(10, 20, 4, 6);

    entity.update(1);

    expect(entity.previousPos.x).toBe(10);
    expect(entity.previousPos.y).toBe(20);
    expect(entity.pos.x).toBe(14);
    expect(entity.pos.y).toBe(26);
  });
});

