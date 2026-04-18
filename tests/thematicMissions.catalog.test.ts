import { describe, expect, it } from "vitest";

import { THEMATIC_MISSIONS } from "../src/lib/thematicMissionsCatalog";

describe("thematic missions catalog", () => {
  it("tiene al menos 20 misiones", () => {
    expect(THEMATIC_MISSIONS.length).toBeGreaterThanOrEqual(20);
  });

  it("cada misión tiene entre 5 y 10 pasos y slug único", () => {
    const slugs = new Set<string>();
    for (const m of THEMATIC_MISSIONS) {
      expect(m.steps.length).toBeGreaterThanOrEqual(5);
      expect(m.steps.length).toBeLessThanOrEqual(10);
      expect(slugs.has(m.slug)).toBe(false);
      slugs.add(m.slug);
    }
  });
});
