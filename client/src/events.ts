type GameEvents = {
  fired: undefined;
  hit: undefined;
  exploded: undefined;
  scorechange: {
    score: number;
  };
};

type EventListener<T> = (detail: T) => void;

export class Bus<Events extends Record<string, unknown>> {
  private listeners: {
    [K in keyof Events]?: Set<EventListener<Events[K]>>;
  } = {};

  on<K extends keyof Events>(
    type: K,
    listener: EventListener<Events[K]>
  ): void {
    const listeners = this.listeners[type] ?? new Set<EventListener<Events[K]>>();

    listeners.add(listener);
    this.listeners[type] = listeners;
  }

  off<K extends keyof Events>(
    type: K,
    listener: EventListener<Events[K]>
  ): void {
    this.listeners[type]?.delete(listener);
  }

  emit<K extends keyof Events>(
    type: K,
    detail: Events[K]
  ): void {
    this.listeners[type]?.forEach((listener) => {
      listener(detail);
    });
  }
}

export const gameEvents = new Bus<GameEvents>();

export function emitGameEvent<K extends keyof GameEvents>(
  type: K,
  detail: GameEvents[K]
): void {
  gameEvents.emit(type, detail);
}

