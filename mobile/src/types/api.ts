export type AchievementRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

/** Tipos de reacción del API (enum Prisma); si el backend añade valores, extender aquí. */
export type PostReactionType = "LIKE" | "CLAP" | "STAR";

export type ReactionsCountByType = Record<PostReactionType, number>;

export type BadgeApi = {
  icon: string;
  color: string;
  rarity: AchievementRarity;
  label: string;
};

export type FeedPost = {
  id: string;
  userId: string;
  content: string | null;
  imageUrl: string | null;
  videoUrl?: string | null;
  mediaModerationFlagged?: boolean;
  mediaModerationNote?: string | null;
  parentModerationVisibleAt?: string | null;
  parentModerationVisibleById?: string | null;
  type: string;
  visibility: string;
  createdAt: string;
  createdAtFormatted?: string;
  reactionsTotal: number;
  /** Conteos por tipo (claves como en el enum del servidor). */
  reactionsCountByType?: ReactionsCountByType;
  /** Reacción del usuario autenticado / viewer para este post. */
  userReaction?: PostReactionType | null;
  /** @deprecated Preferir `reactionsCountByType`. */
  reactionCounts?: { like: number; clap: number; star: number };
  /** Score de ranking: reactionsTotal + interestBoost + recencyScore */
  score?: number;
  /** Etiqueta de tipo: 🎮 Juego / 📚 Aprendizaje / 🏆 Logro (también derivable de `type`). */
  feedLabel?: string;
  /** Categoría del juego o logro (solo GAME_RESULT / ACHIEVEMENT). */
  category?: string;
  /** Puntos extra si coincide con categorías favoritas (UserInterest, orden por score). */
  interestBoost?: number;
  /** Componente de recencia del score (0–10 aprox.). */
  recencyScore?: number;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  badge?: BadgeApi;
};

export type ExploreFeedResponse = {
  posts: FeedPost[];
  hasMore: boolean;
};

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type EducationalContentItem = {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  difficulty: Difficulty;
  imageUrl: string | null;
  createdAt: string;
};

export type QuizQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ORDER";

export type QuizKnowledgeArea =
  | "mathematics"
  | "natural_sciences"
  | "social_sciences"
  | "language"
  | "art_culture"
  | "logic_thinking"
  | "emotions_values";

export type QuizQuestionItem = {
  id: string;
  question: string;
  options: string[];
  correct: number;
  category: string;
  difficulty: Difficulty;
  createdAt: string;
  quizLevel?: number;
  knowledgeArea?: QuizKnowledgeArea;
  topicSlug?: string;
  questionType?: QuizQuestionType;
  explanation?: string;
  hintCost?: number;
  readingPassage?: string | null;
  orderTapSequence?: number[] | null;
};

export type VisualQuestionItem = {
  id: string;
  imageUrl: string;
  question: string;
  options: string[];
  correct: number;
  category: string;
  difficulty: Difficulty;
  createdAt: string;
};

export type RecommendedGame = {
  id: string;
  name: string;
  category: string;
  difficulty: string;
};

/** Contenido educativo priorizado por `UserInterest` (lista sin cuerpo completo). */
export type RecommendedEducationalItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  imageUrl: string | null;
  createdAt: string;
};

/** Respuesta de `GET /api/recommendations` (contenido + quiz/visual mezclados en servidor). */
export type RecommendedGameMixItem =
  | {
      kind: "quiz";
      id: string;
      category: string;
      difficulty: string;
      question: string;
      createdAt: string;
    }
  | {
      kind: "visual";
      id: string;
      category: string;
      difficulty: string;
      question: string;
      imageUrl: string;
      createdAt: string;
    };

export type ExploreRecommendationsResponse = {
  content: RecommendedEducationalItem[];
  games: RecommendedGameMixItem[];
};

export type RecommendationsResponse = {
  recommendedGames: RecommendedGame[];
  recommendedPosts: FeedPost[];
  recommendedMissions: {
    id: string;
    title: string;
    description: string;
    category: string | null;
    targetValue: number;
    type: string;
  }[];
  /** Ordenado según categorías con mayor score en `UserInterest`. */
  recommendedEducationalContent?: RecommendedEducationalItem[];
  /** Hasta 8 categorías favoritas (mismo orden que en el servidor). */
  topInterestCategories?: string[];
  /** Amistades aceptadas (para vacíos de UI). */
  acceptedFriendCount: number;
};

export type ProfileAchievementItem = {
  title: string;
  icon: string;
  color: string;
  rarity: AchievementRarity;
  badge: BadgeApi;
};

export type ProfileInterestItem = {
  category: string;
  score: number;
};

export type UserNotificationPreferences = {
  notificationsEnabled: boolean;
  notificationSoundsEnabled: boolean;
};

export type UserProfileResponse = {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    level: number;
    experience: number;
  };
  stats: {
    totalPosts: number;
    totalAchievements: number;
    totalGameResults: number;
  };
  featuredBadges: ProfileAchievementItem[];
  /** Preferencias de notificación persistidas en el servidor. */
  preferences: UserNotificationPreferences;
  /** Intereses por categoría (puntuación descendente en el servidor). */
  interests?: ProfileInterestItem[];
  recentPosts: unknown[];
  achievements: ProfileAchievementItem[];
};

export type AchievementSystemKindApi = "PROGRESS" | "SKILL" | "SOCIAL" | "SPECIAL" | "COLLECTIBLE";

export type LevelTierApi = {
  tierName: string;
  tierBand: "bronce" | "plata" | "oro" | "diamante" | "leyenda";
  minLevel: number;
  maxLevel: number | null;
  badgeStyle: "bronze" | "silver" | "gold" | "diamond" | "legend_animated";
};

export type AchievementSystemItemApi = {
  id: string;
  title: string;
  description: string;
  category: string;
  badge: BadgeApi;
  icon: string;
  color: string;
  systemKind: AchievementSystemKindApi;
  collectionKey: string | null;
  slug: string | null;
  hidden: boolean;
  unlocked: boolean;
  obtainedAt: string | null;
  displayTitle: string;
  displayDescription: string;
  certificateUrl: string | null;
};

export type AchievementSystemOverviewResponse = {
  level: number;
  levelTier: LevelTierApi;
  achievementsPublicOnProfile: boolean;
  stats: {
    unlockedTotal: number;
    catalogTotal: number;
    byKind: Partial<
      Record<
        AchievementSystemKindApi,
        {
          unlocked: number;
          total: number;
        }
      >
    >;
  };
  collections: Array<{
    key: string;
    label: string;
    unlocked: number;
    total: number;
    complete: boolean;
    certificateUrl: string;
  }>;
  exhibition: {
    publicProfileToggle: boolean;
    friendCompare: boolean;
    trophyWall: boolean;
    downloadableCertificates: Array<{ collectionKey: string; url: string | null }>;
  };
  items: AchievementSystemItemApi[];
};

export type AchievementCompareResponse = {
  catalogTotal: number;
  you: { userId: string; unlocked: number };
  peer: { userId: string; username: string; level: number; unlocked: number };
  delta: number;
};

export type TodayMissionItem = {
  userMissionId: string;
  title: string;
  targetValue: number;
  progress: number;
  completed: boolean;
  rewardXpGranted: number | null;
  type: string;
};

export type DailyChallengeBonusInfo =
  | { granted: false }
  | { granted: true; bonusXp: number; grantedAt: string };

export type TodayMissionsResponse = {
  date: string;
  rewardXpRange: { min: number; max: number };
  /** XP extra al completar las 3 misiones del reto diario. */
  dailyChallengeBonusXp: number;
  dailyChallengeBonus: DailyChallengeBonusInfo;
  missions: TodayMissionItem[];
};

/** Recompensa de misión en respuestas de partida / logro (API). */
export type MissionCompletionRewardApi = {
  userMissionId: string;
  missionId: string;
  missionTitle: string;
  xpReward: number;
};

/** Logro desbloqueado al completar quiz (respuesta `POST /api/quiz/complete`). */
export type QuizAchievementUnlockApi = {
  id: string;
  title: string;
  category: string;
  badgeIcon?: string | null;
};

export type DailyChallengeBonusRewardApi = {
  bonusXp: number;
  badgeUnlocked: boolean;
  badgeTitle: string;
  badgeIcon: string;
};

export type ContentReportTarget = "POST" | "USER" | "CHAT_MESSAGE";
export type ContentReportStatus = "OPEN" | "DISMISSED" | "ESCALATED";

export type ParentModerationReportItem = {
  id: string;
  targetType: ContentReportTarget;
  status: ContentReportStatus;
  reason: string | null;
  resolutionNote: string | null;
  postId: string | null;
  reportedUserId: string | null;
  chatMessageId: string | null;
  reviewedAt: string | null;
  reviewedByParentId: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: { id: string; username: string; realName: string };
  post: {
    id: string;
    content: string | null;
    mediaModerationFlagged: boolean;
    user: { id: string; username: string };
  } | null;
  reportedUser: { id: string; username: string; realName: string } | null;
  chatMessage: {
    id: string;
    body: string;
    blocked: boolean;
    senderId: string;
    recipientId: string;
    createdAt: string;
  } | null;
};

export type ParentModerationReportsResponse = {
  reports: ParentModerationReportItem[];
};

export type ParentDashboardPost = {
  id: string;
  content: string | null;
  imageUrl: string | null;
  videoUrl?: string | null;
  mediaModerationFlagged?: boolean;
  mediaModerationNote?: string | null;
  parentModerationVisibleAt?: string | null;
  parentModerationVisibleById?: string | null;
  type: string;
  visibility: string;
  category?: string;
  createdAt: string;
};

export type MediaUploadResponse = {
  id: string;
  url: string;
  resourceType: string;
  publicId: string;
  moderationFlagged: boolean;
  moderationNote: string | null;
  createdAt: string;
};

export type ParentDashboardAchievement = {
  id: string;
  title: string;
  badgeIcon: string;
  rarity: AchievementRarity;
  obtainedAt: string;
};

/** Solicitud de amistad aceptada por el menor y pendiente de OK del tutor (destinatario = childId). */
export type ParentPendingFriendApproval = {
  friendshipId: string;
  senderUserId: string;
  senderUsername: string;
  senderRealName: string;
  createdAt: string;
};

export type ParentDashboardChildRow = {
  child: {
    id: string;
    username: string;
    realName: string;
    age: number;
    avatarUrl: string | null;
    level: number;
    experience: number;
    /** null = el tutor aún no aprobó la cuenta del menor en la app. */
    parentAccountApprovedAt: string | null;
    createdAt: string;
  };
  pendingFriendApprovals: ParentPendingFriendApproval[];
  timeSpentTodaySeconds: number;
  dailyScreenLimitMinutes: number;
  missionsCompletedToday: number;
  achievementsUnlockedToday: number;
  settings: {
    allowPosting: boolean;
    allowFriends: boolean;
    /** Si es false, el tutor desactivó el chat para este menor. */
    chatEnabled: boolean;
    /** Si es false, la API no devuelve el historial de chat para supervisión. */
    parentChatSupervisionEnabled: boolean;
    /** Push y novedades cuando hay un nuevo amigo aceptado. */
    notifyParentNewContact: boolean;
    /** Push y novedades por mensaje bloqueado o marcado por el filtro. */
    notifyParentSuspiciousChat: boolean;
    dailyScreenTimeLimit: number;
    contentFilterLevel: "LOW" | "MEDIUM" | "HIGH";
  };
  recentPosts: ParentDashboardPost[];
  recentAchievements: ParentDashboardAchievement[];
};

export type ParentFamilyEventDto = {
  id: string;
  kind: string;
  childId: string;
  peerUserId: string | null;
  title: string;
  body: string;
  createdAt: string;
};

export type ParentChildFriendEntry = {
  friendshipId: string;
  since: string;
  friend: { id: string; username: string; realName: string; avatarUrl: string | null };
};

export type ParentChildFriendsResponse = {
  childId: string;
  friends: ParentChildFriendEntry[];
};

export type ParentChildBlockedEntry = {
  id: string;
  blockedUserId: string;
  createdAt: string;
  user: { id: string; username: string; realName: string; avatarUrl: string | null };
};

export type ParentChildBlockedUsersResponse = {
  childId: string;
  blocked: ParentChildBlockedEntry[];
};

export type ParentDashboardResponse = {
  parent: {
    id: string;
    email: string;
    createdAt: string;
  };
  dateUtc: string;
  children: ParentDashboardChildRow[];
  /** Novedades familiares (p. ej. nuevo amigo). */
  familyEvents?: ParentFamilyEventDto[];
};

export type ParentAnalyticsWeeklyDay = {
  date: string;
  xpGained: number;
  gamesPlayed: number;
  missionsCompleted: number;
  activityScore: number;
};

export type ParentAnalyticsCategoryRow = {
  category: string;
  score: number;
  gameSessions: number;
};

export type ParentAnalyticsChildRow = {
  child: { id: string; username: string; realName: string };
  timeSpent: { todaySeconds: number; dailyLimitMinutes: number };
  progress: {
    level: number;
    experience: number;
    xpToNextLevel: number;
    missionsCompleted: number;
    achievementsUnlocked: number;
    gamesPlayed: number;
  };
  categoriesLearned: ParentAnalyticsCategoryRow[];
  weeklyActivity: ParentAnalyticsWeeklyDay[];
};

export type ParentChildAnalyticsResponse = {
  children: ParentAnalyticsChildRow[];
};

export type ChatConversationItem = {
  peer: { id: string; username: string; realName: string; avatarUrl: string | null };
  lastMessage: {
    id: string;
    createdAt: string;
    fromSelf: boolean;
    blocked: boolean;
    moderationFlagged: boolean;
    preview: string;
  };
};

export type ChatConversationsResponse = {
  conversations: ChatConversationItem[];
};

export type ChatThreadMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  blocked: boolean;
  moderationFlagged: boolean;
  createdAt: string;
};

export type ChatThreadResponse = {
  messages: ChatThreadMessage[];
  hasMore: boolean;
};

export type PostChatMessageResponse = {
  id: string;
  body: string;
  blocked: boolean;
  blockReason: string | null;
  moderationFlagged: boolean;
  createdAt: string;
};

export type ParentChildChatMessageRow = {
  id: string;
  createdAt: string;
  senderId: string;
  recipientId: string;
  senderUsername: string | null;
  recipientUsername: string | null;
  deliveredBody: string;
  blocked: boolean;
  blockReason: string | null;
  auditPlain: string | null;
  moderationFlagged: boolean;
};

export type ParentChildChatMessagesResponse = {
  childId: string;
  messages: ParentChildChatMessageRow[];
};

export type ParentCoachArticle = {
  id: string;
  title: string;
  excerpt: string;
  readMinutes: number;
  tags: string[];
};

export type ParentCoachVideo = {
  id: string;
  title: string;
  durationMinutes: number;
  psychologist: string;
  url: string;
};

export type ParentCoachTip = {
  id: string;
  text: string;
  applicableToday: boolean;
};

export type ParentCoachActivityIdea = {
  childId: string;
  childName: string;
  learnedThisWeek: string;
  activity: string;
  offlineHint: string;
};

export type ParentCoachConversationGuide = {
  id: string;
  topic: string;
  prompts: string[];
};

export type ParentCoachAlert = {
  id: string;
  severity: "info" | "watch" | "early";
  message: string;
  childId?: string;
  childName?: string;
};

export type ParentCoachResource = {
  id: string;
  title: string;
  type: "article" | "video" | "tip";
  reason: string;
  relevanceScore: number;
};

export type ParentCoachPayload = {
  understandingYourChild: {
    articles: ParentCoachArticle[];
    videos: ParentCoachVideo[];
    tips: ParentCoachTip[];
  };
  activitiesTogether: ParentCoachActivityIdea[];
  conversations: ParentCoachConversationGuide[];
  alerts: ParentCoachAlert[];
  personalizedResources: ParentCoachResource[];
  meta: { generatedAt: string; personalizationNote: string };
};
