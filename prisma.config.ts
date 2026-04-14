import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  engine: "classic",
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: 'npx ts-node -r tsconfig-paths/register --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
