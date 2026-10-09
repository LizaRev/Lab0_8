import { describe, expect, it } from "vitest";

import { Asteroid } from "./asteroid.js";
import { Ship } from "./ship.js";
import { World } from "./world.js";
import { Bullet } from "./bullet.js";

describe("Asteroid coverage", () => {
  it("bounces from the left boundary", () => {
    const asteroid = new Asteroid(10, 100, -50, 20, 30);

    asteroid.update(1, {
      width: 800,
      height: 500,
    });

    expect(asteroid.pos.x).toBe(30);
    expect(asteroid.vel.x).toBe(50);
  });

  it("bounces from the right boundary", () => {
    const asteroid = new Asteroid(790, 100, 50, 20, 30);

    asteroid.update(1, {
      width: 800,
      height: 500,
    });

    expect(asteroid.pos.x).toBe(770);
    expect(asteroid.vel.x).toBe(-50);
  });

  it("bounces from the top boundary", () => {
    const asteroid = new Asteroid(100, 10, 20, -50, 30);

    asteroid.update(1, {
      width: 800,
      height: 500,
    });

    expect(asteroid.pos.y).toBe(30);
    expect(asteroid.vel.y).toBe(50);
  });

  it("bounces from the bottom boundary", () => {
    const asteroid = new Asteroid(100, 490, 20, 50, 30);

    asteroid.update(1, {
      width: 800,
      height: 500,
    });

    expect(asteroid.pos.y).toBe(470);
    expect(asteroid.vel.y).toBe(-50);
  });

  it("does not shoot before the shoot timer expires", () => {
    const world = new World();
    const asteroid = new Asteroid(100, 100, 0, 0, 30);

    world.spawn(asteroid);
    asteroid.update(1, { width: 800, height: 500 });

    expect([...world.ofKind("bullet")]).toHaveLength(0);
    expect(asteroid.shootTimer).toBe(2);
  });

  it("shoots after the shoot timer expires when a ship exists", () => {
    const world = new World();
    const asteroid = new Asteroid(100, 100, 0, 0, 30);
    const ship = new Ship(300, 100);

    world.spawn(asteroid);
    world.spawn(ship);
    asteroid.update(3, { width: 800, height: 500 });

    const bullets = [...world.ofKind("bullet")];

    expect(bullets).toHaveLength(1);

    const bullet = bullets[0];

    expect(bullet).toBeInstanceOf(Bullet);
    expect(asteroid.shootTimer).toBe(3);
  });

  it("does not shoot without a world", () => {
    const asteroid = new Asteroid(100, 100, 0, 0, 30);

    asteroid.shootAtShip();

    expect(asteroid.world).toBeNull();
  });

  it("does not shoot when there is no ship", () => {
    const world = new World();
    const asteroid = new Asteroid(100, 100, 0, 0, 30);

    world.spawn(asteroid);
    asteroid.shootAtShip();

    expect([...world.ofKind("bullet")]).toHaveLength(0);
  });

  it("shoots directly toward the first ship", () => {
    const world = new World();
    const asteroid = new Asteroid(100, 100, 0, 0, 30);
    const ship = new Ship(200, 100);

    world.spawn(asteroid);
    world.spawn(ship);
    asteroid.shootAtShip();

    const bullets = [...world.ofKind("bullet")];

    expect(bullets).toHaveLength(1);

    const bullet = bullets[0];

    expect(bullet?.vel.x).toBe(500);
    expect(bullet?.vel.y).toBe(0);
  });

  it("takes damage without being destroyed", () => {
    const asteroid = new Asteroid(100, 100, 0, 0, 30);

    asteroid.takeDamage(1);

    expect(asteroid.hp).toBe(2);
    expect(asteroid.alive).toBe(true);
  });

  it("is destroyed when damage reaches zero hp", () => {
    const asteroid = new Asteroid(100, 100, 0, 0, 30);

    asteroid.takeDamage(3);

    expect(asteroid.hp).toBe(0);
    expect(asteroid.alive).toBe(false);
  });
});

