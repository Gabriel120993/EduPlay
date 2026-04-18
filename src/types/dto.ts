/**
 * DTOs de API alineados al esquema Prisma EduPlay.
 * Las fechas en respuestas HTTP suelen serializarse como ISO 8601 (`string`).
 * JSDoc: reglas de validación sugeridas (la validación real va en Zod/express-validator).
 */

import type {
  AchievementRarity,
  AchievementSystemKind,
  ActivityApprovalStatus,
  ActivityType,
  ChallengeBucket,
  ContentCategory,
  ContentFilterLevel,
  ContentReportStatus,
  ContentReportTarget,
  Difficulty,
  EducationalContentType,
  FriendStatus,
  LiveEventStatus,
  MissionType,
  NotificationKind,
  ParentChildRelationStatus,
  PostType,
  QuizKnowledgeArea,
  QuizQuestionType,
  ReactionType,
  StreakKind,
  StudyGroupRole,
  SubscriptionTier,
  UserStatus,
  UserType,
  VerificationMethod,
  VerificationStatus,
  Visibility,
} from "@prisma/client";

// =============================================================================
// 12. Genéricos request/response
// =============================================================================

/** Orden de listados */
export type SortOrder = "asc" | "desc";

/**
 * Paginación estándar.
 * @validation page >= 1, pageSize entre 1 y 100 típico
 */
export interface FilterParams {
  /** Página 1-based */
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  /** Búsqueda libre */
  q?: string;
  /** Filtros adicionales por recurso */
  filters?: Record<string, string | number | boolean | undefined>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  /** Metadatos opcionales (ETag, versión, etc.) */
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  error: string;
  /** Código estable para cliente (p.ej. VALIDATION_ERROR) */
  code?: string;
  details?: Record<string, unknown> | unknown[];
}

// =============================================================================
// 1. USER DTOs
// =============================================================================

/**
 * Alta de menor (tutor autenticado).
 * @validation username 3-32 chars alfanumérico; age 6-17; parentId debe coincidir con JWT tutor
 */
export interface CreateUserDto {
  username: string;
  realName: string;
  age: number;
  parentId: string;
  password?: string;
}

/**
 * Parche de perfil menor / usuario.
 * @validation no incluir passwordHash directamente; usar flujo dedicado
 */
export interface UpdateUserDto {
  realName?: string;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  notificationsEnabled?: boolean;
  notificationSoundsEnabled?: boolean;
  achievementsPublicOnProfile?: boolean;
}

/**
 * Login tutor o menor.
 * @validation email/username según endpoint; password mín. 8 caracteres recomendado
 */
export interface LoginDto {
  email?: string;
  username?: string;
  password: string;
}

/**
 * Registro de cuenta tutor.
 * @validation email único; password fuerte
 */
export interface RegisterParentDto {
  email: string;
  password: string;
  /** Opcional: nombre para saludo en UI */
  displayName?: string;
}

/**
 * Registro / alta menor con código o flujo tutor.
 */
export interface RegisterMinorDto {
  username: string;
  realName: string;
  age: number;
  parentId: string;
  password: string;
}

/** Respuesta pública de usuario (nunca incluye `passwordHash`). */
export interface UserResponseDto {
  id: string;
  username: string;
  realName: string;
  type: UserType;
  status: UserStatus;
  age: number;
  avatarUrl: string | null;
  profileImageUrl: string | null;
  level: number;
  experience: number;
  quizCoins: number;
  activityStreakDays: number;
  lastActivityStreakUtc: string | null;
  parentId: string;
  onboardingCompletedAt: string | null;
  parentAccountApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Perfil enriquecido para pantalla “Yo”. */
export interface UserProfileDto extends UserResponseDto {
  minorProfile?: MinorProfileDto | null;
  parentProfile?: ParentProfileDto | null;
  gamification?: UserGamificationDto | null;
}

export interface ParentProfileDto {
  userId: string;
  verificationStatus: VerificationStatus;
  verificationMethod: VerificationMethod;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  updatedAt: string;
}

/**
 * Perfil pedagógico del menor.
 * `interests` y `contentRestrictions` reflejan JSON en BD.
 */
export interface MinorProfileDto {
  userId: string;
  parentId: string;
  age: number;
  gradeLevel: string | null;
  school: string | null;
  interests: unknown[];
  dailyTimeLimit: number;
  contentRestrictions: Record<string, unknown>;
  canMakePurchases: boolean;
  canAddFriends: boolean;
  canPostContent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParentChildRelationDto {
  id: string;
  parentId: string;
  childId: string;
  status: ParentChildRelationStatus;
  approvalRequiredFor: unknown[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 2. GAMIFICATION DTOs
// =============================================================================

export interface UserGamificationDto {
  userId: string;
  totalXpEarned: number;
  totalCoinsSpent: number;
  lastLevelUpAt: string | null;
  updatedAt: string;
}

/** Parche de snapshot / preferencias de economía (si la API lo expone). */
export interface UpdateGamificationDto {
  /** Solo uso interno / admin; normalmente la XP se deriva de eventos */
  totalXpEarned?: number;
  totalCoinsSpent?: number;
}

export interface AchievementDto {
  id: string;
  title: string;
  description: string;
  iconUrl: string | null;
  category: ContentCategory;
  badgeColor: string;
  badgeIcon: string;
  rarity: AchievementRarity;
  systemKind: AchievementSystemKind;
  hidden: boolean;
  collectionKey: string | null;
  slug: string | null;
  sortOrder: number;
}

export interface UserAchievementDto {
  id: string;
  userId: string;
  achievementId: string;
  achievement?: AchievementDto;
  obtainedAt: string;
}

/** Colección de logros (p.ej. científicos) para mural. */
export interface CollectionDto {
  key: string;
  title: string;
  items: AchievementDto[];
  unlockedCount: number;
  totalCount: number;
}

/** Ítem de inventario cosmético (producto; no todos tienen tabla Prisma dedicada). */
export interface InventoryItemDto {
  id: string;
  kind: "avatar" | "badge" | "frame" | "other";
  name: string;
  assetKey: string;
  equipped: boolean;
  acquiredAt: string | null;
}

export interface EquipItemDto {
  userId: string;
  itemId: string;
  slot?: string;
}

// =============================================================================
// 3. CONTENT DTOs
// =============================================================================

export interface ContentCategoryDto {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface SubjectDto {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface TopicDto {
  id: string;
  subjectId: string;
  slug: string;
  name: string;
  summary: string | null;
  sortOrder: number;
}

/** Metadatos por tipo de recurso educativo */
export type ContentPayloadDto =
  | { contentType: "VIDEO"; durationSeconds?: number; videoUrl?: string }
  | { contentType: "READING"; estimatedMinutes?: number }
  | { contentType: "EXPERIMENT"; materials?: string[]; safetyNote?: string }
  | { contentType: "INTERACTIVE"; embedUrl?: string }
  | { contentType: "WORKSHEET"; pageCount?: number }
  | { contentType: "AUDIO"; durationSeconds?: number; audioUrl?: string };

export interface ContentDto {
  id: string;
  title: string;
  description: string;
  content: string;
  contentType: EducationalContentType;
  category: string;
  difficulty: Difficulty;
  imageUrl: string | null;
  topicId: string | null;
  topic?: TopicDto | null;
  meta: Record<string, unknown> | null;
  published: boolean;
  /** Datos derivados o fusionados con `meta` para UI */
  data?: ContentPayloadDto;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alta de contenido.
 * @validation title 1-200; content no vacío si published
 */
export interface CreateContentDto {
  title: string;
  description: string;
  content: string;
  contentType: EducationalContentType;
  category: string;
  difficulty: Difficulty;
  imageUrl?: string | null;
  topicId?: string | null;
  meta?: Record<string, unknown>;
  published?: boolean;
}

export interface ContentViewDto {
  contentId: string;
  userId: string;
  viewedAt: string;
  /** Segundos en pantalla si se trackea */
  dwellSeconds?: number;
}

export interface ContentProgressDto {
  contentId: string;
  userId: string;
  percentComplete: number;
  lastSeenAt: string;
  completed: boolean;
}

// =============================================================================
// 4. QUIZ DTOs
// =============================================================================

export interface QuizDto {
  id: string;
  title: string;
  description: string;
  topicId: string | null;
  legacyCategory: ContentCategory | null;
  difficulty: Difficulty;
  questionCount: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Opciones según tipo de pregunta */
export type QuestionOptionsDto =
  | { questionType: "MULTIPLE_CHOICE"; options: [string, string, string, string] }
  | { questionType: "TRUE_FALSE"; options: ["Verdadero", "Falso"] }
  | { questionType: "ORDER"; options: string[] };

export interface QuestionDto {
  id: string;
  quizId: string | null;
  question: string;
  options: string[];
  correct: number;
  category: string;
  difficulty: Difficulty;
  quizLevel: number;
  knowledgeArea: QuizKnowledgeArea;
  topicSlug: string;
  questionType: QuizQuestionType;
  explanation: string;
  hintText: string | null;
  hintCost: number;
  readingPassage: string | null;
  orderTapSequence: number[] | null;
  createdAt: string;
  /** Tipado estrecho opcional para validación en cliente */
  typedOptions?: QuestionOptionsDto;
}

export interface QuizAttemptDto {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  maxScore: number;
  correctCount: number;
  durationMs: number | null;
  finishedAt: string;
}

/**
 * @validation respuestas misma longitud que preguntas del intento
 */
export interface CreateQuizAttemptDto {
  quizId: string;
  answers: AnswerDto[];
  durationMs?: number;
}

export interface AnswerDto {
  questionId: string;
  /** Índice elegido o orden para tipo ORDER */
  selectedIndex: number;
}

export interface QuizResultDto {
  attempt: QuizAttemptDto;
  passed: boolean;
  xpAwarded?: number;
  coinsAwarded?: number;
}

export interface QuizStatsDto {
  userId: string;
  quizId: string;
  attempts: number;
  bestScore: number;
  lastFinishedAt: string | null;
}

// =============================================================================
// 5. GAME DTOs (Game legacy + MiniGame)
// =============================================================================

export interface GameDto {
  id: string;
  name: string;
  category: ContentCategory;
  difficulty: string;
}

/** Sesión de minijuego (modelo `MiniGameSession`). */
export interface GameSessionDto {
  id: string;
  userId: string;
  miniGameId: string;
  score: number;
  durationMs: number | null;
  levelIndex: number | null;
  metadata: Record<string, unknown> | null;
  startedAt: string;
  endedAt: string | null;
}

export interface CreateGameSessionDto {
  miniGameId: string;
  score: number;
  durationMs?: number;
  levelIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface GameProgressDto {
  userId: string;
  miniGameId: string;
  highScore: number;
  lastPlayedAt: string | null;
}

export interface GameResultDto {
  id: string;
  score: number;
  userId: string;
  gameId: string;
  createdAt: string;
}

// =============================================================================
// 6. MISSION / CHALLENGE DTOs
// =============================================================================

export interface MissionDto {
  id: string;
  title: string;
  description: string;
  category: ContentCategory | null;
  targetValue: number;
  type: MissionType;
}

export interface MissionProgressDto {
  id: string;
  userId: string;
  missionId: string;
  progress: number;
  completed: boolean;
  rewardXpGranted: number | null;
  date: string;
}

export interface MissionActivityDto {
  kind: "video" | "quiz" | "game" | "reading" | "experiment" | "activity" | "challenge" | "creative";
  title: string;
  summary: string;
  order: number;
}

export interface ChallengeDto {
  id: string;
  userId: string;
  bucket: ChallengeBucket;
  periodKey: string;
  challengeSlug: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
  rewardsGranted: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeCompletionDto {
  challengeId: string;
  userId: string;
  completedAt: string;
  rewards: Record<string, unknown>;
}

export interface DailyChallengesDto {
  periodKey: string;
  challenges: ChallengeDto[];
  bonusClaimed: boolean;
}

// =============================================================================
// 7. SOCIAL DTOs
// =============================================================================

export interface FriendshipDto {
  id: string;
  status: FriendStatus;
  requiresParentApproval: boolean;
  parentApproved: boolean;
  userId: string;
  friendId: string;
  createdAt: string;
}

export interface CreateFriendRequestDto {
  friendId: string;
  message?: string;
}

export interface RespondFriendRequestDto {
  friendshipId: string;
  accept: boolean;
}

export interface StudyGroupDto {
  id: string;
  name: string;
  description: string;
  ownerUserId: string;
  inviteCode: string | null;
  maxMembers: number;
  isOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudyGroupMemberDto {
  id: string;
  groupId: string;
  userId: string;
  role: StudyGroupRole;
  joinedAt: string;
}

export interface CreateStudyGroupDto {
  name: string;
  description?: string;
  maxMembers?: number;
  isOpen?: boolean;
}

/** Compañero de estudio sugerido o emparejado (producto). */
export interface StudyBuddyDto {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  sharedTopics?: string[];
  matchScore?: number;
}

export interface MessageDto {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  blocked: boolean;
  moderationFlagged: boolean;
  createdAt: string;
}

export interface SendMessageDto {
  recipientId: string;
  body: string;
}

export interface PredefinedMessageDto {
  id: string;
  label: string;
  body: string;
  category?: string;
}

// =============================================================================
// 8. PARENTAL DTOs
// =============================================================================

export interface ActivityApprovalDto {
  id: string;
  minorId: string;
  parentId: string;
  activityType: ActivityType;
  activityData: Record<string, unknown>;
  status: ActivityApprovalStatus;
  requestedAt: string;
  respondedAt: string | null;
}

export interface RespondApprovalDto {
  approvalId: string;
  approve: boolean;
  note?: string;
}

export interface ParentalSettingsDto {
  id: string;
  parentId: string;
  childId: string;
  dailyScreenTimeLimit: number;
  allowPosting: boolean;
  allowFriends: boolean;
  chatEnabled: boolean;
  parentChatSupervisionEnabled: boolean;
  notifyParentNewContact: boolean;
  notifyParentSuspiciousChat: boolean;
  contentFilterLevel: ContentFilterLevel;
}

export interface UpdateParentalSettingsDto {
  dailyScreenTimeLimit?: number;
  allowPosting?: boolean;
  allowFriends?: boolean;
  chatEnabled?: boolean;
  parentChatSupervisionEnabled?: boolean;
  notifyParentNewContact?: boolean;
  notifyParentSuspiciousChat?: boolean;
  contentFilterLevel?: ContentFilterLevel;
}

/** Informe semanal agregado (contrato flexible + campos típicos). */
export interface WeeklyReportDto {
  childId: string;
  weekStart: string;
  weekEnd: string;
  minutesPlayed: number;
  quizzesCompleted: number;
  xpGained: number;
  topSubjects: { name: string; minutes: number }[];
  highlights?: string[];
}

export interface ChildProgressDto {
  childId: string;
  level: number;
  experience: number;
  streakDays: number;
  missionsCompleted: number;
  lastActiveAt: string | null;
}

export interface ChildActivityDto {
  id: string;
  childId: string;
  kind: "quiz" | "game" | "content" | "mission" | "social";
  summary: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// 9. EVENT DTOs
// =============================================================================

export interface LiveEventDto {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  streamUrl: string | null;
  status: LiveEventStatus;
  hostLabel: string | null;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LiveEventParticipantDto {
  id: string;
  eventId: string;
  userId: string;
  joinedAt: string;
  watchMs: number | null;
}

export interface JoinEventDto {
  eventId: string;
}

export interface EventReminderDto {
  eventId: string;
  userId: string;
  remindAt: string;
  channel: "push" | "email" | "in_app";
}

// =============================================================================
// 10. NOTIFICATION DTOs
// =============================================================================

export interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationKind;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface CreateNotificationDto {
  userId: string;
  type: NotificationKind;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface MarkReadDto {
  notificationIds: string[];
  /** Si true, marca todas las del usuario */
  markAll?: boolean;
}

export interface NotificationPreferencesDto {
  userId: string;
  notificationsEnabled: boolean;
  notificationSoundsEnabled: boolean;
  /** Por tipo, si se extiende el modelo */
  mutedKinds?: NotificationKind[];
}

// =============================================================================
// 11. REPORT DTOs
// =============================================================================

export interface CreateReportDto {
  targetType: ContentReportTarget;
  postId?: string;
  reportedUserId?: string;
  chatMessageId?: string;
  reason?: string;
}

export interface ReportDto {
  id: string;
  targetType: ContentReportTarget;
  reason: string | null;
  status: ContentReportStatus;
  resolutionNote: string | null;
  priority: number;
  reporterUserId: string;
  postId: string | null;
  reportedUserId: string | null;
  chatMessageId: string | null;
  reviewedByParentId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveReportDto {
  reportId: string;
  status: ContentReportStatus;
  resolutionNote?: string;
}

// =============================================================================
// Tipos auxiliares reutilizables (feed, posts)
// =============================================================================

export interface PostDto {
  id: string;
  userId: string;
  type: PostType;
  visibility: Visibility;
  content: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  category: ContentCategory | null;
  createdAt: string;
}

export interface ReactionDto {
  id: string;
  userId: string;
  postId: string;
  type: ReactionType;
  createdAt: string;
}

/** Origen de XP para listados de ledger (re-export Prisma). */
export type { XpGainSource } from "@prisma/client";
