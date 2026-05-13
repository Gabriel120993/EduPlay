/**
 * Comprueba que la API responde (requiere `npm run dev` u otro servidor en marcha).
 * Carga `.env` de la raíz del repo (PORT, etc.).
 */
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const port = process.env.PORT?.trim() || "3000";
const base =
  (process.env.VERIFY_API_BASE || "").replace(/\/$/, "") ||
  `http://127.0.0.1:${port}`;

async function check(name, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const ok = res.ok;
    console.log(`${ok ? "[OK]" : "[??]"} ${name}: HTTP ${res.status} (${url})`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[--] ${name}: no responde (${url})`);
    console.log(`     ${msg}`);
  }
}

console.log(`Verificando EduPlay API en ${base} ...\n`);
await check("API raíz", `${base}/`);
await check("API health", `${base}/api/health`);
console.log(
  "\nPrisma Studio (si está abierto): http://localhost:5555 — comprobar manualmente en el navegador."
);
