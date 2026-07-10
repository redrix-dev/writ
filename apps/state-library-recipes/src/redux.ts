import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { Message, RealtimeSource } from "./shared.js";

type MessagesState = { byId: Record<string, Message> };
const initialMessagesState: MessagesState = { byId: {} };

const messagesSlice = createSlice({
  name: "messages",
  initialState: initialMessagesState,
  reducers: {
    received(state, action: PayloadAction<Message>) {
      state.byId[action.payload.id] = action.payload;
    },
  },
});

type ChannelStore = ReturnType<typeof createChannelStore>;
export type ReduxReader = Pick<ChannelStore, "getState" | "subscribe">;

const createChannelStore = () =>
  configureStore({
    reducer: { messages: messagesSlice.reducer },
  });

export class ReduxChannelOwner {
  readonly #store = createChannelStore();
  readonly #unsubscribe: () => void;
  readonly reader: ReduxReader = {
    getState: this.#store.getState,
    subscribe: this.#store.subscribe,
  };

  constructor(
    readonly channelId: string,
    realtime: RealtimeSource,
  ) {
    this.#unsubscribe = realtime.subscribe(channelId, ({ message }) => {
      this.#store.dispatch(messagesSlice.actions.received(message));
    });
  }

  dispose(): void {
    this.#unsubscribe();
  }
}
