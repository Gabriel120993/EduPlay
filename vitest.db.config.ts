import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@prisma/client": "./.prisma-client",
    },
  },
  test: {
    include: ["tests/**/*.db.test.ts"],
    setupFiles: ["tests/setup-db-env.ts"],
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
