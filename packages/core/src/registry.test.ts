import { describe, expect, it } from "vitest";
import { createRegistry } from "./registry.js";

interface Root {
  id: string;
}

describe("createRegistry", () => {
  it("require throws before registration, naming register()", () => {
    const reg = createRegistry<Root>("AppRoot");
    expect(() => reg.require()).toThrow(/AppRoot/);
    expect(() => reg.require()).toThrow(/register/);
  });

  it("get returns null before registration", () => {
    const reg = createRegistry<Root>("AppRoot");
    expect(reg.get()).toBeNull();
  });

  it("register then require returns the instance", () => {
    const reg = createRegistry<Root>("AppRoot");
    const root = { id: "a" };
    reg.register(root);
    expect(reg.require()).toBe(root);
    expect(reg.get()).toBe(root);
  });

  it("double register throws, naming reset()", () => {
    const reg = createRegistry<Root>("AppRoot");
    reg.register({ id: "a" });
    expect(() => reg.register({ id: "b" })).toThrow(/reset/);
    // original stands
    expect(reg.require().id).toBe("a");
  });

  it("reset clears the slot", () => {
    const reg = createRegistry<Root>("AppRoot");
    reg.register({ id: "a" });
    reg.reset();
    expect(reg.get()).toBeNull();
    expect(() => reg.require()).toThrow(/not registered/);
  });

  it("reset is the explicit path to re-register", () => {
    const reg = createRegistry<Root>("AppRoot");
    reg.register({ id: "a" });
    reg.reset();
    reg.register({ id: "b" });
    expect(reg.require().id).toBe("b");
  });

  it("separate registries are independent", () => {
    const a = createRegistry<Root>("A");
    const b = createRegistry<Root>("B");
    a.register({ id: "in-a" });
    expect(b.get()).toBeNull();
    expect(a.require().id).toBe("in-a");
  });

  it("treats a registered nullish instance as registered", () => {
    const reg = createRegistry<null>("Nullable");
    reg.register(null);
    expect(reg.get()).toBeNull(); // value is null, but it IS registered…
    expect(() => reg.register(null)).toThrow(/already registered/); // …so a second throws
  });
});
