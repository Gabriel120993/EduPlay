import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@prisma/client": "./.prisma-client",
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.db.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
  },
});
