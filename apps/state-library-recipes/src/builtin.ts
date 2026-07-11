import { createEntityStore, type EntityReader } from "@redrixx/writ";
import type { Message, RealtimeSource } from "./shared.js";

export class BuiltInChannelOwner {
  readonly #messages = createEntityStore<Message>();
  readonly #unsubscribe: () => void;

  readonly messages: EntityReader<Message> = this.#messages.reader;

  constructor(
    readonly channelId: string,
    realtime: RealtimeSource,
  ) {
    this.#unsubscribe = realtime.subscribe(channelId, (event) => {
      this.#messages.spawn(event.message.id, event.message);
    });
  }

  dispose(): void {
    this.#unsubscribe();
    this.#messages.clear();
  }
}

export class BuiltInCommunityOwner {
  readonly #channels = new Map<string, BuiltInChannelOwner>();

  constructor(readonly realtime: RealtimeSource) {}

  channel(channelId: string): BuiltInChannelOwner {
    let owner = this.#channels.get(channelId);
    if (!owner) {
      owner = new BuiltInChannelOwner(channelId, this.realtime);
      this.#channels.set(channelId, owner);
    }
    return owner;
  }

  closeChannel(channelId: string): void {
    this.#channels.get(channelId)?.dispose();
    this.#channels.delete(channelId);
  }
}
