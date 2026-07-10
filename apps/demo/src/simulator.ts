import type { Message, User } from "./types.js";

/**
 * A fake "presence server". It emits the same event stream both versions of the
 * demo consume, so the ONLY difference between them is how each manages state
 * authority — not what data they receive.
 *
 * Presence churn (join/leave) is the point: a user joining is an entity being
 * born, a user leaving is an entity dying. The Nexus version makes that literal
 * (spawn/destroy); the god hook buries it in a reducer.
 */

export type ServerEvent =
  | { type: "join"; user: User }
  | { type: "leave"; userId: string }
  | { type: "typing"; userId: string; typing: boolean }
  | { type: "message"; message: Message };

const BOTS: Omit<User, "typing">[] = [
  { id: "u-nova", name: "Nova", color: "#7c9cff" },
  { id: "u-pixel", name: "Pixel", color: "#ff8fab" },
  { id: "u-echo", name: "Echo", color: "#5fd0a8" },
  { id: "u-quill", name: "Quill", color: "#ffc074" },
  { id: "u-sage", name: "Sage", color: "#c792ea" },
  { id: "u-flux", name: "Flux", color: "#4dd0e1" },
];

const CHATTER = [
  "anyone around?",
  "shipping the thing today 🚀",
  "brb, coffee",
  "that bug was authority, not storage",
  "one writer, many readers 🙏",
  "who owns this state though",
  "lgtm",
  "presence is just entities being born and dying",
];

export const LOCAL_USER: User = {
  id: "u-you",
  name: "You",
  color: "#22c55e",
  typing: false,
};

let seq = 0;
const nextId = (prefix: string): string => `${prefix}-${Date.now()}-${seq++}`;
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

export interface Server {
  subscribe(listener: (event: ServerEvent) => void): () => void;
  /** Begin emitting presence + message events. Returns a stop function. */
  start(): () => void;
  /** The local user posts a message. */
  send(text: string): void;
}

export function createServer(): Server {
  const listeners = new Set<(event: ServerEvent) => void>();
  const online = new Map<string, User>();
  const timers: ReturnType<typeof setInterval>[] = [];

  const emit = (event: ServerEvent): void => {
    for (const listener of [...listeners]) listener(event);
  };

  const join = (): void => {
    const offline = BOTS.filter((b) => !online.has(b.id));
    if (offline.length === 0) return;
    const bot = pick(offline);
    const user: User = { ...bot, typing: false };
    online.set(user.id, user);
    emit({ type: "join", user });
  };

  const leave = (): void => {
    const ids = [...online.keys()];
    if (ids.length === 0) return;
    const userId = pick(ids);
    online.delete(userId);
    emit({ type: "leave", userId });
  };

  const chatter = (): void => {
    const ids = [...online.keys()];
    if (ids.length === 0) return;
    const user = online.get(pick(ids))!;
    // Show the typing indicator, then land the message.
    emit({ type: "typing", userId: user.id, typing: true });
    setTimeout(() => {
      emit({ type: "typing", userId: user.id, typing: false });
      emit({
        type: "message",
        message: {
          id: nextId("m"),
          authorId: user.id,
          authorName: user.name,
          color: user.color,
          text: pick(CHATTER),
          at: Date.now(),
        },
      });
    }, 900);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      // Seed a couple of bots so the room isn't empty.
      join();
      join();
      timers.push(setInterval(join, 4200));
      timers.push(setInterval(leave, 5600));
      timers.push(setInterval(chatter, 3200));
      return () => {
        for (const t of timers) clearInterval(t);
        timers.length = 0;
      };
    },
    send(text) {
      emit({
        type: "message",
        message: {
          id: nextId("m"),
          authorId: LOCAL_USER.id,
          authorName: LOCAL_USER.name,
          color: LOCAL_USER.color,
          text,
          at: Date.now(),
        },
      });
    },
  };
}
