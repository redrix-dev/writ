import { useMemo, useState } from "react";
import { GodHookChannel } from "./godhook/GodHookChannel.js";
import { NexusChannel } from "./nexus/NexusChannel.js";
import { clearGodMessageCache } from "./godhook/messageCache.js";
import { createServer } from "./simulator.js";

type Mode = "god" | "nexus";

const NOTES: Record<Mode, { title: string; points: string[] }> = {
  god: {
    title: "God hook",
    points: [
      "Messages live in a module-level cache any file can read or wipe — try the button below. No one owns message state.",
      "Visibility (blocked users) is decided by reaching into a separate store, so “who can hide a message?” is split across two places.",
      "Presence + typing are local state, but the hook hands its setters back — any component can mutate the room.",
      "Distilled from a real ~2097-line useMessages hook with the same three smells at 17× the size.",
    ],
  },
  nexus: {
    title: "Nexus",
    points: [
      "presence, messages, and the blocked set are all owned by one composition root. The server handler is the only writer.",
      "Visibility policy is co-located with messages and toggled through the root's writer — not a reach-in to an unrelated store.",
      "Components get readers with no write path, so nothing outside the root can mutate message state.",
      "Lifecycle is in the verbs: join → upsert (birth), leave → destroyIfPresent (death), message → spawn.",
    ],
  },
};

export function App() {
  const [mode, setMode] = useState<Mode>("nexus");
  // A fresh server per mode, so toggling gives each version a clean room.
  const server = useMemo(() => createServer(), [mode]);
  const note = NOTES[mode];

  return (
    <div className="app">
      <header>
        <div>
          <h1>Nexus — one writer, many readers</h1>
          <p className="tag">
            Same chat channel, same event stream, same UI. The only difference is
            who has authority over the state.
          </p>
        </div>
        <div className="toggle" role="tablist">
          <button
            role="tab"
            aria-selected={mode === "god"}
            className={mode === "god" ? "active" : ""}
            onClick={() => setMode("god")}
          >
            God hook
          </button>
          <button
            role="tab"
            aria-selected={mode === "nexus"}
            className={mode === "nexus" ? "active" : ""}
            onClick={() => setMode("nexus")}
          >
            Nexus
          </button>
        </div>
      </header>

      <main>
        {mode === "god" ? (
          <GodHookChannel key="god" server={server} />
        ) : (
          <NexusChannel key="nexus" server={server} />
        )}

        <aside className={`notes ${mode}`}>
          <h2>{note.title}</h2>
          <ul>
            {note.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>

          <div className="authority-demo">
            {mode === "god" ? (
              <button
                className="danger"
                onClick={() => clearGodMessageCache("general")}
              >
                ☠ Clear messages from outside the hook
              </button>
            ) : (
              <button className="owned" disabled title="No external write path">
                🔒 Owned — no outside write path
              </button>
            )}
            <p className="authority-caption">
              {mode === "god"
                ? "A component, not the hook, wiping message state — because it can."
                : "There is no exported setter and no module global to reach. Only the root writes."}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
