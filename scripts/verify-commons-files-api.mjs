/**
 * Verifica vía API de Commons que existan los archivos referenciados por URL directa upload.wikimedia.org
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "prisma", "seeds", "visualQuestions");
const re =
  /https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[a-f0-9]\/[a-f0-9]{2}\/([^"\s]+)/g;

const files = new Set();
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith(".ts")) continue;
  const c = fs.readFileSync(path.join(dir, name), "utf8");
  let m;
  while ((m = re.exec(c)) !== null) {
    files.add(decodeURIComponent(m[1]));
  }
}

const list = [...files];
const chunk = 45;
let missing = [];
for (let i = 0; i < list.length; i += chunk) {
  const titles = list.slice(i, i + chunk).map((f) => `File:${f}`).join("|");
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  for (const p of Object.values(pages)) {
    if (p.missing) missing.push(p.title);
  }
}

console.log("Archivos únicos en seeds:", list.length);
if (missing.length) {
  console.error("Faltan en Commons:", missing);
  process.exitCode = 1;
} else {
  console.log("API Commons: todos los File:* resuelven (no missing).");
}
