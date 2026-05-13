/**
 * Catálogo de activos educativos para seed y referencia.
 * Planetas, animales, arte e instrumentos: Commons. Banderas: flagcdn.com.
 */

import { ANIMAL_EDUCATIONAL_ASSETS } from "./animalAssetsSeed";
import { ARTWORK_EDUCATIONAL_ASSETS } from "./artworkAssetsSeed";
import { COUNTRY_FLAG_ASSETS } from "./countryFlagsSeed";
import { INSTRUMENT_EDUCATIONAL_ASSETS } from "./instrumentAssetsSeed";
import { PLANET_EDUCATIONAL_ASSETS } from "./planetAssetsSeed";

export type EducationalAssetSeed = {
  type: string;
  category: string;
  name: string;
  title: string;
  description?: string | null;
  urlSmall: string;
  urlMedium: string;
  urlLarge: string;
  source: string;
  sourceUrl: string | null;
  license: string;
  tags: string[];
};

/**
 * Ruta relativa en Commons sin prefijo `https://upload.wikimedia.org/wikipedia/commons/`.
 * Ej.: `2/2c/Mercury_in_true_color.jpg`
 *
 * Wikimedia solo permite "thumbnail steps" predefinidos (20, 40, 60, 120, 250, 330,
 * 500, 960, 1280, 1920, 3840). Otros anchos arbitrarios (p. ej. 400/800) responden
 * 400 con "Use thumbnail steps listed on https://w.wiki/GHai". Ver:
 * https://www.mediawiki.org/wiki/Manual:$wgThumbnailSteps
 */
export const WIKIMEDIA_VALID_WIDTHS = [120, 250, 500, 960] as const;
export type WikimediaThumbWidth = (typeof WIKIMEDIA_VALID_WIDTHS)[number];

export function wmThumb(relPath: string, width: WikimediaThumbWidth): string {
  const file = relPath.split("/").pop() ?? relPath;
  const isSvg = file.toLowerCase().endsWith(".svg");
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${relPath}/${width}px-${file}${isSvg ? ".png" : ""}`;
}

function wm(relPath: string): Pick<EducationalAssetSeed, "urlSmall" | "urlMedium" | "urlLarge"> {
  return {
    urlSmall: wmThumb(relPath, 120),
    urlMedium: wmThumb(relPath, 500),
    urlLarge: wmThumb(relPath, 960),
  };
}

function img(
  partial: Omit<EducationalAssetSeed, "urlSmall" | "urlMedium" | "urlLarge" | "source" | "license" | "tags" | "sourceUrl"> & {
    sourceUrl?: string | null;
    tags?: string[];
  },
  commonsRelPath: string,
): EducationalAssetSeed {
  return {
    ...partial,
    description: partial.description ?? null,
    sourceUrl: partial.sourceUrl ?? `https://commons.wikimedia.org/wiki/File:${commonsRelPath.split("/").pop()}`,
    source: "wikipedia",
    license: "public_domain_or_commons",
    tags: partial.tags ?? [partial.category, partial.name.split("_")[0] ?? partial.name],
    ...wm(commonsRelPath),
  };
}

/** Filas listas para `prisma.educationalAsset.createMany` / create. */
export const EDUCATIONAL_ASSET_SEED_DATA: EducationalAssetSeed[] = [
  // —— Planetas, Luna y Sol (Commons) ——
  ...PLANET_EDUCATIONAL_ASSETS,

  // —— Banderas (50 países, flagcdn.com) ——
  ...COUNTRY_FLAG_ASSETS,

  // —— Animales (fotografía, Wikimedia Commons) ——
  ...ANIMAL_EDUCATIONAL_ASSETS,

  // —— Arte / pintura (Commons) ——
  ...ARTWORK_EDUCATIONAL_ASSETS,

  // —— Instrumentos musicales (Commons) ——
  ...INSTRUMENT_EDUCATIONAL_ASSETS,

  // —— Mapas u ortográficos (maps) ——
  img({ type: "image", category: "maps", name: "map_argentina", title: "Argentina (mapa)" }, "9/99/Argentina_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_brasil", title: "Brasil (mapa)" }, "0/05/Brazil_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_espana", title: "España (mapa)" }, "0/09/Spain_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_francia", title: "Francia (mapa)" }, "a/a2/France_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_italia", title: "Italia (mapa)" }, "b/b6/Italy_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_japon", title: "Japón (mapa)" }, "a/a8/Japan_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_estados_unidos", title: "Estados Unidos (mapa)" }, "7/79/USA_orthographic.svg"),
  img({ type: "image", category: "maps", name: "map_reino_unido", title: "Reino Unido (mapa)" }, "0/07/United_Kingdom_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_mexico", title: "México (mapa)" }, "f/f8/Mexico_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_canada", title: "Canadá (mapa)" }, "1/14/Canada_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_australia", title: "Australia (mapa)" }, "4/46/Australia_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_alemania", title: "Alemania (mapa)" }, "8/8b/Germany_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_china", title: "China (mapa)" }, "6/60/China_(orthographic_projection).svg"),
  img({ type: "image", category: "maps", name: "map_egipto", title: "Egipto (mapa)" }, "5/50/Egypt_(orthographic_projection).svg"),

  // —— Dinosaurios ——
  img({ type: "image", category: "dinosaurs", name: "dino_tiranosaurio_rex", title: "Tiranosaurio rex" }, "2/2e/Tyrannosaurus_Rex_Holotype.jpg"),
  img({ type: "image", category: "dinosaurs", name: "dino_triceratops", title: "Triceratops" }, "c/c9/Triceratops_skull_cast.jpg"),
  img({ type: "image", category: "dinosaurs", name: "dino_velociraptor", title: "Velociraptor" }, "5/55/FMNH_Velociraptor_skull.jpg"),
  img({ type: "image", category: "dinosaurs", name: "dino_estegosaurio", title: "Estegosaurio" }, "f/f3/Stegosaurus_stenops_DINOPEDIA.jpg"),
  img({ type: "image", category: "dinosaurs", name: "dino_braquiosaurio", title: "Braquiosaurio" }, "9/98/Brachiosaurus_mount.jpg"),
  img({ type: "image", category: "dinosaurs", name: "dino_pteranodon", title: "Pteranodon" }, "4/42/Pteranodon_amnh_mcw.jpg"),
  img({ type: "image", category: "dinosaurs", name: "dino_espinosaurio", title: "Espinosaurio" }, "3/31/Spinosaurus_BW.jpg"),
  img({ type: "image", category: "dinosaurs", name: "dino_anquilosaurio", title: "Anquilosaurio" }, "c/c0/Ankylosaurus_BMR.jpg"),
  img({ type: "image", category: "dinosaurs", name: "dino_parasaurolofo", title: "Parasaurolofo" }, "c/c3/Parasaurolophus_Pic_Martin_Sanders.jpg"),
  img({ type: "image", category: "dinosaurs", name: "dino_diplodocus", title: "Diplodocus" }, "b/b3/Diplodocus_longus.jpg"),

  // —— Portadas de contenido educativo (hero) ——
  img(
    { type: "image", category: "heroes", name: "hero_sistema_solar", title: "Sistema solar", description: "Planetas del sistema solar." },
    "c/cb/Planets2013.svg",
  ),
  img(
    { type: "image", category: "heroes", name: "hero_metamorfosis", title: "Metamorfosis", description: "Mariposa monarca." },
    "6/63/Monarch_In_May.jpg",
  ),
  img(
    { type: "image", category: "heroes", name: "hero_volcan_casero", title: "Volcán", description: "Erupción volcánica (ilustrativa)." },
    "5/5e/Etna_eruption_2001.jpg",
  ),
  img(
    { type: "image", category: "heroes", name: "hero_egipto_ninos", title: "Egipto antiguo", description: "Pirámides de Giza." },
    "8/8f/All_Gizah_Pyramids.jpg",
  ),
  img(
    { type: "image", category: "heroes", name: "hero_frida_kahlo", title: "Frida Kahlo", description: "Retrato fotográfico." },
    "4/4d/Frida_Kahlo,_by_Guillermo_Kahlo.jpg",
  ),
  img(
    { type: "image", category: "heroes", name: "hero_mapamundi", title: "Mapamundi", description: "Mapa político mundial." },
    "8/80/World_map_2004_CIA_Factbook_large_2m_max.jpg",
  ),
  img(
    { type: "image", category: "heroes", name: "hero_tablas", title: "Tablas", description: "Tabla de multiplicar." },
    "1/1b/Multiplication_table.svg",
  ),
  img(
    { type: "image", category: "heroes", name: "hero_selva", title: "Selva", description: "Selva tropical." },
    "6/6f/Amazon_rainforest_from_above.jpg",
  ),
];
