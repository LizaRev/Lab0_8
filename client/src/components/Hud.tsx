import {
  useEffect,
  useState,
} from "react";
import type { LobbyLike, Player, Ship, HudStats } from "../hud-types.js";

type HudProps = {
  world: EventTarget;
  lobby: LobbyLike | null;
  initialPlayers: Player[];
  onReady: (api: HudApi) => void;
};

export type HudApi = {
  update(ship: Ship | null, stats: HudStats): void;
};

type ChatMessage = {
  name?: string;
  playerId?: string;
  text?: string;
};

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getPlayers(value: unknown): Player[] {
  if (!isObject(value) || !Array.isArray(value.players)) {
    return [];
  }

  return value.players.filter(
    (player): player is Player =>
      typeof player === "string" ||
      (
        isObject(player) &&
        (
          player.name === undefined ||
          typeof player.name === "string"
        )
      )
  );
}

function getChatMessage(value: unknown): ChatMessage | null {
  if (!isObject(value)) {
    return null;
  }

  const player = isObject(value.player)
    ? value.player
    : null;

  return {
    name:
      typeof value.name === "string"
        ? value.name
        : player && typeof player.name === "string"
          ? player.name
          : undefined,

    playerId:
      typeof value.playerId === "string"
        ? value.playerId
        : player && typeof player.id === "string"
          ? player.id
          : undefined,

    text:
      typeof value.text === "string"
        ? value.text
        : undefined,
  };
}

function getScore(value: unknown): number | null {
  if (
    !isObject(value) ||
    typeof value.score !== "number"
  ) {
    return null;
  }

  return value.score;
}

export function HudComponent({
  world,
  lobby,
  initialPlayers,
  onReady,
}: HudProps) {
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(3);
  const [stepsPerSecond, setStepsPerSecond] = useState(0);
  const [framesPerSecond, setFramesPerSecond] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  const [messages, setMessages] = useState<
    Array<{
      name: string;
      text: string;
    }>
  >([]);

  const [chatText, setChatText] = useState("");

  useEffect(() => {
    function handleRoster(event: Event): void {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      setPlayers(getPlayers(event.detail));
    }

    function handleChat(event: Event): void {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const message = getChatMessage(event.detail);
      console.log("CHAT DEBUG:", event.detail, message);

      if (!message) {
        return;
      }

      setMessages((current) => {
        const matchingPlayer = players.find((player) => {
          if (typeof player === "string") {
            return false;
          }

          return (
            message.playerId !== undefined &&
            player.id === message.playerId
          );
        });

        const rosterName =
          matchingPlayer && typeof matchingPlayer !== "string"
            ? matchingPlayer.name
            : undefined;

        const name =
          message.name?.trim() ||
          rosterName?.trim() ||
          "";

        return [
          ...current,
          {
            name,
            text: message.text ?? "",
          },
        ];
      });
    }

    function handleScoreChanged(event: Event): void {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const nextScore = getScore(event.detail);

      if (nextScore !== null) {
        setScore(nextScore);
      }
    }

    lobby?.addEventListener("roster", handleRoster);
    lobby?.addEventListener("chat", handleChat);
    world.addEventListener("scoreChanged", handleScoreChanged);

    return () => {
      lobby?.removeEventListener("roster", handleRoster);
      lobby?.removeEventListener("chat", handleChat);
      world.removeEventListener("scoreChanged", handleScoreChanged);
    };
  }, [lobby, world, players]);

  useEffect(() => {
    onReady({
      update(ship: Ship | null, stats: HudStats): void {
        setHp(ship?.hp ?? 0);
        setStepsPerSecond(stats.stepsPerSecond);
        setFramesPerSecond(stats.framesPerSecond);
        setFrameTime(stats.lastFrameDuration);
      },
    });
  }, [onReady]);

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): void {
    event.preventDefault();

    const text = chatText.trim();

    if (!text) {
      return;
    }

    lobby?.sendChat?.(text);
    setChatText("");
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: "15px",
          left: "15px",
          width: "160px",
          padding: "10px 12px",
          background: "rgba(10, 8, 30, 0.72)",
          border: "1px solid rgba(180, 150, 255, 0.35)",
          borderRadius: "10px",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          color: "white",
          font: "13px Arial, sans-serif",
          lineHeight: "1.6",
          zIndex: 9999,
          boxSizing: "border-box",
        }}
      >
        <div>Score: {score}</div>
        <div>HP: {hp}</div>
        <div>Steps/s: {stepsPerSecond}</div>
        <div>FPS: {framesPerSecond}</div>
        <div>Frame Time: {frameTime.toFixed(2)} ms</div>
      </div>

      <div
        style={{
          position: "fixed",
          top: "15px",
          right: "15px",
          width: "240px",
          height: "430px",
          maxHeight: "calc(100vh - 30px)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          padding: "12px",
          background: "rgba(10, 8, 30, 0.58)",
          border: "1px solid rgba(180, 150, 255, 0.35)",
          borderRadius: "12px",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          color: "white",
          fontFamily: "Arial, sans-serif",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1.5px",
            color: "#cfc5ff",
            marginBottom: "7px",
          }}
        >
          PLAYERS
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            maxHeight: "100px",
            overflowY: "auto",
            minHeight: "25px",
          }}
        >
          {players.length === 0 ? (
            <div style={{ color: "#91879e", fontSize: "12px" }}>
              No players
            </div>
          ) : (
            players.map((player, index) => {
              const playerName =
                typeof player === "string"
                  ? player
                  : player.name || "";

              return (
                <div
                  key={`${playerName}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "6px 7px",
                    background: "rgba(255, 255, 255, 0.06)",
                    borderRadius: "7px",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      minWidth: "7px",
                      borderRadius: "50%",
                      background: "#9dffb0",
                      display: "inline-block",
                    }}
                  />

                  <span style={{ fontSize: "12px" }}>
                    {playerName}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            height: "1px",
            background: "rgba(255, 255, 255, 0.12)",
            margin: "10px 0",
          }}
        />

        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1.5px",
            color: "#cfc5ff",
            marginBottom: "7px",
          }}
        >
          CHAT
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            paddingRight: "2px",
          }}
        >
          {messages.map((message, index) => (
            <div
              key={`${index}-${message.name}-${message.text}`}
              style={{
                padding: "6px 7px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "7px",
                fontSize: "12px",
                lineHeight: "1.35",
              }}
            >
              {message.name && (
                <span
                  style={{
                    fontWeight: 700,
                    color: "#cfc5ff",
                  }}
                >
                  {message.name}:{" "}
                </span>
              )}

              <span>{message.text}</span>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: "5px",
            marginTop: "8px",
          }}
        >
          <input
            type="text"
            placeholder="Message..."
            maxLength={500}
            autoComplete="off"
            value={chatText}
            onChange={(event) => setChatText(event.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              boxSizing: "border-box",
              padding: "7px 8px",
              border: "1px solid rgba(180, 150, 255, 0.30)",
              borderRadius: "7px",
              background: "rgba(255, 255, 255, 0.10)",
              color: "white",
              outline: "none",
              fontSize: "12px",
            }}
          />

          <button
            type="submit"
            style={{
              padding: "7px 9px",
              border: "none",
              borderRadius: "7px",
              background: "#8d6bd1",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
