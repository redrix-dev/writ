import { createStore, type StoreApi } from "zustand/vanilla";
import type { Message, RealtimeSource } from "./shared.js";

type ChannelState = Readonly<{
  messages: Readonly<Record<string, Message>>;
}>;

export type ZustandReader<S> = Pick<StoreApi<S>, "getState" | "subscribe">;

export type ChannelPublic = Readonly<{
  store: ZustandReader<ChannelState>;
  retry(messageId: string): void;
}>;

class ZustandChannelOwner {
  readonly #store = createStore<ChannelState>(() => ({ messages: {} }));
  readonly #unsubscribe: () => void;

  readonly public: ChannelPublic = {
    store: { getState: this.#store.getState, subscribe: this.#store.subscribe },
    retry: (messageId) => this.#retry(messageId),
  };

  constructor(
    readonly id: string,
    realtime: RealtimeSource,
  ) {
    this.#unsubscribe = realtime.subscribe(id, ({ message }) =>
      this.#receive(message),
    );
  }

  #receive(message: Message): void {
    this.#store.setState((state) => ({
      messages: { ...state.messages, [message.id]: message },
    }));
  }

  #retry(messageId: string): void {
    const message = this.#store.getState().messages[messageId];
    if (!message) return;
    this.#store.setState((state) => ({
      messages: {
        ...state.messages,
        [messageId]: { ...message, pending: true },
      },
    }));
  }

  dispose(): void {
    this.#unsubscribe();
    this.#store.setState({ messages: {} }, true);
  }
}

/** Haven's mobile pattern: one lazily created owner/store per community channel. */
export class ZustandCommunityOwner {
  readonly #channels = new Map<string, ZustandChannelOwner>();

  constructor(readonly realtime: RealtimeSource) {}

  channel(channelId: string): ChannelPublic {
    let owner = this.#channels.get(channelId);
    if (!owner) {
      owner = new ZustandChannelOwner(channelId, this.realtime);
      this.#channels.set(channelId, owner);
    }
    return owner.public;
  }

  closeChannel(channelId: string): void {
    this.#channels.get(channelId)?.dispose();
    this.#channels.delete(channelId);
  }
}
