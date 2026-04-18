import { Router } from "express";
import { register } from "../controllers/auth.controller";
import {
  getChildChatMessages,
  getChildFriendsForParent,
  approveChildAccount,
  getParentDashboard,
  listChildBlockedUsers,
  patchChildParentAdvancedSettings,
  patchChildParentSettings,
  postBlockUserForChild,
  postParentPushToken,
  unblockUserForChild,
} from "../controllers/parent.controller";
import {
  getParentMinorWeeklyReports,
  getParentSettingsBundle,
  listPendingApprovals,
  putParentSettingsBundle,
  respondToApproval,
} from "../controllers/parentsApi.controller";
import {
  getParentModerationReports,
  patchParentModerationReport,
  postParentApprovePostModeration,
} from "../controllers/report.controller";
import { verifyPremiumIapPurchase } from "../controllers/premiumIap.controller";
import { checkPremium } from "../middlewares/premium.middleware";
import { authWriteLimiter } from "../middlewares/rateLimit.middleware";
import { requireParent } from "../middlewares/rbac.middleware";

export const parentRouter = Router();

/**
 * Registro de tutor: mismo comportamiento que `POST /api/auth/register` (token + `parent` en la respuesta).
 * Preferí `/api/auth/register`; esta ruta se mantiene por compatibilidad con clientes antiguos.
 */
parentRouter.post("/", authWriteLimiter, register);

/** El resto de `/api/parents/*` requiere JWT de tutor. */
parentRouter.use(requireParent);

parentRouter.post("/premium/iap/verify", authWriteLimiter, verifyPremiumIapPurchase);
parentRouter.post("/:id/push-token", authWriteLimiter, postParentPushToken);
parentRouter.patch("/:id/children/:childId/settings", patchChildParentSettings);
parentRouter.patch(
  "/:id/children/:childId/parental-advanced",
  checkPremium,
  patchChildParentAdvancedSettings
);
parentRouter.get("/:id/dashboard", getParentDashboard);
parentRouter.post(
  "/:id/children/:childId/approve-account",
  authWriteLimiter,
  approveChildAccount
);
parentRouter.get("/:id/children/:childId/chat-messages", getChildChatMessages);
parentRouter.get("/:id/children/:childId/friends", getChildFriendsForParent);
parentRouter.get("/:id/children/:childId/blocked-users", listChildBlockedUsers);
parentRouter.post("/:id/children/:childId/blocked-users", authWriteLimiter, postBlockUserForChild);
parentRouter.delete("/:id/children/:childId/blocked-users/:blockedUserId", unblockUserForChild);
parentRouter.get("/:id/moderation/reports", getParentModerationReports);
parentRouter.patch("/:id/moderation/reports/:reportId", authWriteLimiter, patchParentModerationReport);
parentRouter.post(
  "/:id/moderation/posts/:postId/approve-visible",
  authWriteLimiter,
  postParentApprovePostModeration
);

parentRouter.get("/:id/approvals", listPendingApprovals);
parentRouter.post("/:id/approvals/:approvalId/respond", authWriteLimiter, respondToApproval);
parentRouter.get("/:id/reports", getParentMinorWeeklyReports);
parentRouter.get("/:id/settings", getParentSettingsBundle);
parentRouter.put("/:id/settings", authWriteLimiter, putParentSettingsBundle);
