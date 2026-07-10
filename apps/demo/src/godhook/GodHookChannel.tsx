import { ChannelView } from "../ui/ChannelView.js";
import { useChannel } from "./useChannel.js";
import type { Server } from "../simulator.js";

/**
 * The god-hook channel. One `useChannel` call returns the whole world — and its
 * message state actually lives in a module global, its visibility rule in a
 * separate store. This component re-renders on every event in the room.
 */
export function GodHookChannel({ server }: { server: Server }) {
  const { roster, typers, messages, blockedIds, send, toggleBlock } =
    useChannel(server);
  return (
    <ChannelView
      roster={roster}
      typers={typers}
      messages={messages}
      blockedIds={blockedIds}
      onSend={send}
      onToggleBlock={toggleBlock}
    />
  );
}
