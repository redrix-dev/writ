import { describe, expect, it } from "vitest";
import { EvidenceRuntime, type Mode } from "./runtime.js";

const latestResult = (
  mode: Mode,
  operation: Parameters<EvidenceRuntime["failure"]>[0],
) => {
  const runtime = new EvidenceRuntime(mode);
  runtime.failure(operation);
  return runtime.getSnapshot().history[0]!;
};

describe("evidence runtime", () => {
  it("shows ambient duplicate writes being accepted while disciplined modes reject them", () => {
    expect(latestResult("ambient", "duplicate-spawn").result).toBe("accepted");
    expect(latestResult("native", "duplicate-spawn").result).toBe("rejected");
    expect(latestResult("projectname", "duplicate-spawn").result).toBe(
      "rejected",
    );
  });

  it("shows the reader boundary and its deliberate writer-leak limit", () => {
    expect(latestResult("projectname", "reader-write").result).toBe("rejected");
    const leaked = latestResult("projectname", "leaked-writer");
    expect(leaked.result).toBe("accepted");
    expect(leaked.detail).toContain("deliberately shared");
  });

  it("filters messages when blocked-user policy is applied", () => {
    const runtime = new EvidenceRuntime("projectname");
    runtime.next(); // optimistic send
    runtime.next(); // policy block
    const snapshot = runtime.getSnapshot();
    expect(snapshot.hiddenMessages).toBe(1);
    expect(snapshot.messages.map((message) => message.author)).toEqual(["You"]);
  });

  it("marks scoped owners disposed and releases their subscribers", () => {
    const runtime = new EvidenceRuntime("projectname");
    for (let index = 0; index < 8; index++) runtime.next();
    const disposed = runtime
      .getSnapshot()
      .scopes.find((scope) => scope.channelId === "releases");
    expect(disposed).toMatchObject({ disposed: true, subscribers: 0 });
  });
});
