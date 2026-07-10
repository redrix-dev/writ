export type Message = Readonly<{
  id: string;
  channelId: string;
  body: string;
  pending: boolean;
}>;

export type MessageEvent = Readonly<{
  type: "message.created";
  message: Message;
}>;

export interface RealtimeSource {
  subscribe(
    channelId: string,
    receive: (event: MessageEvent) => void,
  ): () => void;
}

export interface MessageTransport {
  send(channelId: string, body: string): Promise<{ id: string }>;
}

export const createOptimisticMessage = (
  channelId: string,
  body: string,
): Message => ({
  id: crypto.randomUUID(),
  channelId,
  body,
  pending: true,
});
