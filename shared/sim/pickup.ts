import { Entity } from "./entity.js";

export type PickupType = "shield";

export class Pickup extends Entity {
  type: PickupType;

  constructor(
    x: number,
    y: number,
    type: PickupType = "shield"
  ) {
    super(x, y, 0, 0, 0, 15, "pickup");
    this.type = type;
  }

  update(_dt: number): void {
    // Pickup does not move.
  }
}

