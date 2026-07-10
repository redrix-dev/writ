import { useEffect, useMemo, useRef } from "react";
import { useEntities, useReader } from "@redrixx/nexus-react";
import { ChannelView } from "../ui/ChannelView.js";
import { createChannel, type Channel } from "./channel.js";
import type { Server } from "../simulator.js";

/**
 * The Nexus channel. Components are readers: this reads the two stores through
 * their readers and derives its views. It CANNOT mutate them — there is no
 * setter in scope. Presence and messages are independent authorities, so a
 * component that only needed the roster could subscribe to `presence` alone and
 * never re-render on a new message.
 */
export function NexusChannel({ server }: { server: Server }) {
  // Construct the composition root once for this mount. (Demo runs without
  // StrictMode so this render-time init stays single.)
  const ref = useRef<Channel | null>(null);
  if (ref.current === null) ref.current = createChannel(server);
  const channel = ref.current;

  useEffect(() => () => channel.dispose(), [channel]);

  const presence = useEntities(channel.presence);
  const messages = useEntities(channel.messages);
  const blocked = useReader(channel.blocked);

  const roster = useMemo(
    () => [...presence.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [presence],
  );
  const typers = useMemo(() => roster.filter((u) => u.typing), [roster]);
  const messageList = useMemo(
    () =>
      [...messages.values()]
        .filter((m) => !blocked.has(m.authorId))
        .sort((a, b) => a.at - b.at),
    [messages, blocked],
  );

  return (
    <ChannelView
      roster={roster}
      typers={typers}
      messages={messageList}
      blockedIds={blocked}
      onSend={channel.send}
      onToggleBlock={channel.toggleBlock}
    />
  );
}
