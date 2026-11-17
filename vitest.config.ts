import { defineConfig } from "vitest/config";

// Kept apart from vite.config.ts: that one switches its root to gallery/ for
// serving, which would hide the library's own tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
