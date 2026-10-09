import { describe, expect, it } from "vitest";

import { Bullet } from "./bullet.js";
import { Ship } from "./ship.js";

describe("Bullet coverage", () => {
  it("moves and decreases ttl", () => {
    const ship = new Ship(100, 100);
    const bullet = new Bullet(0, 0, 100, 50, ship);

    bullet.update(0.5);

    expect(bullet.pos.x).toBe(50);
    expect(bullet.pos.y).toBe(25);
    expect(bullet.ttl).toBe(1.5);
    expect(bullet.alive).toBe(true);
  });

  it("dies when ttl reaches zero", () => {
    const bullet = new Bullet(0, 0, 100, 50);

    bullet.update(2);

    expect(bullet.ttl).toBe(0);
    expect(bullet.alive).toBe(false);
  });

  it("dies when ttl becomes negative", () => {
    const bullet = new Bullet(0, 0, 100, 50);

    bullet.update(3);

    expect(bullet.ttl).toBe(-1);
    expect(bullet.alive).toBe(false);
  });
});

