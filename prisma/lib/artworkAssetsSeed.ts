import { wmThumb, type EducationalAssetSeed } from "./educationalAssetCatalog";

function commonsRelPathFromUploadUrl(imageUrl: string): string {
  const u = imageUrl.trim();
  const m = /upload\.wikimedia\.org\/wikipedia\/commons\/([^?#]+)/.exec(u);
  if (!m?.[1]) {
    throw new Error(`URL no es de upload.wikimedia.org/wikipedia/commons/: ${u}`);
  }
  return decodeURIComponent(m[1]!);
}

type ArtworkRaw = {
  name: string;
  title: string;
  artist: string;
  year: string;
  url: string;
  tags: readonly string[];
};

/**
 * Obras reconocibles para `EducationalAsset` (categoría `artworks`).
 * URLs en Wikimedia Commons (proyecto arte / fotos libres de reproducción 2D).
 */
const ARTWORKS_RAW: ArtworkRaw[] = [
  {
    name: "mona_lisa",
    title: "La Mona Lisa",
    artist: "Leonardo da Vinci",
    year: "1503-1519",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
    tags: ["arte", "pintura", "renacimiento", "leonardo", "louvre"],
  },
  {
    name: "noche_estrellada",
    title: "La noche estrellada",
    artist: "Vincent van Gogh",
    year: "1889",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
    tags: ["arte", "pintura", "postimpresionismo", "van_gogh"],
  },
  {
    name: "el_grito",
    title: "El grito",
    artist: "Edvard Munch",
    year: "1893",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f4/The_Scream.jpg",
    tags: ["arte", "pintura", "expresionismo", "munch"],
  },
  {
    name: "la_joven_de_la_perla",
    title: "La joven de la perla",
    artist: "Johannes Vermeer",
    year: "1665",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/1665_Girl_with_a_Pearl_Earring.jpg",
    tags: ["arte", "pintura", "barroco", "vermeer"],
  },
  {
    name: "nacimiento_venus",
    title: "El nacimiento de Venus",
    artist: "Sandro Botticelli",
    year: "1484-1486",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/12/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg",
    tags: ["arte", "pintura", "renacimiento", "botticelli"],
  },
  {
    name: "guernica",
    title: "Guernica",
    artist: "Pablo Picasso",
    year: "1937",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6d/PicassoGuernica.jpg",
    tags: ["arte", "pintura", "cubismo", "picasso"],
  },
  {
    name: "persistencia_memoria",
    title: "La persistencia de la memoria",
    artist: "Salvador Dalí",
    year: "1931",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/4e/The_Persistence_of_Memory_-_Salvador_Dali_-_1931.jpg",
    tags: ["arte", "pintura", "surrealismo", "dali"],
  },
  {
    name: "goticamericano",
    title: "Gótico americano",
    artist: "Grant Wood",
    year: "1930",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/14/Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg",
    tags: ["arte", "pintura", "realismo", "wood"],
  },
  {
    name: "señoritas_avignon",
    title: "Las señoritas de Aviñón",
    artist: "Pablo Picasso",
    year: "1907",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Pablo_Picasso_-_Les_Demoiselles_d%27Avignon_-_Google_Art_Project.jpg",
    tags: ["arte", "pintura", "cubismo", "picasso"],
  },
  {
    name: "el_beso",
    title: "El beso",
    artist: "Gustav Klimt",
    year: "1907-1908",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/72/Klimt_-_The_Kiss_-_Google_Art_Project.jpg",
    tags: ["arte", "pintura", "modernismo", "klimt"],
  },
  {
    name: "nenufares",
    title: "Nenúfares",
    artist: "Claude Monet",
    year: "1906",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/60/Water_Lilies%2C_by_Claude_Monet%2C_1906_-_Google_Art_Project.jpg",
    tags: ["arte", "pintura", "impresionismo", "monet"],
  },
  {
    name: "gran_ola_kanagawa",
    title: "La gran ola de Kanagawa",
    artist: "Katsushika Hokusai",
    year: "1831",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Katsushika_Hokusai_-_Thirty-six_views_of_Mount_Fuji-_The_Great_Wave_off_the_Coast_of_Kanagawa_-_Google_Art_Project.jpg",
    tags: ["arte", "grabado", "ukiyo-e", "hokusai", "japon"],
  },
  {
    name: "domingo_grande_jatte",
    title: "Un domingo por la tarde en la isla de la Grande Jatte",
    artist: "Georges Seurat",
    year: "1884-1886",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7f/A_Sunday_on_La_Grande_Jatte_-_Georges_Seurat_-_Google_Art_Project.jpg",
    tags: ["arte", "pintura", "puntillismo", "seurat"],
  },
  {
    name: "las_meninas",
    title: "Las meninas",
    artist: "Diego Velázquez",
    year: "1656",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Las_Meninas%2C_by_Diego_Vel%C3%A1zquez%2C_from_Prado_in_Google_Earth.jpg",
    tags: ["arte", "pintura", "barroco", "velazquez"],
  },
  {
    name: "creacion_adan",
    title: "La creación de Adán",
    artist: "Miguel Ángel",
    year: "1512",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg",
    tags: ["arte", "pintura", "renacimiento", "miguel_angel", "capilla_sixtina"],
  },
];

function tagSlug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function toEducationalAsset(row: ArtworkRaw): EducationalAssetSeed {
  const rel = commonsRelPathFromUploadUrl(row.url);
  const fileName = rel.split("/").pop() ?? row.name;
  const description = `${row.title} — ${row.artist} (${row.year}).`;
  return {
    type: "image",
    category: "artworks",
    name: row.name,
    title: row.title,
    description,
    urlSmall: wmThumb(rel, 120),
    urlMedium: wmThumb(rel, 500),
    urlLarge: wmThumb(rel, 960),
    source: "wikipedia",
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${fileName}`,
    license: "public_domain_or_commons",
    tags: [...row.tags, tagSlug(row.artist)],
  };
}

export const ARTWORK_EDUCATIONAL_ASSETS: EducationalAssetSeed[] = ARTWORKS_RAW.map(toEducationalAsset);

export const ARTWORK_NAMES: string[] = ARTWORKS_RAW.map((a) => a.name);
