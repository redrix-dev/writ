import { useState } from "react";
import type { Message, User } from "../types.js";

/**
 * Pure presentational channel UI. Both the god-hook and the writ version
 * render THIS exact component — so the visible diff between them is entirely in
 * how state is owned and updated, never in the markup.
 */
export function ChannelView(props: {
  roster: User[];
  messages: Message[];
  typers: User[];
  blockedIds: ReadonlySet<string>;
  onSend: (text: string) => void;
  onToggleBlock: (userId: string) => void;
}) {
  const { roster, messages, typers, blockedIds, onSend, onToggleBlock } = props;
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="channel">
      <aside className="roster">
        <h3>
          Online <span className="count">{roster.length}</span>
        </h3>
        <ul>
          {roster.map((u) => (
            <li key={u.id}>
              <span className="dot" style={{ background: u.color }} />
              <span className="name">{u.name}</span>
              {u.typing && <span className="typing-badge">typing…</span>}
              <button
                className="block-btn"
                title={blockedIds.has(u.id) ? "Unblock" : "Block"}
                aria-pressed={blockedIds.has(u.id)}
                onClick={() => onToggleBlock(u.id)}
              >
                {blockedIds.has(u.id) ? "unblock" : "block"}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="stream">
        <div className="messages">
          {messages.map((m) => (
            <div className="message" key={m.id}>
              <span className="author" style={{ color: m.color }}>
                {m.authorName}
              </span>
              <span className="text">{m.text}</span>
            </div>
          ))}
        </div>

        <div className="typing-line">
          {typers.length > 0 &&
            `${typers.map((t) => t.name).join(", ")} ${
              typers.length === 1 ? "is" : "are"
            } typing…`}
        </div>

        <div className="composer">
          <input
            value={draft}
            placeholder="Message #general"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button onClick={submit}>Send</button>
        </div>
      </section>
    </div>
  );
}
