import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for pure server logic (no database, sandbox or network).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/**/*.test.js"], environment: "node", setupFiles: ["tests/setup.js"] },
});
