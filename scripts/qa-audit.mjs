/**
 * Auditoría QA ligera para EduPlay (sin dependencias extra).
 * Uso: node scripts/qa-audit.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/** @typedef {{ type: "ERROR"|"WARNING"|"INFO"; category: string; file: string; message: string; suggestion: string }} QAIssue */

/** @type {QAIssue[]} */
const issues = [];

function push(type, category, file, message, suggestion) {
  issues.push({ type, category, file, message, suggestion });
}

function dirHasPattern(dir, endsWith) {
  if (!existsSync(dir)) return false;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) stack.push(full);
      else if (name.endsWith(endsWith)) return true;
    }
  }
  return false;
}

function hasTestFile(dir) {
  return dirHasPattern(dir, ".test.ts");
}

function checkTestLayout() {
  const unitDir = join(root, "tests", "unit");
  const intDir = join(root, "tests", "integration");
  const e2eDir = join(root, "tests", "e2e");

  if (!existsSync(unitDir)) {
    push("ERROR", "Tests", "tests/unit", "Falta el directorio tests/unit/", "Creá tests unitarios bajo tests/unit/**/*.test.ts");
  } else if (!hasTestFile(unitDir)) {
    push("WARNING", "Tests", "tests/unit", "No se encontraron *.test.ts en tests/unit/", "Añadí al menos un archivo *.test.ts");
  }

  if (!existsSync(intDir)) {
    push("WARNING", "Tests", "tests/integration", "No existe tests/integration/ (convención del prompt QA)", "Podés mover tests de API mock aquí o añadir .gitkeep + tests nuevos");
  }

  if (!existsSync(e2eDir)) {
    push("WARNING", "Tests", "tests/e2e", "No existe tests/e2e/", "Planificá E2E (Playwright/Detox); ver tests/e2e/README.txt");
  }
}

function checkEnvExample() {
  const p = join(root, ".env.example");
  if (!existsSync(p)) {
    push("WARNING", "Seguridad", ".env.example", "No hay .env.example en la raíz", "Documentá variables mínimas para onboarding");
    return;
  }
  const raw = readFileSync(p, "utf8");
  const weak = ["changeme", "JWT_SECRET=dev", "password123", "admin123"];
  for (const w of weak) {
    if (raw.toLowerCase().includes(w.toLowerCase())) {
      push("WARNING", "Seguridad", ".env.example", `Posible placeholder débil: "${w}"`, "Usá texto que indique generar secreto largo (openssl rand -base64 48)");
      break;
    }
  }
}

function checkMobileTests() {
  const pkg = join(root, "mobile", "package.json");
  if (!existsSync(pkg)) return;
  const j = JSON.parse(readFileSync(pkg, "utf8"));
  if (!j.scripts?.test) {
    push("INFO", "Mobile", "mobile/package.json", "No hay script npm test en mobile", "Evaluá Vitest/Jest + @testing-library/react-native para componentes críticos");
  }
}

function runCommand(label, cmd) {
  try {
    execSync(cmd, { cwd: root, stdio: "pipe", encoding: "utf8" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    push("ERROR", label, cmd.split(" ")[0], `${label}: comando falló`, msg.slice(0, 400));
  }
}

/** En Windows, `query_engine-windows.dll.node` puede quedar bloqueado si el API está en marcha. */
function runPrismaGenerate() {
  try {
    execSync("npx prisma generate", { cwd: root, stdio: "pipe", encoding: "utf8" });
  } catch (e) {
    const err = /** @type {Error & { stderr?: string; stdout?: string }} */ (e);
    const combined = [err.message, err.stderr, err.stdout].filter(Boolean).join("\n");
    if (/EPERM|EBUSY|EACCES/i.test(combined)) {
      push(
        "WARNING",
        "Prisma generate",
        "npx prisma generate",
        "No se pudo regenerar el cliente (archivo del motor en uso). Suele pasar con `npm run dev` u otro Node usando `.prisma-client`.",
        "Detené el servidor API y ejecutá de nuevo `npm run qa:audit`, o confiá en el cliente ya generado."
      );
      return;
    }
    push("ERROR", "Prisma generate", "npx", "Prisma generate: comando falló", combined.slice(0, 500));
  }
}

function main() {
  console.log("Auditoría QA EduPlay (scripts/qa-audit.mjs)\n");

  checkTestLayout();
  checkEnvExample();
  checkMobileTests();

  runCommand("Prisma", "npx prisma validate");
  runPrismaGenerate();
  runCommand("TypeScript API", "npx tsc --noEmit -p tsconfig.json");

  const errors = issues.filter((i) => i.type === "ERROR");
  const warnings = issues.filter((i) => i.type === "WARNING");
  const infos = issues.filter((i) => i.type === "INFO");

  if (errors.length) {
    console.log(`ERRORES (${errors.length}):`);
    for (const i of errors) console.log(`  [${i.category}] ${i.file}: ${i.message}\n    → ${i.suggestion}`);
  }
  if (warnings.length) {
    console.log(`\nADVERTENCIAS (${warnings.length}):`);
    for (const i of warnings) console.log(`  [${i.category}] ${i.file}: ${i.message}\n    → ${i.suggestion}`);
  }
  if (infos.length) {
    console.log(`\nINFO (${infos.length}):`);
    for (const i of infos) console.log(`  [${i.category}] ${i.message}`);
  }

  if (!errors.length && !warnings.length && !infos.length) {
    console.log("Sin incidencias registradas por este script (revisá checklist manual igualmente).");
  }

  console.log("\nRecordatorio: ejecutá también npm test y npm run test:db si tocás Prisma.");
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
