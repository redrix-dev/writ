import { createMemo, type Accessor } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import type { Message, RealtimeSource } from "./shared.js";

type ChannelState = {
  messages: Record<string, Message>;
};

/** Haven's Solid pattern: keep Solid's proxy; expose projections and named writes. */
export class SolidChannelOwner {
  readonly #state: ChannelState;
  readonly #setState: SetStoreFunction<ChannelState>;
  readonly #unsubscribe: () => void;

  constructor(
    readonly channelId: string,
    realtime: RealtimeSource,
  ) {
    [this.#state, this.#setState] = createStore<ChannelState>({ messages: {} });
    this.#unsubscribe = realtime.subscribe(channelId, ({ message }) => {
      this.#setState("messages", message.id, message);
    });
  }

  messages(): Accessor<readonly Message[]> {
    return createMemo(() => Object.values(this.#state.messages));
  }

  retry(messageId: string): void {
    const message = this.#state.messages[messageId];
    if (message)
      this.#setState("messages", messageId, { ...message, pending: true });
  }

  dispose(): void {
    this.#unsubscribe();
    this.#setState("messages", {});
  }
}
