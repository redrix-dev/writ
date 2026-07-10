import { useMemo, useState } from "react";
import { GodHookChannel } from "./godhook/GodHookChannel.js";
import { NexusChannel } from "./nexus/NexusChannel.js";
import { createServer } from "./simulator.js";

type Mode = "god" | "nexus";

const NOTES: Record<Mode, { title: string; points: string[] }> = {
  god: {
    title: "God hook",
    points: [
      "One useChannel owns presence, typing, and messages together.",
      "It hands its raw setters back to callers — any component can mutate the room. Authority is ambient.",
      "Every consumer takes the whole blob, so a typing flicker re-renders the message list.",
      "Join/leave are birth and death, buried in object-spread bookkeeping.",
    ],
  },
  nexus: {
    title: "Nexus",
    points: [
      "presence and messages are separate entity stores, wired in one composition root.",
      "The server handler is the only writer. Components get readers — no setter exists to misuse.",
      "Lifecycle is in the verbs: join → upsert (birth), leave → destroyIfPresent (death), message → spawn.",
      "Independent authorities: a roster-only component never re-renders on a new message.",
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
        </aside>
      </main>
    </div>
  );
}
