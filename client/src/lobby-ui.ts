import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Lobby } from "./lobby.js";
import { LobbyComponent } from "./components/Lobby.js";

export function createLobbyUI(lobby: Lobby) {
  const container = document.createElement("div");
  let root: Root | null = null;

  const handleJoined = () => {
    root?.unmount();
    root = null;
    container.remove();
  };

  root = createRoot(container);

  root.render(
    createElement(LobbyComponent, {
      lobby,
      onJoined: handleJoined
    })
  );

  document.body.appendChild(container);

  return {
    element: container,

    destroy(): void {
      root?.unmount();
      root = null;
      lobby.stopAutoRefresh();
      container.remove();
    }
  };
}

