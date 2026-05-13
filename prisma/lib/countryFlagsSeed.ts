import type { EducationalAssetSeed } from "./educationalAssetCatalog";

/** 50 países principales: códigos ISO 3166-1 alpha-2 para flagcdn.com */
export const COUNTRY_FLAGS_CATALOG = [
  { code: "ar", name: "Argentina", esName: "Argentina", region: "América del Sur" },
  { code: "bo", name: "Bolivia", esName: "Bolivia", region: "América del Sur" },
  { code: "br", name: "Brazil", esName: "Brasil", region: "América del Sur" },
  { code: "cl", name: "Chile", esName: "Chile", region: "América del Sur" },
  { code: "co", name: "Colombia", esName: "Colombia", region: "América del Sur" },
  { code: "cr", name: "Costa Rica", esName: "Costa Rica", region: "América Central" },
  { code: "cu", name: "Cuba", esName: "Cuba", region: "Caribe" },
  { code: "do", name: "Dominican Republic", esName: "República Dominicana", region: "Caribe" },
  { code: "ec", name: "Ecuador", esName: "Ecuador", region: "América del Sur" },
  { code: "sv", name: "El Salvador", esName: "El Salvador", region: "América Central" },
  { code: "gt", name: "Guatemala", esName: "Guatemala", region: "América Central" },
  { code: "hn", name: "Honduras", esName: "Honduras", region: "América Central" },
  { code: "mx", name: "Mexico", esName: "México", region: "América del Norte" },
  { code: "ni", name: "Nicaragua", esName: "Nicaragua", region: "América Central" },
  { code: "pa", name: "Panama", esName: "Panamá", region: "América Central" },
  { code: "py", name: "Paraguay", esName: "Paraguay", region: "América del Sur" },
  { code: "pe", name: "Peru", esName: "Perú", region: "América del Sur" },
  { code: "pr", name: "Puerto Rico", esName: "Puerto Rico", region: "Caribe" },
  { code: "uy", name: "Uruguay", esName: "Uruguay", region: "América del Sur" },
  { code: "ve", name: "Venezuela", esName: "Venezuela", region: "América del Sur" },
  { code: "es", name: "Spain", esName: "España", region: "Europa" },
  { code: "fr", name: "France", esName: "Francia", region: "Europa" },
  { code: "it", name: "Italy", esName: "Italia", region: "Europa" },
  { code: "de", name: "Germany", esName: "Alemania", region: "Europa" },
  { code: "gb", name: "United Kingdom", esName: "Reino Unido", region: "Europa" },
  { code: "pt", name: "Portugal", esName: "Portugal", region: "Europa" },
  { code: "ru", name: "Russia", esName: "Rusia", region: "Europa/Asia" },
  { code: "cn", name: "China", esName: "China", region: "Asia" },
  { code: "jp", name: "Japan", esName: "Japón", region: "Asia" },
  { code: "in", name: "India", esName: "India", region: "Asia" },
  { code: "kr", name: "South Korea", esName: "Corea del Sur", region: "Asia" },
  { code: "au", name: "Australia", esName: "Australia", region: "Oceanía" },
  { code: "ca", name: "Canada", esName: "Canadá", region: "América del Norte" },
  { code: "us", name: "United States", esName: "Estados Unidos", region: "América del Norte" },
  { code: "eg", name: "Egypt", esName: "Egipto", region: "África" },
  { code: "za", name: "South Africa", esName: "Sudáfrica", region: "África" },
  { code: "ng", name: "Nigeria", esName: "Nigeria", region: "África" },
  { code: "ke", name: "Kenya", esName: "Kenia", region: "África" },
  { code: "ma", name: "Morocco", esName: "Marruecos", region: "África" },
  { code: "gr", name: "Greece", esName: "Grecia", region: "Europa" },
  { code: "se", name: "Sweden", esName: "Suecia", region: "Europa" },
  { code: "no", name: "Norway", esName: "Noruega", region: "Europa" },
  { code: "fi", name: "Finland", esName: "Finlandia", region: "Europa" },
  { code: "ch", name: "Switzerland", esName: "Suiza", region: "Europa" },
  { code: "nl", name: "Netherlands", esName: "Países Bajos", region: "Europa" },
  { code: "be", name: "Belgium", esName: "Bélgica", region: "Europa" },
  { code: "at", name: "Austria", esName: "Austria", region: "Europa" },
  { code: "pl", name: "Poland", esName: "Polonia", region: "Europa" },
  { code: "tr", name: "Turkey", esName: "Turquía", region: "Europa/Asia" },
  { code: "sa", name: "Saudi Arabia", esName: "Arabia Saudita", region: "Asia" },
  { code: "il", name: "Israel", esName: "Israel", region: "Asia" },
] as const;

function tagToken(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function flagAssetRow(country: (typeof COUNTRY_FLAGS_CATALOG)[number]): EducationalAssetSeed {
  return {
    type: "image",
    category: "flags",
    name: `bandera_${country.code}`,
    title: `Bandera de ${country.esName}`,
    description: `Bandera oficial de ${country.esName}, país de ${country.region}`,
    urlSmall: `https://flagcdn.com/w80/${country.code}.png`,
    urlMedium: `https://flagcdn.com/w320/${country.code}.png`,
    urlLarge: `https://flagcdn.com/w640/${country.code}.png`,
    source: "flagcdn",
    sourceUrl: `https://flagcdn.com/${country.code}`,
    license: "public_domain",
    tags: ["bandera", "pais", tagToken(country.region), tagToken(country.esName)],
  };
}

/** Filas para `EducationalAsset` (misma categoría `flags` que el resto del catálogo). */
export const COUNTRY_FLAG_ASSETS: EducationalAssetSeed[] = COUNTRY_FLAGS_CATALOG.map(flagAssetRow);

/** Nombre en español (seed / UI) → código ISO (assets `bandera_xx`). */
export const ES_NAME_TO_FLAG_CODE: Record<string, string> = Object.fromEntries(
  COUNTRY_FLAGS_CATALOG.map((c) => [c.esName, c.code]),
);
