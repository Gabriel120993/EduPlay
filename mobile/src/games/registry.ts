import type { ComponentType } from "react";

import AnimalOrchestraGame, { miniGameSpec as animalOrchestraSpec } from "./animalOrchestra/AnimalOrchestraGame";
import ChefFractionGame, { miniGameSpec as chefFractionSpec } from "./chefFraction/ChefFractionGame";
import ConstellationHunterGame, { miniGameSpec as constellationSpec } from "./constellationHunter/ConstellationHunterGame";
import EcoHeroGame, { miniGameSpec as ecoHeroSpec } from "./ecoHero/EcoHeroGame";
import EmotiometerGame, { miniGameSpec as emotiometerSpec } from "./emotiometer/EmotiometerGame";
import HistoryDetectiveGame, { miniGameSpec as historyDetectiveSpec } from "./historyDetective/HistoryDetectiveGame";
import LabMadGame, { miniGameSpec as labMadSpec } from "./labMad/LabMadGame";
import TreasureMathGame, { miniGameSpec as treasureMathSpec } from "./treasureMath/TreasureMathGame";
import WordBuilderGame, { miniGameSpec as wordBuilderSpec } from "./wordBuilder/WordBuilderGame";
import WorldNavigatorGame, { miniGameSpec as worldNavigatorSpec } from "./worldNavigator/WorldNavigatorGame";
import type { MiniGameId, MiniGameMeta, MiniGameProps } from "./types";

export type MiniGameRegistryEntry = {
  id: MiniGameId;
  meta: MiniGameMeta;
  totalLevels: number;
  Component: ComponentType<MiniGameProps>;
};

export const MINI_GAME_REGISTRY: MiniGameRegistryEntry[] = [
  { id: treasureMathSpec.meta.id, meta: treasureMathSpec.meta, totalLevels: treasureMathSpec.totalLevels, Component: TreasureMathGame },
  { id: wordBuilderSpec.meta.id, meta: wordBuilderSpec.meta, totalLevels: wordBuilderSpec.totalLevels, Component: WordBuilderGame },
  { id: labMadSpec.meta.id, meta: labMadSpec.meta, totalLevels: labMadSpec.totalLevels, Component: LabMadGame },
  { id: constellationSpec.meta.id, meta: constellationSpec.meta, totalLevels: constellationSpec.totalLevels, Component: ConstellationHunterGame },
  { id: chefFractionSpec.meta.id, meta: chefFractionSpec.meta, totalLevels: chefFractionSpec.totalLevels, Component: ChefFractionGame },
  { id: historyDetectiveSpec.meta.id, meta: historyDetectiveSpec.meta, totalLevels: historyDetectiveSpec.totalLevels, Component: HistoryDetectiveGame },
  { id: ecoHeroSpec.meta.id, meta: ecoHeroSpec.meta, totalLevels: ecoHeroSpec.totalLevels, Component: EcoHeroGame },
  { id: animalOrchestraSpec.meta.id, meta: animalOrchestraSpec.meta, totalLevels: animalOrchestraSpec.totalLevels, Component: AnimalOrchestraGame },
  { id: worldNavigatorSpec.meta.id, meta: worldNavigatorSpec.meta, totalLevels: worldNavigatorSpec.totalLevels, Component: WorldNavigatorGame },
  { id: emotiometerSpec.meta.id, meta: emotiometerSpec.meta, totalLevels: emotiometerSpec.totalLevels, Component: EmotiometerGame },
];

export function getMiniGameEntry(id: MiniGameId): MiniGameRegistryEntry | undefined {
  return MINI_GAME_REGISTRY.find((e) => e.id === id);
}
