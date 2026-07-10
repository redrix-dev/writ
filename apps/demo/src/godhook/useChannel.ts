import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { User } from "../types.js";
import { LOCAL_USER, type Server } from "../simulator.js";
import {
  appendGodMessage,
  getGodMessages,
  subscribeGodMessageCache,
} from "./messageCache.js";
import { socialStore } from "./socialStore.js";

const CHANNEL_ID = "general";

/**
 * The god hook. Distilled from a real ~2097-line `useMessages` hook, keeping the
 * three pathologies that actually hurt:
 *
 *   1. AMBIENT MODULE STATE. Messages live in `messageCache.ts` — a module-level
 *      store any file can read or wipe (see the "Clear from outside" button).
 *      No one owns message state.
 *
 *   2. CROSS-STORE AUTHORITY. To decide which messages are visible, this hook
 *      reaches into an unrelated `socialStore`. "Who decides visibility?" is
 *      split across the message hook and a store that knows nothing about it.
 *
 *   3. NO BOUNDARY. Presence and typing are local useState, but the hook hands
 *      its setters back to callers, so any component can mutate the room.
 */
export function useChannel(server: Server) {
  const [presence, setPresence] = useState<Record<string, User>>({});
  const [typing, setTyping] = useState<Record<string, boolean>>({});

  // Messages come from the ambient module cache, not from here.
  const messages = useSyncExternalStore(subscribeGodMessageCache, () =>
    getGodMessages(CHANNEL_ID),
  );
  // Visibility authority: reach into an unrelated store.
  const blockedIds = useSyncExternalStore(
    socialStore.subscribe,
    socialStore.getBlocked,
  );

  useEffect(() => {
    const unsubscribe = server.subscribe((event) => {
      switch (event.type) {
        case "join":
          setPresence((p) => ({ ...p, [event.user.id]: event.user }));
          break;
        case "leave":
          setPresence((p) => {
            const { [event.userId]: _gone, ...rest } = p;
            return rest;
          });
          setTyping((t) => {
            const { [event.userId]: _t, ...rest } = t;
            return rest;
          });
          break;
        case "typing":
          setTyping((t) => ({ ...t, [event.userId]: event.typing }));
          setPresence((p) =>
            p[event.userId]
              ? { ...p, [event.userId]: { ...p[event.userId]!, typing: event.typing } }
              : p,
          );
          break;
        case "message":
          appendGodMessage(CHANNEL_ID, event.message); // into the module global
          break;
      }
    });
    const stop = server.start();
    return () => {
      unsubscribe();
      stop();
    };
  }, [server]);

  const roster = useMemo(
    () => Object.values(presence).sort((a, b) => a.name.localeCompare(b.name)),
    [presence],
  );
  const typers = useMemo(() => roster.filter((u) => typing[u.id]), [roster, typing]);
  // The filter reaches into socialStore — visibility lives in two places.
  const visibleMessages = useMemo(
    () => messages.filter((m) => !blockedIds.has(m.authorId)),
    [messages, blockedIds],
  );

  return {
    roster,
    typers,
    messages: visibleMessages,
    blockedIds,
    send: (text: string) => server.send(text),
    toggleBlock: (userId: string) => socialStore.toggle(userId),
    // Footgun, returned in the open: any caller can mutate the room.
    setPresence,
    setTyping,
  };
}

export { LOCAL_USER };
