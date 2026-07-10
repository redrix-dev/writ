import { createEntityStore, type EntityReader } from "@redrixx/nexus";
import type { Message, MessageTransport, RealtimeSource } from "./shared.js";

export type ChannelSurface = Readonly<{
  messages: EntityReader<Message>;
  send(body: string): Promise<void>;
}>;

class ChannelOwner {
  readonly #messages = createEntityStore<Message>();
  readonly #unsubscribe: () => void;
  #disposed = false;

  readonly surface: ChannelSurface = {
    messages: this.#messages.reader,
    send: (body) => this.send(body),
  };

  constructor(
    readonly communityId: string,
    readonly channelId: string,
    realtime: RealtimeSource,
    readonly transport: MessageTransport,
  ) {
    this.#unsubscribe = realtime.subscribe(channelId, ({ message }) => {
      if (this.#disposed) return;
      // Live delivery asserts a new message. Reconnect replay would deliberately
      // route through a separate upsert command instead of weakening this path.
      this.#messages.spawn(message.id, message);
    });
  }

  async send(body: string): Promise<void> {
    if (this.#disposed) throw new Error("channel owner is disposed");
    const { id } = await this.transport.send(this.channelId, body);
    this.#messages.spawn(id, {
      id,
      channelId: this.channelId,
      body,
      pending: true,
    });
  }

  replay(message: Message): void {
    if (this.#disposed) return;
    this.#messages.upsert(message.id, message);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe();
    this.#messages.clear();
  }
}

export type CommunitySurface = Readonly<{
  channel(channelId: string): ChannelSurface;
  closeChannel(channelId: string): void;
}>;

class CommunityOwner {
  readonly #channels = new Map<string, ChannelOwner>();

  readonly surface: CommunitySurface = {
    channel: (channelId) => this.channel(channelId),
    closeChannel: (channelId) => this.closeChannel(channelId),
  };

  constructor(
    readonly communityId: string,
    readonly realtime: RealtimeSource,
    readonly transport: MessageTransport,
  ) {}

  channel(channelId: string): ChannelSurface {
    let owner = this.#channels.get(channelId);
    if (!owner) {
      owner = new ChannelOwner(
        this.communityId,
        channelId,
        this.realtime,
        this.transport,
      );
      this.#channels.set(channelId, owner);
    }
    return owner.surface;
  }

  closeChannel(channelId: string): void {
    this.#channels.get(channelId)?.dispose();
    this.#channels.delete(channelId);
  }

  dispose(): void {
    for (const owner of this.#channels.values()) owner.dispose();
    this.#channels.clear();
  }
}

export type AppSurface = Readonly<{
  community(communityId: string): CommunitySurface;
  leaveCommunity(communityId: string): void;
}>;

export class AppOwner {
  readonly #communities = new Map<string, CommunityOwner>();

  readonly surface: AppSurface = {
    community: (communityId) => this.community(communityId),
    leaveCommunity: (communityId) => this.leaveCommunity(communityId),
  };

  constructor(
    readonly realtime: RealtimeSource,
    readonly transport: MessageTransport,
  ) {}

  community(communityId: string): CommunitySurface {
    let owner = this.#communities.get(communityId);
    if (!owner) {
      owner = new CommunityOwner(communityId, this.realtime, this.transport);
      this.#communities.set(communityId, owner);
    }
    return owner.surface;
  }

  leaveCommunity(communityId: string): void {
    this.#communities.get(communityId)?.dispose();
    this.#communities.delete(communityId);
  }

  dispose(): void {
    for (const owner of this.#communities.values()) owner.dispose();
    this.#communities.clear();
  }
}
