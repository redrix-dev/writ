import type { Message } from "./shared.js";

export type ExternalStoreReader<S> = Readonly<{
  get(): S;
  subscribe(listener: () => void): () => void;
}>;

export type ExternalStoreWriter<S> = Readonly<{
  reader: ExternalStoreReader<S>;
  set(update: S | ((current: S) => S)): void;
}>;

export function createExternalStore<S>(initial: S): ExternalStoreWriter<S> {
  let value = initial;
  const listeners = new Set<() => void>();
  const reader: ExternalStoreReader<S> = {
    get: () => value,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    reader,
    set(update) {
      value =
        typeof update === "function"
          ? (update as (current: S) => S)(value)
          : update;
      for (const listener of listeners) listener();
    },
  };
}

export function createHandRolledChannel() {
  const messages = createExternalStore<ReadonlyMap<string, Message>>(new Map());
  return {
    messages: messages.reader,
    receive(message: Message) {
      messages.set((current) => new Map(current).set(message.id, message));
    },
  };
}
