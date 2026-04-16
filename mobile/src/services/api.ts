import axios from "axios";

import { API_BASE_URL } from "../config";
import { queueCelebrationsAfterContentLearn, queueCelebrationsAfterQuizComplete } from "../lib/celebrationQueue";
import { tryAlertMissionCompletions } from "../lib/missionCompletionFeedback";
import type {
  ChatConversationsResponse,
  ChatThreadResponse,
  DailyChallengeBonusRewardApi,
  EducationalContentItem,
  ExploreFeedResponse,
  FeedPost,
  MissionCompletionRewardApi,
  ParentChildBlockedUsersResponse,
  ParentChildChatMessagesResponse,
  ParentChildFriendsResponse,
  MediaUploadResponse,
  ParentDashboardResponse,
  ParentModerationReportsResponse,
  PostReactionType,
  PostChatMessageResponse,
  ContentReportTarget,
  ContentReportStatus,
  QuizQuestionItem,
  VisualQuestionItem,
  ExploreRecommendationsResponse,
  QuizAchievementUnlockApi,
  RecommendationsResponse,
  TodayMissionsResponse,
  ParentChildAnalyticsResponse,
  UserNotificationPreferences,
  UserProfileResponse,
} from "../types/api";

export type ReactionType = PostReactionType;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

export type AuthResponse = {
  token: string;
  parent: {
    id: string;
    email: string;
    /** Premium activo (incluye prueba por `premiumUntil`). */
    isPremium: boolean;
    premiumUntil: string | null;
  };
};

export function setApiToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
}

export async function registerParent(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/register", { email, password });
  return data;
}

export type ParentRegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export async function registerParentFull(payload: ParentRegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/register/parent", payload);
  return data;
}

export async function loginParent(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
  return data;
}

export type AuthChildSummary = {
  id: string;
  username: string;
  realName: string;
};

export type AuthMeParentResponse = {
  role: "parent";
  parent: AuthResponse["parent"];
  children: AuthChildSummary[];
};

export type AuthMeChildResponse = {
  role: "child";
  child: { id: string; username: string; realName: string };
  /** false si el tutor aún no aprobó la cuenta (el API solo emite JWT tras aprobación en login; sirve para sesiones heredadas). */
  accountApproved: boolean;
};

export type AuthMeResponse = AuthMeParentResponse | AuthMeChildResponse;

export function isParentMe(me: AuthMeResponse): me is AuthMeParentResponse {
  return me.role === "parent";
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const { data } = await api.get<AuthMeResponse>("/api/auth/me");
  return data;
}

/** Cuerpo enviado al backend para validar IAP con Apple / Google. */
export type VerifyPremiumIapBody =
  | {
      platform: "ios";
      productId: string;
      orderId: string;
      transactionReceipt: string;
    }
  | {
      platform: "android";
      productId: string;
      orderId: string;
      purchaseToken: string;
      packageName: string;
    };

export type VerifyPremiumIapResponse = {
  parent: AuthResponse["parent"];
};

export async function verifyPremiumIapPurchase(body: VerifyPremiumIapBody): Promise<VerifyPremiumIapResponse> {
  const { data } = await api.post<VerifyPremiumIapResponse>("/api/parents/premium/iap/verify", body);
  return data;
}

export type LoginChildResponse = {
  token: string;
  user: { id: string; username: string; realName: string };
};

export async function loginChild(username: string, password: string): Promise<LoginChildResponse> {
  const { data } = await api.post<LoginChildResponse>("/api/auth/login-child", { username, password });
  return data;
}

export type LoginMinorWithCodeResponse = {
  token: string;
  user: { id: string; username: string; realName: string; type: "minor" };
  approvalStatus: "approved" | "pending" | "blocked";
};

export async function loginMinorWithCode(
  username: string,
  accessCode: string
): Promise<LoginMinorWithCodeResponse> {
  const { data } = await api.post<LoginMinorWithCodeResponse>("/api/auth/minor/login-with-code", {
    username,
    accessCode,
  });
  return data;
}

export type RegisterMinorPayload = {
  username: string;
  password: string;
  age: number;
  avatar?: string;
  interests: string[];
};

export type RegisterMinorResponse = {
  minor: {
    id: string;
    username: string;
    age: number;
    avatar: string | null;
    parentId: string;
    approvalStatus: "pending" | "approved" | "blocked";
  };
  accessCode: string;
  notification: string;
};

export async function registerMinor(payload: RegisterMinorPayload): Promise<RegisterMinorResponse> {
  const { data } = await api.post<RegisterMinorResponse>("/api/auth/register/minor", payload);
  return data;
}

export type ParentMinorsListItem = {
  id: string;
  username: string;
  age: number;
  avatarUrl: string | null;
  status: string;
  approvalStatus: "pending" | "approved" | "blocked";
  relationStatus: string;
  relationUpdatedAt: string | null;
  lastActivity: { eventName: string; at: string } | null;
  minorProfile: {
    gradeLevel?: string | null;
    interests?: unknown;
  } | null;
};

export async function getParentMinors(parentId: string): Promise<ParentMinorsListItem[]> {
  const { data } = await api.get<ParentMinorsListItem[]>(`/api/parents/${encodeURIComponent(parentId)}/minors`);
  return data;
}

export type MinorApprovalItem = {
  id: string;
  activityType: "friend_request" | "post" | "purchase" | "content_access";
  activityData: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
};

export async function getParentPendingApprovals(parentId: string): Promise<MinorApprovalItem[]> {
  const { data } = await api.get<MinorApprovalItem[]>(`/api/parents/${encodeURIComponent(parentId)}/approvals`);
  return data;
}

export async function patchMinorApproval(
  minorId: string,
  payload: { approvalId: string; status: "approved" | "rejected" }
): Promise<void> {
  await api.patch(`/api/minors/${encodeURIComponent(minorId)}/approve`, payload);
}

export type OnboardingStatusResponse = {
  completed: boolean;
  firstAction: string | null;
};

export type FirstActionChoice = "PLAY_GAME" | "FOLLOW_USERS";

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatusResponse> {
  const { data } = await api.get<OnboardingStatusResponse>(`/api/users/${userId}/onboarding`);
  return data;
}

export async function postOnboardingPreferences(
  userId: string,
  payload: { interests: string[]; firstAction: FirstActionChoice }
): Promise<void> {
  await api.post(`/api/users/${userId}/onboarding`, payload);
}

export async function getPosts(userId: string): Promise<FeedPost[]> {
  const { data } = await api.get<FeedPost[]>("/posts", {
    params: { userId },
  });
  return data;
}

export async function getExploreFeed(
  userId: string,
  opts?: { limit?: number; excludeIds?: string[] }
): Promise<ExploreFeedResponse> {
  const params: Record<string, string | number> = { userId };
  if (opts?.limit != null) params.limit = opts.limit;
  if (opts?.excludeIds?.length) params.exclude = opts.excludeIds.join(",");
  const { data } = await api.get<ExploreFeedResponse>("/api/explore", { params });
  return data;
}

export async function getEducationalContent(params?: {
  category?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}): Promise<EducationalContentItem[]> {
  const { data } = await api.get<{ content: EducationalContentItem[] }>("/api/content", { params });
  return data.content;
}

export async function getEducationalContentById(contentId: string): Promise<EducationalContentItem> {
  const { data } = await api.get<{ content: EducationalContentItem }>(`/api/content/${contentId}`);
  return data.content;
}

export async function completeEducationalContent(
  contentId: string,
  payload: { userId: string; createPost?: boolean }
): Promise<{
  xpGained: number;
  createdPost: boolean;
  levelUp?: boolean;
  newLevel?: number;
  missionRewards?: MissionCompletionRewardApi[];
  dailyChallengeBonus?: DailyChallengeBonusRewardApi | null;
}> {
  const { data } = await api.post<{
    xpGained: number;
    createdPost: boolean;
    levelUp?: boolean;
    newLevel?: number;
    missionRewards?: MissionCompletionRewardApi[];
    dailyChallengeBonus?: DailyChallengeBonusRewardApi | null;
  }>(`/api/content/${contentId}/complete`, payload);
  queueCelebrationsAfterContentLearn(data);
  return data;
}

export async function getQuizQuestions(params: {
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  excludeIds?: string[];
}): Promise<QuizQuestionItem[]> {
  const query: Record<string, string> = {
    category: params.category,
    difficulty: params.difficulty,
  };
  if (params.excludeIds?.length) {
    query.excludeIds = params.excludeIds.join(",");
  }
  const { data } = await api.get<{ questions: QuizQuestionItem[] }>("/api/quiz", { params: query });
  return data.questions;
}

export async function getVisualQuestions(params: {
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  excludeIds?: string[];
}): Promise<VisualQuestionItem[]> {
  const query: Record<string, string> = {
    category: params.category,
    difficulty: params.difficulty,
  };
  if (params.excludeIds?.length) {
    query.excludeIds = params.excludeIds.join(",");
  }
  const { data } = await api.get<{ questions: VisualQuestionItem[] }>("/api/visual-quiz", { params: query });
  const rows = data.questions ?? [];
  return rows.map((q) => {
    const extra = q as VisualQuestionItem & { image_url?: string };
    const raw = (extra.imageUrl ?? extra.image_url ?? "").trim();
    return { ...q, imageUrl: raw };
  });
}

export type QuizCompleteResponse = {
  score: number;
  total: number;
  xpGained: number;
  missionRewards?: MissionCompletionRewardApi[];
  dailyChallengeBonus?: DailyChallengeBonusRewardApi | null;
  levelUp?: boolean;
  newLevel?: number;
  unlockedAchievements?: QuizAchievementUnlockApi[];
};

export async function completeQuizSession(payload: {
  userId: string;
  category: string;
  correct: number;
  total: number;
  /** `visual` registra el resultado en un juego `Visual · …` y post de juego visual. */
  mode?: "quiz" | "visual";
}): Promise<QuizCompleteResponse> {
  const { data } = await api.post<QuizCompleteResponse>("/api/quiz/complete", {
    ...payload,
    mode: payload.mode ?? "quiz",
  });
  queueCelebrationsAfterQuizComplete(data);
  return data;
}

export async function getUserRecommendations(userId: string): Promise<RecommendationsResponse> {
  const { data } = await api.get<RecommendationsResponse>(`/api/users/${userId}/recommendations`);
  return data;
}

/** Recomendaciones compactas: contenido educativo + preguntas quiz/visual (mezcla 70/30 en API). */
export async function getExploreRecommendations(userId: string): Promise<ExploreRecommendationsResponse> {
  const { data } = await api.get<ExploreRecommendationsResponse>("/api/recommendations", {
    params: { userId, limit: 8 },
  });
  return data;
}

export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  const { data } = await api.get<UserProfileResponse>(`/api/users/${userId}/profile`);
  return data;
}

export async function patchUserPreferences(
  userId: string,
  payload: Partial<Pick<UserNotificationPreferences, "notificationsEnabled" | "notificationSoundsEnabled">>
): Promise<{ preferences: UserNotificationPreferences }> {
  const { data } = await api.patch<{ preferences: UserNotificationPreferences }>(
    `/api/users/${encodeURIComponent(userId)}/preferences`,
    payload
  );
  return data;
}

export async function getTodayDailyMissions(userId: string): Promise<TodayMissionsResponse> {
  const { data } = await api.get<TodayMissionsResponse>(`/api/users/${userId}/daily-missions/today`);
  return data;
}

export async function getParentDashboard(parentId: string): Promise<ParentDashboardResponse> {
  const { data } = await api.get<ParentDashboardResponse>(`/api/parents/${parentId}/dashboard`);
  return data;
}

export async function postApproveChildAccount(parentId: string, childId: string): Promise<void> {
  await api.post(
    `/api/parents/${encodeURIComponent(parentId)}/children/${encodeURIComponent(childId)}/approve-account`
  );
}

/** Borra la cuenta del menor autenticado (JWT hijo). Respuesta `204`. */
export async function deleteMyAccount(): Promise<void> {
  await api.delete("/api/account");
}

/** Tutor autenticado: borra la cuenta del menor (`?childId=`). Respuesta `204`. */
export async function deleteChildAccountAsParent(childId: string): Promise<void> {
  await api.delete("/api/account", { params: { childId } });
}

export type ParentFriendDecisionBody = {
  userId: string;
  friendId: string;
  parentId: string;
};

export async function postParentApproveFriend(body: ParentFriendDecisionBody): Promise<unknown> {
  const { data } = await api.post<unknown>("/api/friends/parent-approve", body);
  return data;
}

export async function postParentRejectFriendAwaiting(body: ParentFriendDecisionBody): Promise<unknown> {
  const { data } = await api.post<unknown>("/api/friends/parent-reject-awaiting", body);
  return data;
}

export async function getParentChildFriends(parentId: string, childId: string): Promise<ParentChildFriendsResponse> {
  const { data } = await api.get<ParentChildFriendsResponse>(
    `/api/parents/${encodeURIComponent(parentId)}/children/${encodeURIComponent(childId)}/friends`
  );
  return data;
}

export async function getParentChildBlockedUsers(
  parentId: string,
  childId: string
): Promise<ParentChildBlockedUsersResponse> {
  const { data } = await api.get<ParentChildBlockedUsersResponse>(
    `/api/parents/${encodeURIComponent(parentId)}/children/${encodeURIComponent(childId)}/blocked-users`
  );
  return data;
}

export async function postParentChildBlockUser(
  parentId: string,
  childId: string,
  body: { username?: string; blockedUserId?: string }
): Promise<{ childId: string; blockedUserId: string; username: string }> {
  const { data } = await api.post(
    `/api/parents/${encodeURIComponent(parentId)}/children/${encodeURIComponent(childId)}/blocked-users`,
    body
  );
  return data;
}

export async function deleteParentChildBlockUser(
  parentId: string,
  childId: string,
  blockedUserId: string
): Promise<void> {
  await api.delete(
    `/api/parents/${encodeURIComponent(parentId)}/children/${encodeURIComponent(childId)}/blocked-users/${encodeURIComponent(blockedUserId)}`
  );
}

/** Registra token Expo Push del tutor (`204`). */
export async function postParentPushToken(parentId: string, token: string | null): Promise<void> {
  if (token == null || token.trim() === "") {
    await api.post(`/api/parents/${encodeURIComponent(parentId)}/push-token`, { token: null });
    return;
  }
  await api.post(`/api/parents/${encodeURIComponent(parentId)}/push-token`, { token: token.trim() });
}

export async function getParentChildAnalytics(parentId: string): Promise<ParentChildAnalyticsResponse> {
  const { data } = await api.get<ParentChildAnalyticsResponse>(
    `/api/analytics/parent/${encodeURIComponent(parentId)}`
  );
  return data;
}

export type PatchChildParentSettingsBody = {
  allowPosting?: boolean;
  allowFriends?: boolean;
  chatEnabled?: boolean;
  parentChatSupervisionEnabled?: boolean;
  notifyParentNewContact?: boolean;
  notifyParentSuspiciousChat?: boolean;
};

export type PatchChildParentSettingsResponse = {
  childId: string;
  allowPosting: boolean;
  allowFriends: boolean;
  chatEnabled: boolean;
  parentChatSupervisionEnabled: boolean;
  notifyParentNewContact: boolean;
  notifyParentSuspiciousChat: boolean;
};

export async function patchChildParentSettings(
  parentId: string,
  childId: string,
  patch: PatchChildParentSettingsBody
): Promise<PatchChildParentSettingsResponse> {
  const { data } = await api.patch(`/api/parents/${parentId}/children/${childId}/settings`, patch);
  return data;
}

export async function getChatConversations(): Promise<ChatConversationsResponse> {
  const { data } = await api.get<ChatConversationsResponse>("/api/chat/conversations");
  return data;
}

export async function getChatThread(peerId: string, opts?: { before?: string }): Promise<ChatThreadResponse> {
  const { data } = await api.get<ChatThreadResponse>(`/api/chat/threads/${encodeURIComponent(peerId)}`, {
    params: opts?.before ? { before: opts.before } : undefined,
  });
  return data;
}

export async function postChatMessage(recipientId: string, text: string): Promise<PostChatMessageResponse> {
  const { data } = await api.post<PostChatMessageResponse>("/api/chat/messages", { recipientId, text });
  return data;
}

export async function getParentChildChatMessages(
  parentId: string,
  childId: string,
  limit?: number
): Promise<ParentChildChatMessagesResponse> {
  const { data } = await api.get<ParentChildChatMessagesResponse>(
    `/api/parents/${encodeURIComponent(parentId)}/children/${encodeURIComponent(childId)}/chat-messages`,
    { params: limit != null ? { limit } : undefined }
  );
  return data;
}

export type ScreenTimeResponse = {
  dailyLimitMinutes: number;
  usedTodaySeconds: number;
  limitExceeded: boolean;
  remainingSeconds: number;
  lastReset: string;
};

export async function getScreenTime(userId: string): Promise<ScreenTimeResponse> {
  const { data } = await api.get<ScreenTimeResponse>(`/api/users/${userId}/screen-time`);
  return data;
}

export async function postScreenTimeTick(userId: string, deltaSeconds: number): Promise<ScreenTimeResponse> {
  const { data } = await api.post<ScreenTimeResponse>(`/api/users/${userId}/screen-time/tick`, {
    deltaSeconds,
  });
  return data;
}

/**
 * Popup de misión completada desde la respuesta del servidor (evita duplicar con el mismo `userMissionId` que en Perfil).
 */
export function notifyMissionRewardsFromApiResponse(rewards: MissionCompletionRewardApi[] | undefined): void {
  if (!rewards?.length) return;
  tryAlertMissionCompletions(rewards.map((r) => ({ userMissionId: r.userMissionId, xpReward: r.xpReward })));
}

export async function createReaction(payload: {
  userId: string;
  postId: string;
  type: ReactionType;
}): Promise<void> {
  await api.post("/reactions", payload);
}

export async function createUserPost(payload: {
  userId: string;
  content: string;
  type: "POST";
  visibility: "PUBLIC";
  /** Tras `uploadMediaFile`; no combinar con imageUrl/videoUrl manuales en el mismo POST. */
  mediaUploadId?: string;
}): Promise<void> {
  await api.post("/posts", {
    userId: payload.userId,
    content: payload.content,
    imageUrl: null,
    ...(payload.mediaUploadId ? { mediaUploadId: payload.mediaUploadId } : {}),
    type: payload.type,
    visibility: payload.visibility,
  });
}

/**
 * Sube imagen o video (multipart `file`). Requiere sesión menor y Cloudinary configurado en el API.
 */
export async function uploadMediaFile(formData: FormData): Promise<MediaUploadResponse> {
  const { data } = await api.post<MediaUploadResponse>("/api/media/upload", formData);
  return data;
}

/** Denuncia de contenido (sesión menor). */
export async function postContentReport(payload: {
  targetType: ContentReportTarget;
  postId?: string;
  reportedUserId?: string;
  chatMessageId?: string;
  reason?: string;
}): Promise<{
  id: string;
  targetType: ContentReportTarget;
  status: ContentReportStatus;
  reason: string | null;
  postId: string | null;
  reportedUserId: string | null;
  chatMessageId: string | null;
  createdAt: string;
}> {
  const { data } = await api.post("/api/reports", payload);
  return data;
}

export async function getParentModerationReports(
  parentId: string,
  opts?: { status?: ContentReportStatus }
): Promise<ParentModerationReportsResponse> {
  const params: Record<string, string> = {};
  if (opts?.status) params.status = opts.status;
  const { data } = await api.get<ParentModerationReportsResponse>(
    `/api/parents/${encodeURIComponent(parentId)}/moderation/reports`,
    { params }
  );
  return data;
}

export async function patchParentModerationReport(
  parentId: string,
  reportId: string,
  body: { status: "DISMISSED" | "ESCALATED"; resolutionNote?: string | null }
): Promise<{
  id: string;
  status: ContentReportStatus;
  resolutionNote: string | null;
  reviewedAt: string | null;
  reviewedByParentId: string | null;
  updatedAt: string;
}> {
  const { data } = await api.patch(
    `/api/parents/${encodeURIComponent(parentId)}/moderation/reports/${encodeURIComponent(reportId)}`,
    body
  );
  return data;
}

export async function postParentApprovePostModerationVisibility(
  parentId: string,
  postId: string
): Promise<{
  id: string;
  mediaModerationFlagged: boolean;
  parentModerationVisibleAt: string | null;
  parentModerationVisibleById: string | null;
}> {
  const { data } = await api.post(
    `/api/parents/${encodeURIComponent(parentId)}/moderation/posts/${encodeURIComponent(postId)}/approve-visible`
  );
  return data;
}

/** Guarda o borra el token Expo Push del menor en el API (`204` sin cuerpo). */
export async function postExpoPushToken(userId: string, token: string | null): Promise<void> {
  await api.post(`/api/users/${encodeURIComponent(userId)}/push-token`, { token });
}
