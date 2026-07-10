import type { EntityReader, EntityStore } from "./entities.js";
import type { Reader, Writer } from "./store.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

type MutationNames =
  | "set"
  | "setState"
  | "spawn"
  | "update"
  | "destroy"
  | "upsert"
  | "destroyIfPresent"
  | "clear"
  | "persist"
  | "rehydrate";

type _ReaderHasNoMutationKeys = Expect<
  Equal<Extract<keyof Reader<number>, MutationNames>, never>
>;
type _EntityReaderHasNoMutationKeys = Expect<
  Equal<Extract<keyof EntityReader<{ value: number }>, MutationNames>, never>
>;
type _WriterDoesHaveSet = Expect<
  Equal<Extract<keyof Writer<number>, "set">, "set">
>;
type _EntityWriterHasLifecycle = Expect<
  Equal<
    Extract<
      keyof EntityStore<{ value: number }>,
      "spawn" | "update" | "destroy"
    >,
    "spawn" | "update" | "destroy"
  >
>;

export type ContractTypeAssertions =
  | _ReaderHasNoMutationKeys
  | _EntityReaderHasNoMutationKeys
  | _WriterDoesHaveSet
  | _EntityWriterHasLifecycle;
