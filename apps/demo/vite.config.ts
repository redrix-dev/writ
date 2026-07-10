import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const fromRoot = (p: string) =>
  fileURLToPath(new URL(p, import.meta.url));

// Resolve the workspace packages straight to their source, so the demo compiles
// and hot-reloads from source with no build-order dance — and bundles cleanly
// for deploy the same way.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@redrixx/nexus-react": fromRoot("../../packages/react/src/index.ts"),
      "@redrixx/nexus": fromRoot("../../packages/core/src/index.ts"),
    },
  },
});
