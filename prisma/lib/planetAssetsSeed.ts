import { wmThumb, type EducationalAssetSeed } from "./educationalAssetCatalog";

function commonsRelPathFromUploadUrl(imageUrl: string): string {
  const u = imageUrl.trim();
  const m = /upload\.wikimedia\.org\/wikipedia\/commons\/([^?#]+)/.exec(u);
  if (!m?.[1]) {
    throw new Error(`URL no es de upload.wikimedia.org/wikipedia/commons/: ${u}`);
  }
  return decodeURIComponent(m[1]!);
}

type PlanetRaw = {
  /** Slug sin prefijo; en BD será `planet_${slug}` (compatible con `VisualQuestion` / seed). */
  name: string;
  title: string;
  url: string;
  tags: readonly string[];
};

/**
 * Planetas del sistema solar + Luna y Sol (categoría `planets`, nombres `planet_*`).
 */
const PLANETS_RAW: PlanetRaw[] = [
  {
    name: "mercurio",
    title: "Mercurio",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Mercury_in_true_color.jpg",
    tags: ["planeta", "sistema_solar", "espacio"],
  },
  {
    name: "venus",
    title: "Venus",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg",
    tags: ["planeta", "sistema_solar", "espacio"],
  },
  {
    name: "tierra",
    title: "Tierra",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg",
    tags: ["planeta", "sistema_solar", "espacio", "tierra"],
  },
  {
    name: "marte",
    title: "Marte",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg",
    tags: ["planeta", "sistema_solar", "espacio"],
  },
  {
    name: "jupiter",
    title: "Júpiter",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg",
    tags: ["planeta", "sistema_solar", "espacio", "gigante_gaseoso"],
  },
  {
    name: "saturno",
    title: "Saturno",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg",
    tags: ["planeta", "sistema_solar", "espacio", "gigante_gaseoso"],
  },
  {
    name: "urano",
    title: "Urano",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg",
    tags: ["planeta", "sistema_solar", "espacio", "gigante_gaseoso"],
  },
  {
    name: "neptuno",
    title: "Neptuno",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg",
    tags: ["planeta", "sistema_solar", "espacio", "gigante_gaseoso"],
  },
  {
    name: "luna",
    title: "La Luna",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg",
    tags: ["satelite", "sistema_solar", "espacio", "tierra"],
  },
  {
    name: "sol",
    title: "El Sol",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg",
    tags: ["estrella", "sistema_solar", "espacio"],
  },
];

function toEducationalAsset(row: PlanetRaw): EducationalAssetSeed {
  const rel = commonsRelPathFromUploadUrl(row.url);
  const fileName = rel.split("/").pop() ?? row.name;
  const assetName = `planet_${row.name}`;
  return {
    type: "image",
    category: "planets",
    name: assetName,
    title: row.title,
    description: `${row.title} — cuerpo del sistema solar.`,
    urlSmall: wmThumb(rel, 120),
    urlMedium: wmThumb(rel, 500),
    urlLarge: wmThumb(rel, 960),
    source: "wikipedia",
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${fileName}`,
    license: "public_domain_or_commons",
    tags: [...row.tags],
  };
}

export const PLANET_EDUCATIONAL_ASSETS: EducationalAssetSeed[] = PLANETS_RAW.map(toEducationalAsset);

export const PLANET_ASSET_SLUGS: string[] = PLANETS_RAW.map((p) => p.name);
