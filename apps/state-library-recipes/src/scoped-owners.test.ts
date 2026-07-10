import { describe, expect, it } from "vitest";
import { BuiltInCommunityOwner } from "./builtin.js";
import type { MessageEvent, RealtimeSource } from "./shared.js";
import { ZustandCommunityOwner } from "./zustand-projectname-shaped.js";

function createRealtimeHarness() {
  const listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  const source: RealtimeSource = {
    subscribe(channelId, receive) {
      const channelListeners = listeners.get(channelId) ?? new Set();
      channelListeners.add(receive);
      listeners.set(channelId, channelListeners);
      return () => channelListeners.delete(receive);
    },
  };
  return {
    source,
    count: (channelId: string) => listeners.get(channelId)?.size ?? 0,
  };
}

describe("lazy scoped owner registries", () => {
  it("creates built-in owners lazily, reuses them, and cleans subscriptions", () => {
    const realtime = createRealtimeHarness();
    const community = new BuiltInCommunityOwner(realtime.source);
    expect(realtime.count("general")).toBe(0);
    const first = community.channel("general");
    expect(community.channel("general")).toBe(first);
    expect(realtime.count("general")).toBe(1);
    community.closeChannel("general");
    expect(realtime.count("general")).toBe(0);
    expect(community.channel("general")).not.toBe(first);
  });

  it("applies the same lifecycle to the projectname-shaped Zustand owner", () => {
    const realtime = createRealtimeHarness();
    const community = new ZustandCommunityOwner(realtime.source);
    const first = community.channel("general");
    expect(community.channel("general")).toBe(first);
    expect(realtime.count("general")).toBe(1);
    community.closeChannel("general");
    expect(realtime.count("general")).toBe(0);
    expect(community.channel("general")).not.toBe(first);
  });

  it("handles repeated scope creation and destruction without leaking", () => {
    const realtime = createRealtimeHarness();
    const community = new BuiltInCommunityOwner(realtime.source);
    for (let index = 0; index < 500; index++) {
      const id = `channel-${index}`;
      community.channel(id);
      community.closeChannel(id);
      expect(realtime.count(id)).toBe(0);
    }
  });
});
