import { describe, expect, it } from "vitest";

import { World } from "./world.js";
import { Entity } from "./entity.js";
import { Ship } from "./ship.js";
import { Asteroid } from "./asteroid.js";
import { Bullet } from "./bullet.js";
import { Pickup } from "./pickup.js";

describe("World coverage", () => {
  it("spawns, gets and despawns an entity", () => {
    const world = new World();
    const entity = new Entity(10, 20);

    world.spawn(entity);

    expect(world.get(entity.id)).toBe(entity);

    world.despawn(entity.id);

    expect(entity.alive).toBe(false);
  });

  it("iterates entities and filters them by kind", () => {
    const world = new World();
    const ship = new Ship(100, 100);
    const asteroid = new Asteroid(200, 200, 0, 0, 30);
    const deadShip = new Ship(300, 300);

    world.spawn(ship);
    world.spawn(asteroid);
    world.spawn(deadShip);

    deadShip.alive = false;

    expect([...world]).toHaveLength(3);
    expect([...world.ofKind("ship")]).toEqual([ship]);
    expect([...world.ofKind("asteroid")]).toEqual([asteroid]);
  });

  it("uses inputForEntity when stepping the world", () => {
    const world = new World();
    const entity = new Entity(0, 0, 10, 0);

    world.spawn(entity);

    let called = false;

    world.step(1, {
      width: 1000,
      height: 600,
      inputForEntity: () => {
        called = true;
        return {};
      },
    });

    expect(called).toBe(true);
    expect(entity.pos.x).toBe(10);
    expect(entity.pos.y).toBe(0);
    expect(world.width).toBe(1000);
    expect(world.height).toBe(600);
  });

  it("does not update dead entities", () => {
    const world = new World();
    const entity = new Entity(0, 0, 100, 0);

    entity.alive = false;
    world.spawn(entity);

    world.step(1, {
      width: 800,
      height: 500,
    });

    expect(entity.pos.x).toBe(0);
    expect(entity.pos.y).toBe(0);
  });

  it("collects a shield pickup", () => {
    const world = new World();
    const ship = new Ship(100, 100);
    const pickup = new Pickup(100, 100, "shield");

    world.spawn(ship);
    world.spawn(pickup);

    world.collectPickup(ship, pickup);

    expect(ship.shield).toBe(true);
    expect(ship.hp).toBe(3);
    expect(pickup.alive).toBe(false);
  });

  it("does not collect a pickup from a dead ship", () => {
    const world = new World();
    const ship = new Ship(100, 100);
    const pickup = new Pickup(100, 100, "shield");

    ship.alive = false;

    world.spawn(ship);
    world.spawn(pickup);

    world.collectPickup(ship, pickup);

    expect(ship.shield).toBe(false);
    expect(pickup.alive).toBe(true);
  });

  it("destroys a ship and starts respawn timer", () => {
    const world = new World();
    const ship = new Ship(100, 100);

    world.spawn(ship);
    world.destroyShip(ship);

    expect(ship.alive).toBe(false);
    expect(world.respawnTimer).toBe(2);
  });

  it("creates a safe ship away from asteroids", () => {
    const world = new World(123);

    world.width = 800;
    world.height = 500;

    const asteroid = new Asteroid(400, 250, 0, 0, 30);

    world.spawn(asteroid);

    const ship = world.createSafeShip();
    const distance = Math.hypot(
      asteroid.pos.x - ship.pos.x,
      asteroid.pos.y - ship.pos.y
    );

    expect(distance).toBeGreaterThanOrEqual(
      asteroid.radius + ship.radius + 30
    );
  });

  it("creates an asteroid inside the arena", () => {
    const world = new World(123);

    world.width = 800;
    world.height = 500;

    const asteroid = world.createAsteroid();

    expect(asteroid.pos.x).toBeGreaterThanOrEqual(asteroid.radius);
    expect(asteroid.pos.x).toBeLessThanOrEqual(
      world.width - asteroid.radius
    );
    expect(asteroid.pos.y).toBeGreaterThanOrEqual(asteroid.radius);
    expect(asteroid.pos.y).toBeLessThanOrEqual(
      world.height - asteroid.radius
    );
    expect(asteroid.vel.x).toBeGreaterThanOrEqual(-100);
    expect(asteroid.vel.x).toBeLessThanOrEqual(100);
    expect(asteroid.vel.y).toBeGreaterThanOrEqual(-100);
    expect(asteroid.vel.y).toBeLessThanOrEqual(100);
  });

  it("handles asteroid being hit by a ship bullet", () => {
    const world = new World();
    const ship = new Ship(100, 100);
    const asteroid = new Asteroid(100, 100, 0, 0, 30);

    world.spawn(ship);
    world.spawn(asteroid);

    const bullet = new Bullet(100, 100, 0, 0, ship);

    world.spawn(bullet);
    world.handleCollision(bullet, asteroid);

    expect(bullet.alive).toBe(false);
    expect(asteroid.hp).toBe(2);
  });

  it("handles asteroid destruction and increases score", () => {
    const world = new World();
    const ship = new Ship(100, 100);
    const asteroid = new Asteroid(100, 100, 0, 0, 30);

    asteroid.takeDamage(2);

    world.spawn(ship);
    world.spawn(asteroid);

    const bullet = new Bullet(100, 100, 0, 0, ship);

    world.spawn(bullet);
    world.handleCollision(bullet, asteroid);

    expect(bullet.alive).toBe(false);
    expect(asteroid.alive).toBe(false);
    expect(world.score).toBe(100);
    expect(world.asteroidRespawnTimers).toEqual([2]);
  });

  it("handles asteroid bullet hitting a ship", () => {
    const world = new World();
    const asteroid = new Asteroid(100, 100, 0, 0, 30);
    const ship = new Ship(100, 100);

    world.spawn(asteroid);
    world.spawn(ship);

    const bullet = new Bullet(100, 100, 0, 0, asteroid);

    world.spawn(bullet);
    world.handleCollision(bullet, ship);

    expect(bullet.alive).toBe(false);
    expect(ship.hp).toBe(2);
  });

  it("handles pickup and ship collision in both orders", () => {
    const world = new World();
    const ship1 = new Ship(100, 100);
    const pickup1 = new Pickup(100, 100, "shield");

    world.spawn(ship1);
    world.spawn(pickup1);
    world.handleCollision(ship1, pickup1);

    expect(ship1.shield).toBe(true);
    expect(pickup1.alive).toBe(false);

    const ship2 = new Ship(200, 200);
    const pickup2 = new Pickup(200, 200, "shield");

    world.spawn(ship2);
    world.spawn(pickup2);
    world.handleCollision(pickup2, ship2);

    expect(ship2.shield).toBe(true);
    expect(pickup2.alive).toBe(false);
  });

  it("respawns a ship after the respawn timer expires", () => {
    const world = new World(123);

    world.respawnTimer = 0.5;

    world.step(1, {
      width: 800,
      height: 500,
    });

    expect(world.respawnTimer).toBe(0);
    expect([...world.ofKind("ship")]).toHaveLength(1);
  });

  it("respawns an asteroid after its timer expires", () => {
    const world = new World(123);

    world.asteroidRespawnTimers.push(0.5);

    world.step(1, {
      width: 800,
      height: 500,
    });

    expect(world.asteroidRespawnTimers).toHaveLength(0);
    expect([...world.ofKind("asteroid")]).toHaveLength(1);
  });

  it("does not collect an already dead pickup", () => {
    const world = new World();
    const ship = new Ship(100, 100);
    const pickup = new Pickup(100, 100, "shield");

    pickup.alive = false;

    world.collectPickup(ship, pickup);

    expect(ship.shield).toBe(false);
    expect(pickup.alive).toBe(false);
  });
});

