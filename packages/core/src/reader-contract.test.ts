import { describe, expect, it, vi } from "vitest";
import { createEntityStore } from "./entities.js";
import { createCell, type Reader } from "./store.js";

type Harness = {
  reader: Reader<number>;
  write(value: number): void;
};

const builtInReaders: ReadonlyArray<readonly [string, () => Harness]> = [
  [
    "cell",
    () => {
      const writer = createCell(0);
      return { reader: writer.reader, write: (value) => writer.set(value) };
    },
  ],
  [
    "entity projection",
    () => {
      const store = createEntityStore<{ value: number }>();
      const reader: Reader<number> = {
        get: () => store.reader.getEntity("value")?.value ?? 0,
        subscribe: store.reader.subscribe,
      };
      return {
        reader,
        write(value) {
          store.upsert("value", { value });
        },
      };
    },
  ],
];

describe.each(builtInReaders)(
  "built-in reader contract: %s",
  (_name, create) => {
    it("provides a synchronous snapshot and unsubscribe function", () => {
      const harness = create();
      expect(harness.reader.get()).toBe(0);
      expect(typeof harness.reader.subscribe(() => {})).toBe("function");
    });

    it("notifies after a committed change and stops after cleanup", () => {
      const harness = create();
      const listener = vi.fn();
      const unsubscribe = harness.reader.subscribe(listener);
      harness.write(1);
      expect(harness.reader.get()).toBe(1);
      expect(listener).toHaveBeenCalledOnce();
      unsubscribe();
      harness.write(2);
      expect(listener).toHaveBeenCalledOnce();
    });
  },
);
