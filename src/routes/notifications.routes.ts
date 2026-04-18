import { Router } from "express";
import {
  deleteNotification,
  getNotificationPreferences,
  getUnreadCount,
  listNotifications,
  putNotificationPreferences,
  putNotificationRead,
  putNotificationsReadAll,
} from "../controllers/notificationsApi.controller";
import { authWriteLimiter } from "../middlewares/rateLimit.middleware";
import { requireChild } from "../middlewares/rbac.middleware";

export const notificationsRouter = Router();

notificationsRouter.use(requireChild);

notificationsRouter.get("/unread-count", getUnreadCount);
notificationsRouter.put("/read-all", authWriteLimiter, putNotificationsReadAll);
notificationsRouter.get("/preferences", getNotificationPreferences);
notificationsRouter.put("/preferences", authWriteLimiter, putNotificationPreferences);
notificationsRouter.get("/", listNotifications);
notificationsRouter.put("/:notificationId/read", authWriteLimiter, putNotificationRead);
notificationsRouter.delete("/:notificationId", authWriteLimiter, deleteNotification);
