import type { NavigatorScreenParams } from "@react-navigation/native";

/** Pantallas legales (privacidad / términos). */
export type LegalDocumentKind = "privacy" | "terms";

/** Stack de acceso (sin sesión). */
export type AuthStackParamList = {
  AuthHome: undefined;
  LegalDocument: { kind: LegalDocumentKind };
};

export type MainTabParamList = {
  Feed: { userId?: string };
  Explore: { userId?: string };
  Profile: { userId?: string };
};

/** Stack encima de las tabs (p. ej. Ajustes). */
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Settings: undefined;
  ContentDetail: { contentId: string };
  GameCategory: {
    category: "astronomy" | "math" | "science" | "history" | "geography" | "creativity" | "mixed";
    difficulty?: "EASY" | "MEDIUM" | "HARD";
  };
  Quiz: { category?: string; difficulty?: "EASY" | "MEDIUM" | "HARD" } | undefined;
  VisualGame: { category?: string; difficulty?: "EASY" | "MEDIUM" | "HARD" };
  QuizResult: {
    score: number;
    total: number;
    /** XP otorgados por el servidor al completar (p. ej. sin sesión puede faltar). */
    xpGained?: number;
    category?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    gameMode?: "quiz" | "visual";
  };
  ChatInbox: undefined;
  ChatThread: { peerId: string; peerName: string };
};

/** Panel tutor (stack aparte del tab del menor). */
export type ParentStackParamList = {
  Parent: { parentId?: string };
  ParentAnalytics: { parentId?: string };
  Premium: undefined;
  LegalDocument: { kind: LegalDocumentKind };
};
