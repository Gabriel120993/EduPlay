export type MiniGameId =
  | "treasure_math"
  | "word_builder"
  | "lab_mad"
  | "constellation_hunter"
  | "chef_fraction"
  | "history_detective"
  | "eco_hero"
  | "animal_orchestra"
  | "world_navigator"
  | "emotiometer";

export type Stars = 1 | 2 | 3;

export type MiniGameMeta = {
  id: MiniGameId;
  title: string;
  subtitle: string;
  subject: string;
  icon: string;
};

export type MiniGameLevelResult = {
  levelIndex: number;
  stars: Stars;
  score: number;
};

export type MiniGameProps = {
  levelIndex: number;
  onCompleteLevel: (result: MiniGameLevelResult) => void;
  onRequestExit: () => void;
};
