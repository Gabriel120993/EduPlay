/**
 * Actualiza los checksums en _prisma_migrations para que coincidan con los
 * archivos migration.sql actuales (corrige "migration was modified after it was applied").
 *
 * Uso:
 *   node scripts/prisma-repair-checksums.mjs
 *   npx prisma db execute --file scripts/_repair_checksums.sql --schema prisma/schema.prisma
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const migrationsDir = join(root, "prisma", "migrations");

const dirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let sql =
  "-- Generado por scripts/prisma-repair-checksums.mjs — no editar a mano\n";

for (const name of dirs) {
  const filePath = join(migrationsDir, name, "migration.sql");
  const raw = readFileSync(filePath, "utf8");
  const content = raw.replace(/\r\n/g, "\n");
  const checksum = createHash("sha256").update(content, "utf8").digest("hex");
  sql += `UPDATE "_prisma_migrations" SET checksum = '${checksum}' WHERE migration_name = '${name}';\n`;
}

const outPath = join(root, "scripts", "_repair_checksums.sql");
writeFileSync(outPath, sql, "utf8");
console.log(`Escrito ${outPath}`);
console.log(
  "Siguiente paso: npx prisma db execute --file scripts/_repair_checksums.sql --schema prisma/schema.prisma"
);
