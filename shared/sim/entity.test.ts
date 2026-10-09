import { describe, expect, test } from "vitest";
import { Entity } from "./entity.js";

describe("Entity movement", () => {
  test("updates position using velocity and delta time", () => {
    const entity = new Entity(10, 20, 5, -2);

    entity.update(2);

    expect(entity.pos.x).toBe(20);
    expect(entity.pos.y).toBe(16);
  });

  test("does not change position when velocity is zero", () => {
    const entity = new Entity(10, 20, 0, 0);

    entity.update(5);

    expect(entity.pos.x).toBe(10);
    expect(entity.pos.y).toBe(20);
  });

  test("handles fractional delta time", () => {
    const entity = new Entity(0, 0, 10, 4);

    entity.update(0.5);

    expect(entity.pos.x).toBe(5);
    expect(entity.pos.y).toBe(2);
  });

  test("handles negative velocity", () => {
    const entity = new Entity(10, 8, -3, -4);

    entity.update(2);

    expect(entity.pos.x).toBe(4);
    expect(entity.pos.y).toBe(0);
  });
});

