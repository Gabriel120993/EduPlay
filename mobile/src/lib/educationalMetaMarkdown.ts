/**
 * Si el servidor no persistió `EducationalContent.content`, arma una lectura útil
 * a partir de `meta` (seed curado: capítulos, pasos, materiales, etc.).
 */
export function educationalMetaToMarkdown(meta: unknown): string {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const m = meta as Record<string, unknown>;
  const parts: string[] = [];

  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

  const chapters = strList(m.chapters);
  if (chapters.length) {
    parts.push(`## Recorrido del tema\n\n${chapters.map((c) => `- ${c}`).join("\n")}`);
  }

  const sections = strList(m.sections);
  if (sections.length) {
    parts.push(`## Secciones\n\n${sections.map((c) => `- ${c}`).join("\n")}`);
  }

  const objectives = strList(m.objectives);
  if (objectives.length) {
    parts.push(`## Objetivos\n\n${objectives.map((c) => `- ${c}`).join("\n")}`);
  }

  const materials = strList(m.materials);
  const steps = strList(m.steps);
  if (materials.length || steps.length) {
    let block = "## Experimento en casa\n\n";
    if (materials.length) {
      block += `${materials.map((x) => `- ${x}`).join("\n")}\n\n`;
    }
    if (steps.length) {
      block += steps.map((step, i) => `${i + 1}. ${step}`).join("\n");
    }
    parts.push(block.trim());
  }

  if (typeof m.scientificExplanation === "string" && m.scientificExplanation.trim()) {
    parts.push(`## Qué está pasando\n\n${m.scientificExplanation.trim()}`);
  }

  if (typeof m.precaution === "string" && m.precaution.trim()) {
    parts.push(`## Seguridad\n\n${m.precaution.trim()}`);
  }

  if (typeof m.activity === "string" && m.activity.trim()) {
    parts.push(`## Actividad sugerida\n\n${m.activity.trim()}`);
  }

  const continents = m.continents;
  if (Array.isArray(continents) && continents.length) {
    const lines: string[] = ["## Continentes y datos\n"];
    for (const raw of continents) {
      if (!raw || typeof raw !== "object") continue;
      const c = raw as Record<string, unknown>;
      const name = typeof c.name === "string" ? c.name.trim() : "";
      if (!name) continue;
      const countries = strList(c.countries);
      const animals = strList(c.animals);
      const curiosity = typeof c.curiosity === "string" ? c.curiosity.trim() : "";
      let line = `- **${name}**`;
      if (countries.length) line += `: países como ${countries.slice(0, 4).join(", ")}`;
      if (animals.length) line += ` · animales: ${animals.slice(0, 3).join(", ")}`;
      if (curiosity) line += ` · ${curiosity}`;
      lines.push(line);
    }
    if (lines.length > 1) parts.push(lines.join("\n"));
  }

  const animals = strList(m.animals);
  const facts = strList(m.factsPerAnimal);
  if (animals.length) {
    const head = "## Animales para explorar\n\n";
    const list = animals.slice(0, 24).map((a) => `- ${a}`).join("\n");
    const tail = facts.length ? `\n\n_En cada ficha podés ver: ${facts.join(", ")}._` : "";
    parts.push(`${head}${list}${tail}`);
  }

  const n = m.embeddedQuestions;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) {
    parts.push(`## Preguntas interactivas\n\nEste recurso incluye unas **${Math.floor(n)}** preguntas cortas para pensar mientras leés.`);
  }

  return parts.filter(Boolean).join("\n\n").trim();
}
