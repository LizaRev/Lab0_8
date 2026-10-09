import { describe, expect, test } from "vitest";

import { World } from "./world.js";

describe("World extra cases", () => {
  test("starts with the default arena size", () => {
    const world = new World();

    expect(world.width).toBe(800);
    expect(world.height).toBe(500);
  });

  test("step updates the arena size from input", () => {
    const world = new World();

    world.step(1 / 60, {
      width: 1200,
      height: 700,
    });

    expect(world.width).toBe(1200);
    expect(world.height).toBe(700);
  });

  test("step with no entities does not change score", () => {
    const world = new World();

    world.step(1 / 60, {
      width: 800,
      height: 500,
    });

    expect(world.score).toBe(0);
  });
});

