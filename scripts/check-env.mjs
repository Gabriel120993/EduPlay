import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(process.cwd());
config({ path: resolve(root, ".env") });

const need = ["DATABASE_URL", "JWT_SECRET"];
let ok = true;
if (!existsSync(resolve(root, ".env"))) {
  console.error("[check-env] Falta archivo .env (copiá .env.example a .env).");
  process.exit(1);
}
for (const k of need) {
  const v = process.env[k]?.trim();
  if (!v) {
    console.error(`[check-env] Falta o está vacía: ${k}`);
    ok = false;
  }
}
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error("[check-env] JWT_SECRET debe tener al menos 32 caracteres.");
  ok = false;
}
if (!ok) process.exit(1);
console.log("[check-env] DATABASE_URL y JWT_SECRET OK.");
console.log(`[check-env] PORT=${process.env.PORT || "3000"}`);
