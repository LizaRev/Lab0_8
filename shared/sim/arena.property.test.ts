import { describe, expect, test } from "vitest";
import fc from "fast-check";

import { Ship } from "./ship.js";
import { wrapShip } from "./arena.js";

describe("arena properties", () => {
  test("ships stay inside the arena after 1000 random input steps", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            left: fc.boolean(),
            right: fc.boolean(),
            thrust: fc.boolean(),
            fire: fc.boolean(),
          }),
          {
            minLength: 1000,
            maxLength: 1000,
          }
        ),
        (inputs) => {
          const width = 800;
          const height = 500;
          const ship = new Ship(width / 2, height / 2);

          for (const input of inputs) {
            const gameInput = {
              input: {
                isDown(key: string): boolean {
                  if (key === "ArrowLeft") return input.left;
                  if (key === "ArrowRight") return input.right;
                  if (key === "ArrowUp") return input.thrust;

                  return false;
                },
              },
            };

            ship.update(1 / 60, gameInput);
            wrapShip(ship, width, height);

            expect(ship.pos.x).toBeGreaterThanOrEqual(0);
            expect(ship.pos.x).toBeLessThanOrEqual(width);
            expect(ship.pos.y).toBeGreaterThanOrEqual(0);
            expect(ship.pos.y).toBeLessThanOrEqual(height);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

