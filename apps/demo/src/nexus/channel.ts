import { createEntityStore } from "@redrixx/nexus";
import type { Message, User } from "../types.js";
import type { Server } from "../simulator.js";

/**
 * The composition root for the channel. Ownership is wired HERE, in one place:
 *
 *   - `presence` owns the User entities (who's in the room).
 *   - `messages` owns the Message entities.
 *
 * The server handler below is the ONE writer. It is the only code that mutates
 * either store. Components receive `presence.reader` / `messages.reader` — read
 * handles with no write method — so authority is structural, not a rule you
 * remember. And the lifecycle is right there in the verbs: join → `upsert`
 * (birth, rejoin-safe), leave → `destroyIfPresent` (death), message → `spawn`
 * (a new entity per id). You can read the room's whole authority model in this
 * one function.
 */
export function createChannel(server: Server) {
  const presence = createEntityStore<User>();
  const messages = createEntityStore<Message>();

  const unsubscribe = server.subscribe((event) => {
    switch (event.type) {
      case "join":
        presence.upsert(event.user.id, event.user); // birth
        break;
      case "leave":
        presence.destroyIfPresent(event.userId); // death
        break;
      case "typing":
        // strict update would throw if they left mid-flight; the explicit guard
        // is the deliberate, readable way to say "only if still here".
        if (presence.reader.has(event.userId)) {
          presence.update(event.userId, { typing: event.typing });
        }
        break;
      case "message":
        messages.spawn(event.message.id, event.message); // a message is born
        break;
    }
  });

  const stop = server.start();

  return {
    presence: presence.reader,
    messages: messages.reader,
    send: (text: string) => server.send(text),
    dispose: () => {
      unsubscribe();
      stop();
    },
  };
}

export type Channel = ReturnType<typeof createChannel>;
