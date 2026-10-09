export type Player =
  | string
  | {
      name?: string;
      [key: string]: unknown;
    };

export type Ship = {
  hp?: number;
  [key: string]: unknown;
};

export type HudStats = {
  stepsPerSecond: number;
  framesPerSecond: number;
  lastFrameDuration: number;
};

export type LobbyLike = {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void;

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void;

  sendChat?(text: string): void;
};

