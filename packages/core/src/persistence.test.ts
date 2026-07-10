import { describe, expect, it } from "vitest";
import { createMemoryPersistence } from "./persistence.js";

describe("createMemoryPersistence", () => {
  it("returns null for an absent key", () => {
    const p = createMemoryPersistence();
    expect(p.getString("missing")).toBeNull();
  });

  it("stores and reads back a value", () => {
    const p = createMemoryPersistence();
    p.set("k", "v");
    expect(p.getString("k")).toBe("v");
  });

  it("overwrites an existing value", () => {
    const p = createMemoryPersistence();
    p.set("k", "one");
    p.set("k", "two");
    expect(p.getString("k")).toBe("two");
  });

  it("removes a value", () => {
    const p = createMemoryPersistence();
    p.set("k", "v");
    p.remove("k");
    expect(p.getString("k")).toBeNull();
  });

  it("treats remove of an absent key as a no-op", () => {
    const p = createMemoryPersistence();
    expect(() => p.remove("missing")).not.toThrow();
  });

  it("isolates separate instances", () => {
    const a = createMemoryPersistence();
    const b = createMemoryPersistence();
    a.set("k", "in-a");
    expect(b.getString("k")).toBeNull();
  });
});
