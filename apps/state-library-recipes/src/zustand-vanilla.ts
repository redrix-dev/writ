import { createStore } from "zustand/vanilla";
import type { Message } from "./shared.js";

type ChannelStore = {
  messages: Record<string, Message>;
  receive(message: Message): void;
  remove(messageId: string): void;
};

/** Normal Zustand: state and colocated actions on a vanilla store. */
export const createVanillaZustandChannel = () =>
  createStore<ChannelStore>((set) => ({
    messages: {},
    receive(message) {
      set((state) => ({
        messages: { ...state.messages, [message.id]: message },
      }));
    },
    remove(messageId) {
      set((state) => {
        const { [messageId]: _removed, ...messages } = state.messages;
        return { messages };
      });
    },
  }));

export const selectMessages = (state: ChannelStore): readonly Message[] =>
  Object.values(state.messages);
