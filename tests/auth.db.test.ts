import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let container: StartedPostgreSqlContainer | null = null;
let app: import("express").Express;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..");

describe("Auth con PostgreSQL real", () => {
  beforeAll(async () => {
    vi.resetModules();

    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("eduplay_test")
      .withUsername("postgres")
      .withPassword("postgres")
      .start();

    process.env.DATABASE_URL = container.getConnectionUri();

    execSync("npx prisma db push --skip-generate", {
      cwd: repoRoot,
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    const { createApp } = await import("../src/app");
    app = createApp();
  });

  afterAll(async () => {
    const prismaModule = await import("../src/lib/prisma");
    await prismaModule.prisma.$disconnect();
    if (container) {
      await container.stop();
    }
  });

  it("registra y permite login de tutor", async () => {
    const registerRes = await request(app).post("/auth/register").send({
      email: "padre1@eduplay.dev",
      password: "secreto123",
    });

    expect(registerRes.status).toBe(201);
    expect(typeof registerRes.body.token).toBe("string");
    expect(registerRes.body.parent.email).toBe("padre1@eduplay.dev");

    const loginRes = await request(app).post("/auth/login").send({
      email: "padre1@eduplay.dev",
      password: "secreto123",
    });

    expect(loginRes.status).toBe(200);
    expect(typeof loginRes.body.token).toBe("string");
    expect(loginRes.body.parent.id).toBe(registerRes.body.parent.id);
  });

  it("rechaza login con password incorrecta", async () => {
    await request(app).post("/auth/register").send({
      email: "padre2@eduplay.dev",
      password: "password-ok",
    });

    const loginRes = await request(app).post("/auth/login").send({
      email: "padre2@eduplay.dev",
      password: "password-bad",
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.error).toBe("Credenciales inválidas.");
  });
});
