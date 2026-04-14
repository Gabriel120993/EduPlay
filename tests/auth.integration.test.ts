import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  parent: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

const bcryptCompareMock = vi.fn();

vi.mock("../src/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: bcryptCompareMock,
  },
}));

let app: import("express").Express;

beforeAll(async () => {
  vi.resetModules();
  const { createApp } = await import("../src/app");
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Auth integration", () => {
  it("rechaza login-child inválido con 400", async () => {
    const response = await request(app).post("/auth/login-child").send({
      username: "",
      password: "123",
    });

    expect(response.status).toBe(400);
    expect(typeof response.body.error).toBe("string");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza /auth/me sin token", async () => {
    const response = await request(app).get("/auth/me");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("No autenticado.");
  });

  it("rechaza /auth/me con token inválido", async () => {
    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer token-invalido");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token inválido.");
  });

  it("devuelve sesión de parent en /auth/me con JWT válido", async () => {
    const { createParentAuthToken } = await import("../src/lib/auth");
    const token = createParentAuthToken("parent-1", "parent@example.com");

    prismaMock.parent.findUnique.mockResolvedValue({
      isPremium: true,
      premiumUntil: new Date("2030-01-01T00:00:00.000Z"),
    });
    prismaMock.user.findMany.mockResolvedValue([
      { id: "child-1", username: "nina", realName: "Nina" },
    ]);

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("parent");
    expect(response.body.parent.email).toBe("parent@example.com");
    expect(Array.isArray(response.body.children)).toBe(true);
    expect(response.body.children).toHaveLength(1);
  });

  it("aplica rate-limit en login/register tras 1 intento", async () => {
    prismaMock.parent.findUnique.mockResolvedValue({
      id: "parent-1",
      email: "parent@example.com",
      password: "hashed-password",
      isPremium: false,
      premiumUntil: null,
    });
    bcryptCompareMock.mockResolvedValue(true);

    const first = await request(app).post("/auth/login").send({
      email: "parent@example.com",
      password: "secreto123",
    });
    expect(first.status).toBe(200);

    const second = await request(app).post("/auth/login").send({
      email: "parent@example.com",
      password: "secreto123",
    });
    expect(second.status).toBe(429);
    expect(second.body.error).toContain("Demasiados intentos");
  });
});
