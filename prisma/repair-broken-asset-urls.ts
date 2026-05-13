/**
 * Repara `EducationalAsset` cuyas URLs de Wikimedia ya no existen (MISSING en MediaWiki
 * API), buscando una imagen principal alternativa via `prop=pageimages` en el artículo
 * de Wikipedia que corresponde al slug del asset.
 *
 * Estrategia:
 *   1. Lista assets de Wikimedia (no flagcdn).
 *   2. Verifica via MediaWiki API si el archivo existe (extrayendo el nombre actual).
 *   3. Si MISSING, busca via `pageimages` la imagen principal del artículo (en/es) por
 *      título inferido del nombre del asset (planet_mercurio → Mercurio/Mercury, etc).
 *   4. Reescribe `urlSmall/urlMedium/urlLarge` con la URL nueva.
 *
 *   npx ts-node --project prisma/tsconfig.seed.json -r tsconfig-paths/register prisma/repair-broken-asset-urls.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const API_HEADERS = {
  "User-Agent": "EduPlay/1.0 (https://eduplay.local; contact: dev@eduplay.local)",
  Accept: "application/json",
};

/**
 * Mapeo manual de slug → título de artículo de Wikipedia que tiene una imagen confiable.
 * Para assets donde MediaWiki API dice MISSING, este mapa indica de qué página tomar
 * la imagen principal vía `prop=pageimages`. Si el nombre del asset es predecible
 * (p. ej. `planet_mercurio` → "Mercurio (planeta)"), se infiere automáticamente
 * desde el slug.
 *
 * Cada entrada es `[título_es, título_en?]`. Se intenta primero `es.wikipedia.org`
 * y si no devuelve thumbnail se reintenta con `en.wikipedia.org` (necesario para
 * piezas de arte/instrumentos donde la imagen principal sólo está en EN).
 */
type LocalizedTitle = readonly [string, string?];

const ARTICLE_TITLE_OVERRIDES: Record<string, LocalizedTitle> = {
  dino_anquilosaurio: ["Ankylosaurus"],
  dino_braquiosaurio: ["Brachiosaurus"],
  dino_diplodocus: ["Diplodocus"],
  dino_espinosaurio: ["Spinosaurus"],
  dino_estegosaurio: ["Stegosaurus"],
  dino_parasaurolofo: ["Parasaurolophus"],
  dino_pteranodon: ["Pteranodon"],
  dino_tiranosaurio_rex: ["Tyrannosaurus"],
  dino_triceratops: ["Triceratops"],
  dino_velociraptor: ["Velociraptor"],

  // —— Animales (nombres con acentos en español) ——
  bufalo: ["Búfalo cafre", "African buffalo"],
  camello: ["Camelus dromedarius", "Dromedary"],
  chimpance: ["Pan troglodytes", "Chimpanzee"],
  flamenco: ["Phoenicopterus", "Flamingo"],
  hipopotamo: ["Hippopotamus amphibius", "Hippopotamus"],
  jaguar: ["Panthera onca", "Jaguar"],
  mapache: ["Procyon lotor", "Raccoon"],
  murcielago: ["Chiroptera", "Bat"],
  puma: ["Puma concolor", "Cougar"],
  rinoceronte: ["Ceratotherium simum", "White rhinoceros"],
  tortuga_marina: ["Chelonioidea", "Sea turtle"],
  cebra: ["Equus quagga", "Plains zebra"],
  cocodrilo: ["Crocodylus niloticus", "Nile crocodile"],
  gorila: ["Gorilla beringei beringei", "Mountain gorilla"],
  zorro: ["Vulpes vulpes", "Red fox"],

  // —— Obras de arte ——
  domingo_grande_jatte: ["Un domingo en La Grande Jatte", "A Sunday on La Grande Jatte"],
  el_beso: ["El beso (Klimt)", "The Kiss (Klimt)"],
  gran_ola_kanagawa: ["La gran ola de Kanagawa", "The Great Wave off Kanagawa"],
  guernica: ["Guernica (cuadro)", "Guernica (Picasso)"],
  nenufares: ["Nenúfares (Monet)", "Water Lilies (Monet series)"],
  persistencia_memoria: ["La persistencia de la memoria", "The Persistence of Memory"],
  // Tilde es importante: "Las señoritas de Avignon"
  "señoritas_avignon": ["Las señoritas de Avignon", "Les Demoiselles d'Avignon"],

  // —— Hero (portadas) ——
  hero_mapamundi: ["Mapamundi", "World map"],
  hero_selva: ["Selva", "Jungle"],
  hero_tablas: ["Tabla de multiplicar", "Multiplication table"],
  hero_volcan_casero: ["Volcán", "Volcano"],

  // —— Instrumentos (acentos) ——
  arpa: ["Arpa", "Harp"],
  clarinete: ["Clarinete", "Clarinet"],
  guitarra: ["Guitarra clásica", "Classical guitar"],
  saxofon: ["Saxofón", "Saxophone"],
  trombon: ["Trombón", "Trombone"],
  viola: ["Viola"],
  violonchelo: ["Violonchelo", "Cello"],
};

function extractCommonsFileName(url: string): string | null {
  const m =
    /upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+?)(?:\/\d+px-[^/]+)?(?:[?#]|$)/.exec(
      url,
    );
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function imageInfoExists(fileName: string): Promise<boolean> {
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${fileName}`,
    prop: "imageinfo",
    iiprop: "size",
    format: "json",
    formatversion: "2",
    redirects: "1",
  });
  const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: API_HEADERS });
  if (!r.ok) return true;
  const j = (await r.json()) as { query?: { pages?: Array<{ missing?: boolean }> } };
  return !j.query?.pages?.[0]?.missing;
}

type PageImage = { url: string; canonicalFileName: string };

async function pageMainImage(title: string, lang: "es" | "en"): Promise<PageImage | null> {
  const params = new URLSearchParams({
    action: "query",
    prop: "pageimages",
    titles: title,
    pithumbsize: "960",
    piprop: "thumbnail|name",
    format: "json",
    formatversion: "2",
    redirects: "1",
  });
  const r = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, { headers: API_HEADERS });
  if (!r.ok) return null;
  const j = (await r.json()) as {
    query?: { pages?: Array<{ thumbnail?: { source?: string }; pageimage?: string }> };
  };
  const page = j.query?.pages?.[0];
  const thumbUrl = page?.thumbnail?.source ?? null;
  const fileName = page?.pageimage ?? null;
  if (!thumbUrl || !fileName) return null;
  return { url: thumbUrl, canonicalFileName: fileName };
}

/** Recorre los candidatos (es → en) hasta encontrar uno con imagen principal. */
async function findArticleImage(slugNoPrefix: string, override: LocalizedTitle | undefined): Promise<PageImage | null> {
  const candidates: Array<{ title: string; lang: "es" | "en" }> = [];
  if (override?.[0]) candidates.push({ title: override[0], lang: "es" });
  if (override?.[1]) candidates.push({ title: override[1], lang: "en" });
  if (!override) {
    const titleEs = slugNoPrefix.charAt(0).toUpperCase() + slugNoPrefix.slice(1);
    candidates.push({ title: titleEs, lang: "es" });
    candidates.push({ title: titleEs, lang: "en" });
  }
  for (const c of candidates) {
    const img = await pageMainImage(c.title, c.lang);
    if (img) return img;
    await sleep(250);
  }
  return null;
}

/**
 * Devuelve los buckets `h1/h2` de un archivo de Commons a partir de su URL.
 * Funciona tanto con URL canónica (`/commons/h/hh/File`) como con thumb
 * (`/commons/thumb/h/hh/File/...`).
 */
function extractBucket(commonsUrl: string): { h1: string; h2: string; file: string } | null {
  const re = /upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)/;
  const m = re.exec(commonsUrl);
  if (!m) return null;
  const [, h1, h2, fileEnc] = m;
  try {
    return { h1: h1!, h2: h2!, file: decodeURIComponent(fileEnc!) };
  } catch {
    return { h1: h1!, h2: h2!, file: fileEnc! };
  }
}

/**
 * Construye `urlSmall/urlMedium/urlLarge` con anchos válidos a partir de cualquier URL
 * de Commons (thumb o canónica). Acepta también el nombre canónico devuelto por la API.
 */
function deriveThumbs(commonsUrlOrThumb: string): { small: string; medium: string; large: string } | null {
  const info = extractBucket(commonsUrlOrThumb);
  if (!info) return null;
  const isSvg = info.file.toLowerCase().endsWith(".svg");
  const ext = isSvg ? ".png" : "";
  const fileEnc = encodeURIComponent(info.file);
  const base = `https://upload.wikimedia.org/wikipedia/commons/thumb/${info.h1}/${info.h2}/${fileEnc}`;
  return {
    small: `${base}/250px-${fileEnc}${ext}`,
    medium: `${base}/500px-${fileEnc}${ext}`,
    large: `${base}/960px-${fileEnc}${ext}`,
  };
}

async function main(): Promise<void> {
  const assets = await prisma.educationalAsset.findMany({
    where: { urlMedium: { contains: "upload.wikimedia.org" } },
    select: { id: true, name: true, category: true, urlSmall: true, urlMedium: true, urlLarge: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  let checked = 0;
  let fixed = 0;
  let stillBroken = 0;
  const stillBrokenNames: string[] = [];

  for (const a of assets) {
    checked += 1;
    const fileName = extractCommonsFileName(a.urlMedium);
    if (!fileName) continue;

    const exists = await imageInfoExists(fileName);
    await sleep(250);
    if (exists) continue;

    const override = ARTICLE_TITLE_OVERRIDES[a.name];
    const slugNoPrefix = a.name.replace(/^(planet|dino|map|hero|animal|art|instrument)_/, "").replace(/_/g, " ");

    const main = await findArticleImage(slugNoPrefix, override);
    if (!main) {
      stillBroken += 1;
      stillBrokenNames.push(`${a.category}/${a.name} · sin artículo con imagen`);
      continue;
    }

    const thumbs = deriveThumbs(main.url);
    if (!thumbs) {
      stillBroken += 1;
      stillBrokenNames.push(`${a.category}/${a.name} · URL no parseable: ${main.url}`);
      continue;
    }

    await prisma.educationalAsset.update({
      where: { id: a.id },
      data: { urlSmall: thumbs.small, urlMedium: thumbs.medium, urlLarge: thumbs.large },
    });
    fixed += 1;
    console.log(`FIX ${a.category}/${a.name} → ${main.canonicalFileName}`);
  }

  console.log(`\n[repair-broken] checked=${checked} · fixed=${fixed} · stillBroken=${stillBroken}`);
  for (const n of stillBrokenNames) console.log("  · " + n);
}

main()
  .catch((e) => {
    console.error("[repair-broken]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
