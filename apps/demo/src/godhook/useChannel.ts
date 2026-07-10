import { useEffect, useMemo, useState } from "react";
import type { Message, User } from "../types.js";
import { LOCAL_USER, type Server } from "../simulator.js";

/**
 * The god hook. Every concern in the channel — presence, typing, messages,
 * and all the derived views over them — lives in this one hook, wired through
 * one big effect. In Haven this was the 2000+ line shape; here it's small, but
 * the pathology is the same:
 *
 *   1. NO OWNERSHIP BOUNDARY. The hook is the writer, but it also hands its raw
 *      setters to whoever calls it. Any component can `setPresence(...)` and
 *      corrupt the room. Authority is ambient — exactly what Nexus removes.
 *
 *   2. ONE BLOB, ONE RE-RENDER. Presence, typing, and messages are separate
 *      useStates, but every consumer takes the whole hook, so a typing flicker
 *      re-renders the message list and vice versa. Nothing subscribes to just
 *      what it reads.
 *
 *   3. LIFECYCLE IS BURIED. "A user joined" / "a user left" is birth and death,
 *      but here it's a `setPresence` spread in a switch — you can't see the
 *      lifecycle, so you can't reason about it.
 */
export function useChannel(server: Server) {
  const [presence, setPresence] = useState<Record<string, User>>({});
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const unsubscribe = server.subscribe((event) => {
      switch (event.type) {
        case "join":
          setPresence((p) => ({ ...p, [event.user.id]: event.user }));
          break;
        case "leave":
          // birth/death, hidden inside object-spread bookkeeping
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
          // typing also has to be mirrored onto the presence blob, because the
          // roster renders it — two sources of the same truth, kept in sync by
          // hand. Miss one and they drift.
          setPresence((p) =>
            p[event.userId]
              ? { ...p, [event.userId]: { ...p[event.userId]!, typing: event.typing } }
              : p,
          );
          break;
        case "message":
          setMessages((m) => [...m, event.message].slice(-50));
          break;
      }
    });
    const stop = server.start();
    return () => {
      unsubscribe();
      stop();
    };
  }, [server]);

  // Derived views, recomputed here because there's nowhere else to put them.
  const roster = useMemo(
    () => Object.values(presence).sort((a, b) => a.name.localeCompare(b.name)),
    [presence],
  );
  const typers = useMemo(
    () => roster.filter((u) => typing[u.id]),
    [roster, typing],
  );

  const send = (text: string) => server.send(text);

  // The footgun, returned in the open: every setter is exposed. Nothing stops a
  // component from reaching in and mutating presence or messages directly.
  return { roster, typers, messages, send, setPresence, setMessages, setTyping };
}

export { LOCAL_USER };
