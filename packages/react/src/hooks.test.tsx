// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createCell, createEntityStore } from "@redrixx/projectname";
import { useEntities, useEntity, useReader } from "./hooks.js";

interface Item {
  n: number;
}

describe("useReader", () => {
  it("returns the current value and re-renders on change", () => {
    const cell = createCell(0);
    const { result } = renderHook(() => useReader(cell.reader));
    expect(result.current).toBe(0);
    act(() => cell.set(5));
    expect(result.current).toBe(5);
  });
});

describe("useEntities", () => {
  it("returns the live map and re-renders on spawn", () => {
    const store = createEntityStore<Item>();
    const { result } = renderHook(() => useEntities(store.reader));
    expect(result.current.size).toBe(0);
    act(() => {
      store.spawn("a", { n: 1 });
    });
    expect(result.current.get("a")).toEqual({ n: 1 });
  });
});

describe("useEntity", () => {
  it("tracks a single entity through its lifecycle", () => {
    const store = createEntityStore<Item>();
    store.spawn("a", { n: 1 });
    const { result } = renderHook(() => useEntity(store.reader, "a"));
    expect(result.current).toEqual({ n: 1 });

    act(() => {
      store.update("a", { n: 2 });
    });
    expect(result.current).toEqual({ n: 2 });

    act(() => {
      store.destroy("a");
    });
    expect(result.current).toBeUndefined();
  });

  it("does not re-render when a different entity changes (selectivity)", () => {
    const store = createEntityStore<Item>();
    store.spawn("a", { n: 1 });
    store.spawn("b", { n: 1 });

    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useEntity(store.reader, "a");
    });
    const baseline = renders;

    act(() => {
      store.update("b", { n: 99 }); // touches b, not a
    });

    expect(result.current).toEqual({ n: 1 });
    expect(renders).toBe(baseline); // "a"'s reference is unchanged → no re-render
  });
});
