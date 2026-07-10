import { ChannelView } from "../ui/ChannelView.js";
import { useChannel } from "./useChannel.js";
import type { Server } from "../simulator.js";

/**
 * The god-hook channel. One `useChannel` call returns the entire world, and
 * this component re-renders on every event in the room — a typing flicker three
 * users away re-renders the whole message list — because it subscribes to the
 * whole blob, not to what it reads.
 */
export function GodHookChannel({ server }: { server: Server }) {
  const { roster, typers, messages, send } = useChannel(server);
  return (
    <ChannelView
      roster={roster}
      typers={typers}
      messages={messages}
      onSend={send}
    />
  );
}
