import { describe, expect, it, vi } from "vitest";
import { createCell, type Reader } from "./store.js";

describe("createCell", () => {
  it("reads the initial value", () => {
    const cell = createCell(0);
    expect(cell.reader.get()).toBe(0);
  });

  it("writes a new value and reads it back", () => {
    const cell = createCell(1);
    cell.set(2);
    expect(cell.reader.get()).toBe(2);
  });

  it("supports updater functions", () => {
    const cell = createCell(10);
    cell.set((n) => n + 5);
    expect(cell.reader.get()).toBe(15);
  });

  it("notifies subscribers on change", () => {
    const cell = createCell("a");
    const listener = vi.fn();
    cell.reader.subscribe(listener);
    cell.set("b");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify when the value is unchanged (Object.is)", () => {
    const cell = createCell("same");
    const listener = vi.fn();
    cell.reader.subscribe(listener);
    cell.set("same");
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const cell = createCell(0);
    const listener = vi.fn();
    const unsubscribe = cell.reader.subscribe(listener);
    cell.set(1);
    unsubscribe();
    cell.set(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tolerates a listener unsubscribing during notification", () => {
    const cell = createCell(0);
    const calls: string[] = [];
    const unsubA = cell.reader.subscribe(() => {
      calls.push("a");
      unsubA();
    });
    cell.reader.subscribe(() => calls.push("b"));
    cell.set(1);
    cell.set(2);
    // "a" fires once (then removes itself), "b" fires on both commits.
    expect(calls).toEqual(["a", "b", "b"]);
  });

  it("is the exact shape useSyncExternalStore consumes", () => {
    const cell = createCell({ n: 1 });
    // subscribe(cb) + getSnapshot() — no extra args required.
    const snapshot = cell.reader.get();
    const unsub = cell.reader.subscribe(() => {});
    expect(typeof unsub).toBe("function");
    expect(snapshot).toEqual({ n: 1 });
  });

  describe("authority is structural (the thesis)", () => {
    it("the reader handed to consumers has no write method", () => {
      const cell = createCell(0);
      const reader: Reader<number> = cell.reader;
      // A consumer only ever receives `reader`. There is nothing on it to call
      // that mutates state — not `set`, not `setState`, not the raw store.
      const asRecord = reader as unknown as Record<string, unknown>;
      expect(asRecord.set).toBeUndefined();
      expect(asRecord.setState).toBeUndefined();
      expect(Object.keys(reader).sort()).toEqual(["get", "subscribe"]);
    });

    it("only the owner (holder of the Writer) can mutate", () => {
      const cell = createCell(0);
      // The owner holds `cell` (a Writer) and can write.
      cell.set(1);
      expect(cell.reader.get()).toBe(1);
      // Everyone else holds `cell.reader` and cannot — enforced by the type
      // system at compile time and by the absence of the method at runtime.
    });

    it("sharing the Writer deliberately shares authority", () => {
      const owner = createCell(0);
      const secondHolder = owner;
      secondHolder.set(2);
      expect(owner.reader.get()).toBe(2);
    });

    it("does not deep-freeze mutable values returned by readers", () => {
      const owner = createCell({ nested: { count: 0 } });
      const exposed = owner.reader.get();
      exposed.nested.count = 1;
      expect(owner.reader.get().nested.count).toBe(1);
    });
  });
});
