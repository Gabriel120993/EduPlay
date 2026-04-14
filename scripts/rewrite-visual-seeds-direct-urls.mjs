/**
 * Reemplaza URLs thumb de Wikimedia por URLs directas al archivo en prisma/seeds/visualQuestions/*.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "prisma", "seeds", "visualQuestions");

const thumbRe =
  /https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/([a-f0-9])\/([a-f0-9]{2})\/([^/]+)\/\d+px-[^"\s]+/g;

function rewrite(content) {
  return content.replace(thumbRe, (_, h1, h2, fname) => {
    return `https://upload.wikimedia.org/wikipedia/commons/${h1}/${h2}/${fname}`;
  });
}

for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith(".ts") || name === "types.ts" || name === "index.ts") continue;
  const p = path.join(dir, name);
  const before = fs.readFileSync(p, "utf8");
  const after = rewrite(before);
  if (before !== after) {
    fs.writeFileSync(p, after, "utf8");
    console.log("updated:", name);
  } else {
    console.log("no change:", name);
  }
}
