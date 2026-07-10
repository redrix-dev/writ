/**
 * A separate "social" store holding the blocked-user set — its own module-level
 * store, unrelated to messages. The god hook reaches into it to decide which
 * messages are visible, exactly like the real `useMessages` read
 * `useSocialStore((s) => s.blockedUserIds)` and `usePermissionsStore` mid-load.
 *
 * The result: "who decides a message is visible?" has no single answer — the
 * authority is split across the message hook and this unrelated store.
 */
let blocked = new Set<string>();
const listeners = new Set<() => void>();

export const socialStore = {
  getBlocked(): ReadonlySet<string> {
    return blocked;
  },
  isBlocked(userId: string): boolean {
    return blocked.has(userId);
  },
  toggle(userId: string): void {
    const next = new Set(blocked);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    blocked = next;
    for (const listener of [...listeners]) listener();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
