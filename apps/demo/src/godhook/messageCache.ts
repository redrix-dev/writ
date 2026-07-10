import type { Message } from "../types.js";

/**
 * An ambient, module-level message cache — mutated through exported functions,
 * reachable from ANY file in the app. This mirrors the real `useMessages` hook's
 * `crossSessionMessageBundleByChannel` module global and its exported
 * `clearCrossSessionMessagingCaches` / `prefetchCommunityChannelMessages`
 * helpers: message state that no one owns and anyone can poke.
 *
 * The demo's "Clear from outside the hook" button calls `clearGodMessageCache`
 * directly — a component, not the hook, wiping message state. That's the smell:
 * authority is ambient.
 */
const cache = new Map<string, Message[]>();
const listeners = new Set<() => void>();
// Stable empty reference: getGodMessages is a useSyncExternalStore snapshot, so
// it must return the SAME reference when nothing changed or React loops.
const EMPTY: Message[] = [];

const notify = () => {
  for (const listener of [...listeners]) listener();
};

export function getGodMessages(channelId: string): Message[] {
  return cache.get(channelId) ?? EMPTY;
}

export function appendGodMessage(channelId: string, message: Message): void {
  cache.set(channelId, [...getGodMessages(channelId), message].slice(-50));
  notify();
}

/** Exported: any file can wipe message state without going through the hook. */
export function clearGodMessageCache(channelId: string): void {
  cache.set(channelId, []);
  notify();
}

export function subscribeGodMessageCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
