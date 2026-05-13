import { wmThumb, type EducationalAssetSeed } from "./educationalAssetCatalog";

function commonsRelPathFromUploadUrl(imageUrl: string): string {
  const u = imageUrl.trim();
  const m = /upload\.wikimedia\.org\/wikipedia\/commons\/([^?#]+)/.exec(u);
  if (!m?.[1]) {
    throw new Error(`URL no es de upload.wikimedia.org/wikipedia/commons/: ${u}`);
  }
  return decodeURIComponent(m[1]!);
}

type AnimalRaw = {
  name: string;
  title: string;
  url: string;
  tags: readonly string[];
};

/**
 * Animales para `EducationalAsset` (categoría `animals`).
 * Incluye los 5 del listado base + más especies (≈30) con fotos en Wikimedia Commons.
 */
const ANIMALS_RAW: AnimalRaw[] = [
  {
    name: "leon",
    title: "León africano",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/73/Lion_waiting_in_Namibia.jpg",
    tags: ["animal", "mamifero", "africa", "carnivoro"],
  },
  {
    name: "elefante",
    title: "Elefante africano",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/37/African_Bush_Elephant.jpg",
    tags: ["animal", "mamifero", "africa", "herbivoro"],
  },
  {
    name: "jirafa",
    title: "Jirafa",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Giraffe_Mikumi_National_Park.jpg",
    tags: ["animal", "mamifero", "africa", "herbivoro"],
  },
  {
    name: "tigre",
    title: "Tigre de Bengala",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Walking_tiger_female.jpg",
    tags: ["animal", "mamifero", "asia", "carnivoro"],
  },
  {
    name: "panda",
    title: "Oso panda gigante",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Grosser_Panda.JPG",
    tags: ["animal", "mamifero", "asia", "china", "herbivoro"],
  },
  {
    name: "cebra",
    title: "Cebra de llanura",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/96/Equus_quagga_Ngorongoro.jpg",
    tags: ["animal", "mamifero", "africa", "herbivoro"],
  },
  {
    name: "hipopotamo",
    title: "Hipopótamo",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/07/Hippopotamus_in_the_water.jpg",
    tags: ["animal", "mamifero", "africa", "herbivoro"],
  },
  {
    name: "rinoceronte",
    title: "Rinoceronte blanco",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/White_Rhino%2C_Water_Sanctuary%2C_Sigean%2C_France_-_September_2016.jpg",
    tags: ["animal", "mamifero", "africa", "herbivoro"],
  },
  {
    name: "gorila",
    title: "Gorila de montaña",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/50/Mountain_Gorilla_Silverback_2010.jpg",
    tags: ["animal", "mamifero", "africa", "herbivoro"],
  },
  {
    name: "chimpance",
    title: "Chimpancé",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/48/Chimpanzees_showing_teeth_in_the_water.jpg",
    tags: ["animal", "mamifero", "africa", "omnivoro"],
  },
  {
    name: "orangutan",
    title: "Orangután",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/be/Orang_Utan%2C_Semenggok_Forest_Reserve%2C_Sarawak%2C_Borneo%2C_Malaysia.JPG",
    tags: ["animal", "mamifero", "asia", "omnivoro"],
  },
  {
    name: "lobo",
    title: "Lobo gris",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/16/Kolm%C3%A5rden_Wolf.jpg",
    tags: ["animal", "mamifero", "europa", "carnivoro"],
  },
  {
    name: "oso_polar",
    title: "Oso polar",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/66/Polar_Bear_-_Alaska_%28cropped%29.jpg",
    tags: ["animal", "mamifero", "artico", "carnivoro"],
  },
  {
    name: "oso_pardo",
    title: "Oso pardo",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/71/2010-kodiak-bear-1.jpg",
    tags: ["animal", "mamifero", "america", "omnivoro"],
  },
  {
    name: "canguro",
    title: "Canguro rojo",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Kangaroo_Australia_01_11_2008_-_retouch.JPG",
    tags: ["animal", "mamifero", "oceania", "herbivoro"],
  },
  {
    name: "koala",
    title: "Koala",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/49/Koala_climbing_tree.jpg",
    tags: ["animal", "mamifero", "oceania", "herbivoro"],
  },
  {
    name: "pinguino",
    title: "Pingüino barbijo",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/27/Chinstrap_Penguin.jpg",
    tags: ["animal", "ave", "antartida", "piscivoro"],
  },
  {
    name: "delfin",
    title: "Delfín común",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7f/Common_dolphin_noaa.jpg",
    tags: ["animal", "mamifero", "marino", "piscivoro"],
  },
  {
    name: "flamenco",
    title: "Flamenco",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/56/Flamingo_2019_%2848236371987%29.jpg",
    tags: ["animal", "ave", "herbivoro"],
  },
  {
    name: "aguila",
    title: "Águila calva",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/19/Bald_Eagle_Portrait.jpg",
    tags: ["animal", "ave", "america", "carnivoro"],
  },
  {
    name: "buho",
    title: "Búho real",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/39/Bubo_bubo_1_%28Martin_Mecnarowski%29.jpg",
    tags: ["animal", "ave", "europa", "carnivoro"],
  },
  {
    name: "mapache",
    title: "Mapache",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/46/Raccoon_Clash.jpg",
    tags: ["animal", "mamifero", "america", "omnivoro"],
  },
  {
    name: "camello",
    title: "Camello bactriano",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/43/Camelus_dromedarius_in_Zoo_Leipzig.jpg",
    tags: ["animal", "mamifero", "asia", "herbivoro"],
  },
  {
    name: "bufalo",
    title: "Búfalo cafre",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/13/African_buffalo_Syncerus_caffer.jpg",
    tags: ["animal", "mamifero", "africa", "herbivoro"],
  },
  {
    name: "jaguar",
    title: "Jaguar",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Sleeping_Jaguar.jpg",
    tags: ["animal", "mamifero", "america", "carnivoro"],
  },
  {
    name: "puma",
    title: "Puma",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Cougar_snarls_in_shade.jpg",
    tags: ["animal", "mamifero", "america", "carnivoro"],
  },
  {
    name: "tortuga_marina",
    title: "Tortuga verde",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Green_sea_turtle_near_Moorea.jpg",
    tags: ["animal", "reptil", "marino", "herbivoro"],
  },
  {
    name: "cocodrilo",
    title: "Cocodrilo del Nilo",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/20/Crocodylus_niloticus_in_water.jpg",
    tags: ["animal", "reptil", "africa", "carnivoro"],
  },
  {
    name: "zorro",
    title: "Zorro rojo",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Red_fox_%28Vulpes_vulpes%29.jpg",
    tags: ["animal", "mamifero", "europa", "omnivoro"],
  },
  {
    name: "murcielago",
    title: "Murciélago",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Geoffroy%27s_bat.jpg",
    tags: ["animal", "mamifero", "insectivoro"],
  },
];

function toEducationalAsset(row: AnimalRaw): EducationalAssetSeed {
  const rel = commonsRelPathFromUploadUrl(row.url);
  const fileName = rel.split("/").pop() ?? row.name;
  return {
    type: "image",
    category: "animals",
    name: row.name,
    title: row.title,
    description: `Fotografía educativa: ${row.title}.`,
    urlSmall: wmThumb(rel, 120),
    urlMedium: wmThumb(rel, 500),
    urlLarge: wmThumb(rel, 960),
    source: "wikipedia",
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${fileName}`,
    license: "public_domain_or_commons",
    tags: [...row.tags],
  };
}

export const ANIMAL_EDUCATIONAL_ASSETS: EducationalAssetSeed[] = ANIMALS_RAW.map(toEducationalAsset);

/** Metadatos del catálogo (p. ej. más juegos o quizzes por nombre). */
export const ANIMAL_NAMES: string[] = ANIMALS_RAW.map((a) => a.name);
