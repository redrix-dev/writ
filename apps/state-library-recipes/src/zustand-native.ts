import { createStore, type StoreApi } from "zustand/vanilla";
import type { Message } from "./shared.js";

type MessageState = Readonly<{
  messages: Readonly<Record<string, Message>>;
}>;

export class DisciplinedZustandChannel {
  readonly #store = createStore<MessageState>(() => ({ messages: {} }));

  /** Observation only; the mutable StoreApi remains private. */
  readonly reader = {
    getState: this.#store.getState,
    subscribe: this.#store.subscribe,
  } satisfies Pick<StoreApi<MessageState>, "getState" | "subscribe">;

  receive(message: Message): void {
    this.#store.setState((state) => ({
      messages: { ...state.messages, [message.id]: message },
    }));
  }
}
