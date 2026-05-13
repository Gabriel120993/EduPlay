import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const url = process.env.DATABASE_URL;
if (!url || typeof url !== "string") {
  console.error("DATABASE_URL no definida (.env)");
  process.exit(1);
}

const r = spawnSync(
  "npx",
  ["prisma", "migrate", "diff", "--from-url", url, "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
  { cwd: root, encoding: "utf8", shell: true }
);

if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
