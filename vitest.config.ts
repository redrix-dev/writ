import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.{ts,tsx}",
      "apps/demo/src/**/*.test.{ts,tsx}",
      "apps/state-library-recipes/src/**/*.test.{ts,tsx}",
    ],
  },
});
