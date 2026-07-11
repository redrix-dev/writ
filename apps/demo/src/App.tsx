import { useMemo, useSyncExternalStore } from "react";
import {
  EvidenceRuntime,
  eventCount,
  publicSurface,
  type DemoEvent,
  type Mode,
} from "./evidence/runtime.js";

const modes: readonly { id: Mode; label: string; note: string }[] = [
  {
    id: "ambient",
    label: "Ambient / historical",
    note: "Real Haven failure shape: module globals, cross-store reach-ins, exported setters.",
  },
  {
    id: "native",
    label: "Disciplined native store",
    note: "A fair alternative with private mutation and named actions.",
  },
  {
    id: "writ",
    label: "writ-shaped",
    note: "Most consumers receive observation plus narrow commands, not raw writers.",
  },
];

const failureButtons: readonly {
  operation: DemoEvent["operation"];
  label: string;
}[] = [
  { operation: "duplicate-spawn", label: "Duplicate spawn" },
  { operation: "missing-update", label: "Update missing" },
  { operation: "repeated-destroy", label: "Destroy absent" },
  { operation: "reader-write", label: "Reader asks to write" },
  { operation: "leaked-writer", label: "Leak writer" },
];

function Topology({ mode }: { mode: Mode }) {
  return (
    <section className="panel topology-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Ownership topology</span>
          <h2>Where events and commands travel</h2>
        </div>
      </div>
      <div className={`topology ${mode}`}>
        <div className="topology-column sources">
          <h3>Event sources</h3>
          <span>Realtime</span>
          <span>Optimistic UI</span>
          <span>Persistence</span>
          <span>Reconnect replay</span>
        </div>
        <div className="flow-arrow">→</div>
        <div className="topology-column owner">
          <h3>
            {mode === "ambient"
              ? "Ambient surface"
              : mode === "native"
                ? "Domain store"
                : "Owner boundary"}
          </h3>
          <strong>
            {mode === "ambient"
              ? "Anyone can route or write"
              : "Routes events + retains mutation"}
          </strong>
          <div className="store-stack">
            <span>Community scope</span>
            <span>Channel stores</span>
            <span>Lifecycle + disposal</span>
          </div>
        </div>
        <div className="flow-arrow">→</div>
        <div className="topology-column observers">
          <h3>Observers</h3>
          <span>Message list</span>
          <span>Presence list</span>
          <span>Inspector</span>
          <div className="command-arrow">← explicit commands</div>
        </div>
      </div>
    </section>
  );
}

export function App() {
  const mode =
    (new URLSearchParams(location.search).get("mode") as Mode | null) ?? "writ";
  const selectedMode = modes.some((item) => item.id === mode) ? mode : "writ";
  const runtime = useMemo(
    () => new EvidenceRuntime(selectedMode),
    [selectedMode],
  );
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  const selected = modes.find((item) => item.id === selectedMode)!;

  const setMode = (next: Mode) => {
    const url = new URL(location.href);
    url.searchParams.set("mode", next);
    history.pushState({}, "", url);
    location.reload();
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <span className="kicker">writ evidence lab</span>
          <h1>Make ownership and invalid transitions visible.</h1>
          <p>
            One domain scenario, one scripted event stream, and one rendered
            channel view across three implementation shapes.
          </p>
        </div>
        <div className="mode-tabs" role="tablist">
          {modes.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={selectedMode === item.id}
              className={selectedMode === item.id ? "active" : ""}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mode-note">{selected.note}</p>
      </header>

      <main>
        <Topology mode={selectedMode} />

        <section
          className="comparison-row"
          aria-label="Side-by-side ownership comparison"
        >
          <article>
            <span>Ambient / historical</span>
            <strong>Mutation travels through exports and reach-ins</strong>
            <small>
              Invalid transitions are commonly overwritten or ignored.
            </small>
          </article>
          <article>
            <span>Disciplined native</span>
            <strong>Private store plus named actions</strong>
            <small>
              Strong when every contributor preserves the module convention.
            </small>
          </article>
          <article>
            <span>writ-shaped</span>
            <strong>Writer retained; readers and commands published</strong>
            <small>
              Strict existence transitions and scoped disposal are explicit.
            </small>
          </article>
        </section>

        <section className="control-strip panel">
          <div>
            <span className="eyebrow">Shared scenario</span>
            <strong>
              2 communities · dynamic channels · presence · messages ·
              optimistic sends · replay
            </strong>
          </div>
          <div className="controls">
            <span>
              {snapshot.cursor}/{eventCount} events
            </span>
            <button
              onClick={() => runtime.next()}
              disabled={snapshot.cursor >= eventCount}
            >
              Run next event
            </button>
            <button className="ghost" onClick={() => runtime.reset()}>
              Reset stream
            </button>
          </div>
        </section>

        <div className="primary-grid">
          <section className="panel channel-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Identical rendered UI</span>
                <h2>#{snapshot.activeChannelId}</h2>
                <small>{snapshot.activeCommunityId}</small>
              </div>
              <div className="presence">
                <span className="live-dot" /> {snapshot.presence.length} online
                · {snapshot.hiddenMessages} policy-hidden
              </div>
            </div>
            <div className="scope-tabs">
              {snapshot.scopes
                .filter((s) => !s.disposed)
                .map((scope) => (
                  <button
                    className={
                      scope.channelId === snapshot.activeChannelId &&
                      scope.communityId === snapshot.activeCommunityId
                        ? "active"
                        : ""
                    }
                    key={scope.key}
                    onClick={() =>
                      runtime.select(scope.communityId, scope.channelId)
                    }
                  >
                    {scope.communityId} / {scope.channelId}
                  </button>
                ))}
            </div>
            <div className="message-list">
              {snapshot.messages.length === 0 ? (
                <p className="empty">No live messages in this scope.</p>
              ) : (
                snapshot.messages.map((message) => (
                  <article key={message.id}>
                    <div className="avatar">{message.author[0]}</div>
                    <div>
                      <strong>{message.author}</strong>
                      {message.pending && (
                        <span className="pending">optimistic</span>
                      )}
                      <p>{message.text}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="composer">
              <input
                readOnly
                value="Public UI receives a sendMessage command"
              />
              <button onClick={() => runtime.failure("leaked-writer")}>
                Send
              </button>
            </div>
          </section>

          <section className="panel scope-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Live scoped stores</span>
                <h2>Instance registry</h2>
              </div>
            </div>
            <div className="scope-list">
              {snapshot.scopes.map((scope) => (
                <article
                  key={scope.key}
                  className={scope.disposed ? "disposed" : ""}
                >
                  <div>
                    <strong>
                      {scope.communityId} / {scope.channelId}
                    </strong>
                    <small>{scope.owner}</small>
                  </div>
                  <div className="scope-metrics">
                    <span>
                      {scope.stores} store{scope.stores === 1 ? "" : "s"}
                    </span>
                    <span>
                      {scope.subscribers} subscriber
                      {scope.subscribers === 1 ? "" : "s"}
                    </span>
                    <span>{scope.persisted ? "persisted" : "memory"}</span>
                    <span>{scope.disposed ? "disposed" : "active"}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="panel inspector-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Event inspector</span>
              <h2>Requested operation → observed result</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Source</th>
                  <th>Target</th>
                  <th>Operation</th>
                  <th>Owner</th>
                  <th>Transition</th>
                  <th>Result</th>
                  <th>Notified</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.history.map((row) => (
                  <tr key={row.sequence}>
                    <td>{row.sequence}</td>
                    <td>{row.event.source}</td>
                    <td>
                      {row.event.communityId}/{row.event.channelId}
                    </td>
                    <td>
                      <strong>{row.event.operation}</strong>
                      <small>{row.detail}</small>
                    </td>
                    <td>{row.owner}</td>
                    <td>{row.transition}</td>
                    <td>
                      <span className={`result ${row.result}`}>
                        {row.result}
                      </span>
                    </td>
                    <td>{row.notified.join(", ") || "none"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="lower-grid">
          <section className="panel failure-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Controlled failures</span>
                <h2>Probe the boundary</h2>
              </div>
            </div>
            <p>
              Run the same invalid request in each mode and inspect whether it
              is accepted, rejected, or silently ignored.
            </p>
            <div className="failure-buttons">
              {failureButtons.map((item) => (
                <button
                  key={item.operation}
                  onClick={() => runtime.failure(item.operation)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="panel surface-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Actual exported surface</span>
                <h2>{selected.label}</h2>
              </div>
            </div>
            <pre>{`export type PublicChannel = {\n${publicSurface[selectedMode].map((line) => `  ${line};`).join("\n")}\n}`}</pre>
            <p>
              {selectedMode === "ambient"
                ? "Mutation is part of the ambient public surface."
                : "Consumers observe state and invoke selected commands; raw mutation stays behind the owner."}
            </p>
          </section>
        </div>

        <section className="panel limits-panel">
          <div>
            <span className="eyebrow">What writ did not solve</span>
            <h2>The boundary is evidence, not magic.</h2>
          </div>
          <ul>
            <li>It did not write domain policy.</li>
            <li>It did not eliminate event-handling complexity.</li>
            <li>It did not replace the reactive store.</li>
            <li>It did not prevent intentionally leaking authority.</li>
            <li>It made ownership and invalid transitions visible.</li>
          </ul>
          <p className="decisive">
            In a disciplined native implementation, correctness depends on
            contributors preserving the convention. In the writ-shaped
            implementation, most contributors never receive the mutation
            capability.
          </p>
          <p className="historical">
            The ambient view remains historical evidence distilled from Haven’s
            real ~2,097-line god hook; it is not presented as the strongest
            native-store alternative.
          </p>
        </section>
      </main>
    </div>
  );
}
