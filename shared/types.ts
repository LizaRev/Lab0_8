export type EntityId = number & {
  readonly __brand: "EntityId";
};

export type Tick = number & {
  readonly __brand: "Tick";
};

export type Seq = number & {
  readonly __brand: "Seq";
};

export function toEntityId(value: number): EntityId {
  return value as EntityId;
}

export function toTick(value: number): Tick {
  return value as Tick;
}

export function toSeq(value: number): Seq {
  return value as Seq;
}

