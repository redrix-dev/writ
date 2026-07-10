import { describe, expect, it } from "vitest";
import { AppOwner } from "./community-channel-registry.js";
import type { MessageEvent, RealtimeSource } from "./shared.js";

describe("community → channel → message registry", () => {
  it("creates scopes lazily, reuses surfaces, and disposes the whole subtree", async () => {
    const listeners = new Map<string, Set<(event: MessageEvent) => void>>();
    const realtime: RealtimeSource = {
      subscribe(channelId, listener) {
        const set = listeners.get(channelId) ?? new Set();
        set.add(listener);
        listeners.set(channelId, set);
        return () => set.delete(listener);
      },
    };
    const app = new AppOwner(realtime, {
      async send() {
        return { id: "optimistic-1" };
      },
    });

    const community = app.surface.community("community-1");
    expect(app.surface.community("community-1")).toBe(community);
    const channel = community.channel("general");
    expect(community.channel("general")).toBe(channel);
    expect(listeners.get("general")?.size).toBe(1);

    await channel.send("hello");
    expect(channel.messages.getEntity("optimistic-1")?.body).toBe("hello");

    app.surface.leaveCommunity("community-1");
    expect(listeners.get("general")?.size).toBe(0);
    expect(channel.messages.get().size).toBe(0);
    expect(app.surface.community("community-1")).not.toBe(community);
  });
});
