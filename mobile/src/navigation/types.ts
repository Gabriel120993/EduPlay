import type { NavigatorScreenParams } from "@react-navigation/native";

import type { MiniGameId } from "../games/types";
import type { QuizKnowledgeArea } from "../types/api";

/** Pantallas legales (privacidad / términos). */
export type LegalDocumentKind = "privacy" | "terms";

/** Stack de acceso (sin sesión). */
export type AuthStackParamList = {
  AuthHome: undefined;
  ParentRegister: undefined;
  MinorLogin: undefined;
  LegalDocument: { kind: LegalDocumentKind };
};

export type MainTabParamList = {
  Feed: { userId?: string };
  Explore: { userId?: string };
  Library: { userId?: string };
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
  QuizAreas: undefined;
  Quiz: {
    category?: string;
    knowledgeArea?: QuizKnowledgeArea;
    topicSlug?: string;
    quizLevel?: 1 | 2 | 3 | 4 | 5;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    /** Segundos por pregunta; `0` = sin temporizador. */
    timerSeconds?: number;
    challengeLives?: number;
    adaptive?: boolean;
  } | undefined;
  VisualGame: { category?: string; difficulty?: "EASY" | "MEDIUM" | "HARD"; gameId?: string };
  QuizResult: {
    score: number;
    total: number;
    /** XP otorgados por el servidor al completar (p. ej. sin sesión puede faltar). */
    xpGained?: number;
    category?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    gameMode?: "quiz" | "visual";
    recommendations?: string[];
    knowledgeArea?: QuizKnowledgeArea;
  };
  ChatInbox: undefined;
  ChatThread: { peerId: string; peerName: string };
  MiniGamesHub: undefined;
  MiniGamePlayer: { gameId: MiniGameId; levelIndex?: number };
  AchievementSystem: undefined;
};

/** Solo wizard de onboarding tutor (antes del panel principal). */
export type ParentOnboardingOnlyParamList = {
  ParentOnboarding: undefined;
  ParentOnboardingComplete: undefined;
  AddMinor: undefined;
};

/** Panel tutor (stack aparte del tab del menor). */
export type ParentStackParamList = {
  Parent: { parentId?: string };
  ParentDashboard: { parentId?: string } | undefined;
  AddMinor: undefined;
  ParentApproval: { parentId?: string } | undefined;
  ParentAnalytics: { parentId?: string };
  ParentCoach: { parentId?: string };
  Premium: undefined;
  LegalDocument: { kind: LegalDocumentKind };
};
