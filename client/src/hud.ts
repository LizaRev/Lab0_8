import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { LobbyLike, Player, Ship, HudStats } from "./hud-types.js";
import { HudComponent, type HudApi } from "./components/Hud.js";

type WorldLike = EventTarget;

export function initHud(
  world: WorldLike,
  lobby: LobbyLike | null = null,
  initialPlayers: Player[] = []
) {
  const container = document.createElement("div");

  let root: Root | null = null;
  let api: HudApi | null = null;

  const handleReady = (nextApi: HudApi): void => {
    api = nextApi;
  };

  root = createRoot(container);

  root.render(
    createElement(HudComponent, {
      world,
      lobby,
      initialPlayers,
      onReady: handleReady
    })
  );

  document.body.appendChild(container);

  return {
    update(ship: Ship | null, stats: HudStats): void {
      api?.update(ship, stats);
    },

    destroy(): void {
      root?.unmount();
      root = null;
      container.remove();
      api = null;
    }
  };
}

