import { wmThumb, type EducationalAssetSeed } from "./educationalAssetCatalog";

function commonsRelPathFromUploadUrl(imageUrl: string): string {
  const u = imageUrl.trim();
  const m = /upload\.wikimedia\.org\/wikipedia\/commons\/([^?#]+)/.exec(u);
  if (!m?.[1]) {
    throw new Error(`URL no es de upload.wikimedia.org/wikipedia/commons/: ${u}`);
  }
  return decodeURIComponent(m[1]!);
}

type InstrumentRaw = {
  name: string;
  title: string;
  url: string;
  tags: readonly string[];
};

/**
 * Instrumentos musicales para `EducationalAsset` (categoría `instruments`).
 */
const INSTRUMENTS_RAW: InstrumentRaw[] = [
  {
    name: "guitarra",
    title: "Guitarra clásica",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Guitarra_clásica.jpg",
    tags: ["musica", "instrumento", "cuerda"],
  },
  {
    name: "piano",
    title: "Piano de cola",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Steinway_%26_Sons_concert_grand_piano%2C_model_D-274.jpg",
    tags: ["musica", "instrumento", "cuerda", "teclado"],
  },
  {
    name: "violin",
    title: "Violín",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Violin_VL100.jpg",
    tags: ["musica", "instrumento", "cuerda"],
  },
  {
    name: "viola",
    title: "Viola",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Viola_among_Violins.jpg",
    tags: ["musica", "instrumento", "cuerda"],
  },
  {
    name: "violonchelo",
    title: "Violonchelo",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Cello_by_Ernst_Strohner.jpg",
    tags: ["musica", "instrumento", "cuerda"],
  },
  {
    name: "contrabajo",
    title: "Contrabajo",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Contrabass.jpg",
    tags: ["musica", "instrumento", "cuerda"],
  },
  {
    name: "flauta",
    title: "Flauta traversa",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Western_concert_flute.jpg",
    tags: ["musica", "instrumento", "viento"],
  },
  {
    name: "clarinete",
    title: "Clarinete",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Yamaha_Clarinet_YCL-255.jpg",
    tags: ["musica", "instrumento", "viento"],
  },
  {
    name: "saxofon",
    title: "Saxofón alto",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Alto_saxophone.jpg",
    tags: ["musica", "instrumento", "viento"],
  },
  {
    name: "trompeta",
    title: "Trompeta",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Trumpet_1.jpg",
    tags: ["musica", "instrumento", "viento", "metal"],
  },
  {
    name: "trombon",
    title: "Trombón",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/69/Trombone.jpg",
    tags: ["musica", "instrumento", "viento", "metal"],
  },
  {
    name: "tuba",
    title: "Tuba",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Tuba.jpg",
    tags: ["musica", "instrumento", "viento", "metal"],
  },
  {
    name: "bateria",
    title: "Batería",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/4d/Drum_kit.jpg",
    tags: ["musica", "instrumento", "percutoras"],
  },
  {
    name: "arpa",
    title: "Arpa de pedal",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Pedal_harp_-_20110414.jpg",
    tags: ["musica", "instrumento", "cuerda"],
  },
  {
    name: "oboe",
    title: "Oboe",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/4f/Oboe_modern.jpg",
    tags: ["musica", "instrumento", "viento"],
  },
];

function toEducationalAsset(row: InstrumentRaw): EducationalAssetSeed {
  const rel = commonsRelPathFromUploadUrl(row.url);
  const fileName = rel.split("/").pop() ?? row.name;
  return {
    type: "image",
    category: "instruments",
    name: row.name,
    title: row.title,
    description: `Instrumento musical: ${row.title}.`,
    urlSmall: wmThumb(rel, 120),
    urlMedium: wmThumb(rel, 500),
    urlLarge: wmThumb(rel, 960),
    source: "wikipedia",
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${fileName}`,
    license: "public_domain_or_commons",
    tags: [...row.tags],
  };
}

export const INSTRUMENT_EDUCATIONAL_ASSETS: EducationalAssetSeed[] = INSTRUMENTS_RAW.map(toEducationalAsset);

export const INSTRUMENT_NAMES: string[] = INSTRUMENTS_RAW.map((i) => i.name);
