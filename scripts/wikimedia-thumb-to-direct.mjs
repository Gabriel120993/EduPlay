/**
 * Convierte URL thumb de upload.wikimedia.org a URL del archivo original (misma imagen, sin /thumb/).
 * Uso: node scripts/wikimedia-thumb-to-direct.mjs <url>
 */
const u = process.argv[2];
if (!u) {
  console.error("Usage: node wikimedia-thumb-to-direct.mjs <thumb-url>");
  process.exit(1);
}
const m = u.match(
  /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/([a-f0-9])\/([a-f0-9]{2})\/([^/]+)\/(?:\d+px-[^/]+|[^/]+)$/
);
if (!m) {
  console.error("No match:", u);
  process.exit(1);
}
const direct = `https://upload.wikimedia.org/wikipedia/commons/${m[1]}/${m[2]}/${m[3]}`;
console.log(direct);
