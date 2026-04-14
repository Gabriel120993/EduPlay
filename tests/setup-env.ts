import { vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/eduplay_test?schema=public";
process.env.JWT_SECRET = "test-jwt-secret-with-at-least-thirty-two-chars";
process.env.LOGIN_REGISTER_RATE_LIMIT_MAX = "1";
process.env.LOGIN_REGISTER_RATE_LIMIT_WINDOW_MS = "60000";

vi.mock("@prisma/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@prisma/client");
  return {
    ...actual,
    ContentReportTarget: actual.ContentReportTarget ?? {
      POST: "POST",
      USER: "USER",
      CHAT_MESSAGE: "CHAT_MESSAGE",
    },
    ContentReportStatus: actual.ContentReportStatus ?? {
      OPEN: "OPEN",
      DISMISSED: "DISMISSED",
      ESCALATED: "ESCALATED",
    },
  };
});
