import { describe, expect, it, vi } from "vitest";
import { createEntityStore, type EntityReader } from "./entities.js";
import { createMemoryPersistence } from "./persistence.js";

interface User {
  name: string;
  status?: string;
}

describe("createEntityStore — strict lifecycle (default)", () => {
  it("spawn adds an entity and reads reflect it", () => {
    const store = createEntityStore<User>();
    store.spawn("u1", { name: "Cody" });
    expect(store.reader.getEntity("u1")).toEqual({ name: "Cody" });
    expect(store.reader.has("u1")).toBe(true);
    expect(store.reader.get().size).toBe(1);
  });

  it("spawn throws if the id is already alive, and names the escape hatch", () => {
    const store = createEntityStore<User>();
    store.spawn("u1", { name: "Cody" });
    expect(() => store.spawn("u1", { name: "Other" })).toThrow(/upsert\(\)/);
    // original is untouched
    expect(store.reader.getEntity("u1")).toEqual({ name: "Cody" });
  });

  it("update shallow-merges an existing entity", () => {
    const store = createEntityStore<User>();
    store.spawn("u1", { name: "Cody" });
    const merged = store.update("u1", { status: "online" });
    expect(merged).toEqual({ name: "Cody", status: "online" });
    expect(store.reader.getEntity("u1")).toEqual({
      name: "Cody",
      status: "online",
    });
  });

  it("update throws if the id is absent, and names the escape hatch", () => {
    const store = createEntityStore<User>();
    expect(() => store.update("ghost", { name: "x" })).toThrow(/upsert\(\)/);
  });

  it("destroy removes an entity", () => {
    const store = createEntityStore<User>();
    store.spawn("u1", { name: "Cody" });
    store.destroy("u1");
    expect(store.reader.has("u1")).toBe(false);
  });

  it("destroy throws if the id is absent, and names the escape hatch", () => {
    const store = createEntityStore<User>();
    expect(() => store.destroy("ghost")).toThrow(/destroyIfPresent\(\)/);
  });
});

describe("createEntityStore — explicit escape hatches", () => {
  it("upsert spawns when absent and replaces when present, never throwing", () => {
    const store = createEntityStore<User>();
    store.upsert("u1", { name: "Cody" }); // spawns
    store.upsert("u1", { name: "Cody M" }); // replaces (full replace, not merge)
    expect(store.reader.getEntity("u1")).toEqual({ name: "Cody M" });
  });

  it("destroyIfPresent returns false for an absent id without throwing", () => {
    const store = createEntityStore<User>();
    expect(store.destroyIfPresent("ghost")).toBe(false);
  });

  it("destroyIfPresent returns true and removes when present", () => {
    const store = createEntityStore<User>();
    store.spawn("u1", { name: "Cody" });
    expect(store.destroyIfPresent("u1")).toBe(true);
    expect(store.reader.has("u1")).toBe(false);
  });
});

describe("createEntityStore — reactivity & authority", () => {
  it("notifies subscribers on every mutation with a fresh map reference", () => {
    const store = createEntityStore<User>();
    const listener = vi.fn();
    store.reader.subscribe(listener);

    const before = store.reader.get();
    store.spawn("u1", { name: "Cody" });
    const after = store.reader.get();

    expect(listener).toHaveBeenCalledTimes(1);
    // copy-on-write: a new reference each commit, so useSyncExternalStore sees it
    expect(after).not.toBe(before);
  });

  it("the reader has no lifecycle methods on it (authority is structural)", () => {
    const store = createEntityStore<User>();
    const reader: EntityReader<User> = store.reader;
    const asRecord = reader as unknown as Record<string, unknown>;
    expect(asRecord.spawn).toBeUndefined();
    expect(asRecord.update).toBeUndefined();
    expect(asRecord.destroy).toBeUndefined();
    expect(asRecord.upsert).toBeUndefined();
    expect(asRecord.destroyIfPresent).toBeUndefined();
    expect(asRecord.clear).toBeUndefined();
    expect(asRecord.persist).toBeUndefined();
    expect(asRecord.rehydrate).toBeUndefined();
    expect(asRecord.set).toBeUndefined();
    expect(asRecord.setState).toBeUndefined();
    expect(Object.keys(reader).sort()).toEqual([
      "get",
      "getEntity",
      "has",
      "subscribe",
    ]);
  });

  it("clear empties the collection", () => {
    const store = createEntityStore<User>();
    store.spawn("u1", { name: "a" });
    store.spawn("u2", { name: "b" });
    store.clear();
    expect(store.reader.get().size).toBe(0);
  });

  it("clear is one administrative reset notification, not per-entity death", () => {
    const store = createEntityStore<User>();
    store.spawn("u1", { name: "a" });
    store.spawn("u2", { name: "b" });
    const listener = vi.fn();
    store.reader.subscribe(listener);
    store.clear();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not deep-freeze entity references returned by readers", () => {
    const store = createEntityStore<User>();
    const mutable = { name: "before" };
    store.spawn("u1", mutable);
    mutable.name = "after";
    expect(store.reader.getEntity("u1")?.name).toBe("after");
  });

  it("failed strict operations do not commit or notify", () => {
    const store = createEntityStore<User>();
    const listener = vi.fn();
    store.reader.subscribe(listener);
    expect(() => store.update("missing", { name: "x" })).toThrow();
    expect(() => store.destroy("missing")).toThrow();
    expect(listener).not.toHaveBeenCalled();
    expect(store.reader.get().size).toBe(0);
  });
});

describe("createEntityStore — persistence", () => {
  it("requires a key when persistence is provided", () => {
    const persistence = createMemoryPersistence();
    expect(() => createEntityStore<User>({ persistence })).toThrow(/key/);
  });

  it("auto-persists on write and rehydrates into a fresh store", () => {
    const persistence = createMemoryPersistence();
    const a = createEntityStore<User>({ persistence, key: "users" });
    a.spawn("u1", { name: "Cody" });
    a.update("u1", { status: "online" });

    const b = createEntityStore<User>({ persistence, key: "users" });
    expect(b.reader.has("u1")).toBe(false); // not loaded yet
    b.rehydrate();
    expect(b.reader.getEntity("u1")).toEqual({
      name: "Cody",
      status: "online",
    });
  });

  it("clear wipes persisted state too", () => {
    const persistence = createMemoryPersistence();
    const a = createEntityStore<User>({ persistence, key: "users" });
    a.spawn("u1", { name: "Cody" });
    a.clear();

    const b = createEntityStore<User>({ persistence, key: "users" });
    b.rehydrate();
    expect(b.reader.get().size).toBe(0);
  });

  it("recovers from corrupt persisted data by dropping it", () => {
    const persistence = createMemoryPersistence();
    persistence.set("users", "{ not valid json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const store = createEntityStore<User>({ persistence, key: "users" });
    store.rehydrate();

    expect(store.reader.get().size).toBe(0);
    expect(persistence.getString("users")).toBeNull(); // corrupt entry removed
    warn.mockRestore();
  });

  it("does nothing on persist/rehydrate when no persistence is configured", () => {
    const store = createEntityStore<User>();
    expect(() => {
      store.persist();
      store.rehydrate();
    }).not.toThrow();
  });

  it("commits in memory and warns when persistence fails", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const persistence = {
      getString: () => null,
      set: () => {
        throw new Error("disk full");
      },
      remove: () => {},
    };
    const store = createEntityStore<User>({ persistence, key: "users" });
    expect(() => store.spawn("u1", { name: "Cody" })).not.toThrow();
    expect(store.reader.has("u1")).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("keeps current memory state but removes corrupt persisted input", () => {
    const persistence = createMemoryPersistence();
    const store = createEntityStore<User>({ persistence, key: "users" });
    store.spawn("live", { name: "Current" });
    persistence.set("users", "not-json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    store.rehydrate();
    expect(store.reader.getEntity("live")).toEqual({ name: "Current" });
    expect(persistence.getString("users")).toBeNull();
    warn.mockRestore();
  });
});

describe("createEntityStore — realistic churn", () => {
  it("survives repeated entity and subscription churn deterministically", () => {
    const store = createEntityStore<User>();
    let notifications = 0;
    const unsubscribers = Array.from({ length: 50 }, () =>
      store.reader.subscribe(() => {
        notifications += 1;
      }),
    );

    for (let index = 0; index < 1_000; index++) {
      const id = `u${index}`;
      store.spawn(id, { name: id });
      store.update(id, { status: "online" });
      store.destroy(id);
    }

    for (const unsubscribe of unsubscribers) unsubscribe();
    store.spawn("after-cleanup", { name: "quiet" });
    expect(notifications).toBe(1_000 * 3 * 50);
    expect(store.reader.get().size).toBe(1);
  });
});
