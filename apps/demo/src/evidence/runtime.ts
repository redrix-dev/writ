import { createEntityStore } from "@redrixx/projectname";

export type Mode = "ambient" | "native" | "projectname";
export type Result = "accepted" | "rejected" | "ignored";

export type DemoEvent = Readonly<{
  id: string;
  source: "realtime" | "ui" | "persistence" | "replay" | "failure lab";
  communityId: string;
  channelId: string;
  operation:
    | "open"
    | "close"
    | "join"
    | "leave"
    | "message"
    | "optimistic-send"
    | "policy-block"
    | "duplicate-spawn"
    | "missing-update"
    | "repeated-destroy"
    | "reader-write"
    | "leaked-writer";
  entityId?: string;
  text?: string;
}>;

export type DemoMessage = Readonly<{
  id: string;
  author: string;
  text: string;
  pending: boolean;
}>;

export type InspectorRow = Readonly<{
  sequence: number;
  event: DemoEvent;
  owner: string;
  transition: string;
  result: Result;
  notified: readonly string[];
  detail: string;
}>;

export type ScopeRow = Readonly<{
  key: string;
  communityId: string;
  channelId: string;
  owner: string;
  stores: number;
  subscribers: number;
  persisted: boolean;
  disposed: boolean;
}>;

export type RuntimeSnapshot = Readonly<{
  mode: Mode;
  activeCommunityId: string;
  activeChannelId: string;
  messages: readonly DemoMessage[];
  hiddenMessages: number;
  presence: readonly string[];
  scopes: readonly ScopeRow[];
  history: readonly InspectorRow[];
  cursor: number;
}>;

const scriptedEvents: readonly DemoEvent[] = [
  {
    id: "e1",
    source: "persistence",
    communityId: "design",
    channelId: "general",
    operation: "open",
  },
  {
    id: "e2",
    source: "realtime",
    communityId: "design",
    channelId: "general",
    operation: "join",
    entityId: "Nova",
  },
  {
    id: "e3",
    source: "realtime",
    communityId: "design",
    channelId: "general",
    operation: "message",
    entityId: "m1",
    text: "The event stream is shared.",
  },
  {
    id: "e4",
    source: "ui",
    communityId: "design",
    channelId: "general",
    operation: "optimistic-send",
    entityId: "m-local",
    text: "Optimistic local send",
  },
  {
    id: "e-policy",
    source: "ui",
    communityId: "design",
    channelId: "general",
    operation: "policy-block",
    entityId: "Nova",
  },
  {
    id: "e5",
    source: "persistence",
    communityId: "engineering",
    channelId: "releases",
    operation: "open",
  },
  {
    id: "e6",
    source: "realtime",
    communityId: "engineering",
    channelId: "releases",
    operation: "join",
    entityId: "Pixel",
  },
  {
    id: "e7",
    source: "realtime",
    communityId: "engineering",
    channelId: "releases",
    operation: "message",
    entityId: "m2",
    text: "Release candidate is live.",
  },
  {
    id: "e8",
    source: "replay",
    communityId: "design",
    channelId: "general",
    operation: "message",
    entityId: "m1",
    text: "The event stream is shared.",
  },
  {
    id: "e9",
    source: "realtime",
    communityId: "design",
    channelId: "general",
    operation: "leave",
    entityId: "Nova",
  },
  {
    id: "e10",
    source: "ui",
    communityId: "engineering",
    channelId: "releases",
    operation: "close",
  },
];

type Scope = {
  communityId: string;
  channelId: string;
  messages: Map<string, DemoMessage>;
  presence: Set<string>;
  blockedAuthors: Set<string>;
  projectnameMessages:
    ReturnType<typeof createEntityStore<DemoMessage>> | undefined;
  disposed: boolean;
  persisted: boolean;
};

const ownerName = (mode: Mode, event: DemoEvent): string =>
  mode === "ambient"
    ? "module globals / current caller"
    : mode === "native"
      ? `ChannelStore(${event.channelId})`
      : `ChannelOwner(${event.communityId}/${event.channelId})`;

export class EvidenceRuntime {
  readonly #listeners = new Set<() => void>();
  readonly #scopes = new Map<string, Scope>();
  #history: InspectorRow[] = [];
  #cursor = 0;
  #sequence = 0;
  #activeCommunityId = "design";
  #activeChannelId = "general";
  #snapshot: RuntimeSnapshot;

  constructor(readonly mode: Mode) {
    this.#snapshot = this.#buildSnapshot();
    for (let i = 0; i < 3; i++) this.next();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    this.#publish();
    return () => {
      this.#listeners.delete(listener);
      this.#publish();
    };
  };

  getSnapshot = (): RuntimeSnapshot => this.#snapshot;

  next(): void {
    const event = scriptedEvents[this.#cursor];
    if (!event) return;
    this.#cursor += 1;
    this.apply(event);
  }

  reset(): void {
    this.#scopes.clear();
    this.#history = [];
    this.#cursor = 0;
    this.#sequence = 0;
    for (let i = 0; i < 3; i++) this.next();
  }

  select(communityId: string, channelId: string): void {
    this.#activeCommunityId = communityId;
    this.#activeChannelId = channelId;
    this.#publish();
  }

  failure(operation: DemoEvent["operation"]): void {
    this.apply({
      id: `failure-${this.#sequence + 1}`,
      source: "failure lab",
      communityId: this.#activeCommunityId,
      channelId: this.#activeChannelId,
      operation,
      entityId: operation === "duplicate-spawn" ? "m1" : "missing",
      ...(operation === "leaked-writer"
        ? { text: "Writer deliberately leaked" }
        : {}),
    });
  }

  apply(event: DemoEvent): void {
    const key = `${event.communityId}/${event.channelId}`;
    let scope = this.#scopes.get(key);
    let result: Result = "accepted";
    let transition: string = event.operation;
    let detail = "";
    const notified: string[] = [];

    if (event.operation === "open") {
      if (scope && !scope.disposed) {
        result = this.mode === "ambient" ? "ignored" : "rejected";
        detail = "scope already exists";
      } else {
        scope = this.#createScope(event.communityId, event.channelId);
        this.#scopes.set(key, scope);
        transition = "absent → active";
        detail = "store created lazily on first access";
      }
    } else if (event.operation === "reader-write") {
      result = this.mode === "ambient" ? "accepted" : "rejected";
      transition =
        this.mode === "ambient"
          ? "public setter invoked"
          : "no mutation method";
      detail =
        this.mode === "ambient"
          ? "ambient surface exposes mutation"
          : "the published observation handle has no setter";
    } else {
      scope ??= this.#createScope(event.communityId, event.channelId);
      this.#scopes.set(key, scope);

      if (event.operation === "close") {
        if (scope.disposed) {
          result = this.mode === "ambient" ? "ignored" : "rejected";
          detail = "scope was already disposed";
        } else {
          scope.disposed = true;
          scope.messages.clear();
          scope.presence.clear();
          scope.projectnameMessages?.clear();
          transition = "active → disposed";
          detail = "subscriptions cleaned; in-memory state released";
          notified.push("scope panel", "channel view");
        }
      } else if (event.operation === "join") {
        const id = event.entityId ?? "unknown";
        if (scope.presence.has(id) && this.mode !== "ambient") {
          result = "rejected";
          detail = "duplicate presence spawn";
        } else {
          scope.presence.add(id);
          transition = "absent → present";
          notified.push("presence list");
        }
      } else if (
        event.operation === "leave" ||
        event.operation === "repeated-destroy"
      ) {
        const id = event.entityId ?? "missing";
        if (!scope.presence.has(id)) {
          result = this.mode === "ambient" ? "ignored" : "rejected";
          detail = "entity is already absent";
        } else {
          scope.presence.delete(id);
          transition = "present → absent";
          notified.push("presence list");
        }
      } else if (event.operation === "missing-update") {
        result = this.mode === "ambient" ? "ignored" : "rejected";
        detail = "target entity does not exist";
      } else if (event.operation === "policy-block") {
        const author = event.entityId ?? "unknown";
        scope.blockedAuthors.add(author);
        transition = "visible → policy-hidden";
        detail = "blocked-user policy now filters this author's messages";
        notified.push("message visibility");
      } else {
        const id = event.entityId ?? `message-${this.#sequence}`;
        const duplicate = scope.messages.has(id);
        const message: DemoMessage = {
          id,
          author: event.source === "ui" ? "You" : "Nova",
          text: event.text ?? event.operation,
          pending: event.operation === "optimistic-send",
        };

        if (
          (duplicate || event.operation === "duplicate-spawn") &&
          this.mode !== "ambient"
        ) {
          result = "rejected";
          detail = "duplicate spawn exposed an invalid transition";
        } else {
          scope.messages.set(id, message);
          if (scope.projectnameMessages) {
            if (scope.projectnameMessages.reader.has(id))
              scope.projectnameMessages.upsert(id, message);
            else scope.projectnameMessages.spawn(id, message);
          }
          transition = duplicate ? "present → replaced" : "absent → present";
          detail =
            event.operation === "leaked-writer"
              ? "boundary bypassed because a writer was deliberately shared"
              : duplicate
                ? "ambient upsert hid the duplicate"
                : "message accepted";
          notified.push("message list", "event inspector");
        }
      }
    }

    this.#history = [
      {
        sequence: ++this.#sequence,
        event,
        owner: ownerName(this.mode, event),
        transition,
        result,
        notified,
        detail,
      },
      ...this.#history,
    ].slice(0, 40);
    this.#activeCommunityId = event.communityId;
    this.#activeChannelId = event.channelId;
    this.#publish();
  }

  #createScope(communityId: string, channelId: string): Scope {
    return {
      communityId,
      channelId,
      messages: new Map(),
      presence: new Set(),
      blockedAuthors: new Set(),
      projectnameMessages:
        this.mode === "projectname"
          ? createEntityStore<DemoMessage>()
          : undefined,
      disposed: false,
      persisted: communityId === "design",
    };
  }

  #publish(): void {
    this.#snapshot = this.#buildSnapshot();
    for (const listener of [...this.#listeners]) listener();
  }

  #buildSnapshot(): RuntimeSnapshot {
    const active = this.#scopes.get(
      `${this.#activeCommunityId}/${this.#activeChannelId}`,
    );
    return {
      mode: this.mode,
      activeCommunityId: this.#activeCommunityId,
      activeChannelId: this.#activeChannelId,
      messages:
        active && !active.disposed
          ? [...active.messages.values()].filter(
              (message) => !active.blockedAuthors.has(message.author),
            )
          : [],
      hiddenMessages:
        active && !active.disposed
          ? [...active.messages.values()].filter((message) =>
              active.blockedAuthors.has(message.author),
            ).length
          : 0,
      presence: active && !active.disposed ? [...active.presence] : [],
      scopes: [...this.#scopes.entries()].map(([key, scope]) => ({
        key,
        communityId: scope.communityId,
        channelId: scope.channelId,
        owner: ownerName(this.mode, {
          id: "scope",
          source: "ui",
          operation: "open",
          communityId: scope.communityId,
          channelId: scope.channelId,
        }),
        stores: this.mode === "projectname" ? 2 : 1,
        subscribers: scope.disposed ? 0 : this.#listeners.size,
        persisted: scope.persisted,
        disposed: scope.disposed,
      })),
      history: this.#history,
      cursor: this.#cursor,
    };
  }
}

export const eventCount = scriptedEvents.length;

export const publicSurface: Record<Mode, readonly string[]> = {
  ambient: ["messages", "presence", "setMessages", "setPresence", "clearAll"],
  native: ["getState", "subscribe", "sendMessage", "toggleBlock"],
  projectname: [
    "messages: EntityReader",
    "presence: Reader",
    "sendMessage(command)",
    "dispose(command)",
  ],
};
