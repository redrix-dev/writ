/**
 * Host-agnostic warning. Core targets no specific runtime (no DOM, no Node
 * types), so it can't assume a `console` global exists at the type level. This
 * reaches one safely if the host provides it, and is a no-op otherwise —
 * warnings are diagnostics, never load-bearing.
 */
export function warn(message: string, error: unknown): void {
  const host = globalThis as {
    console?: { warn?: (...args: unknown[]) => void };
  };
  host.console?.warn?.(message, error);
}
