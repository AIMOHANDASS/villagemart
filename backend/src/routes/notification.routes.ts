import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationsRead,
  markSingleNotificationRead,
  registerToken,
  unregisterToken,
  sendCustomPush
} from "../controllers/notification.controller";

const router = express.Router();

/* ======================================================
   ✅ REGISTER & UNREGISTER FCM TOKEN
====================================================== */
router.post("/register-token", verifyToken, registerToken);
router.delete("/unregister-token", verifyToken, unregisterToken);
router.post("/send-custom", verifyToken, sendCustomPush);


/* ======================================================
   🔔 GET USER NOTIFICATIONS
   Allows GET /api/notifications (reads from token)
   or GET /api/notifications/:userId
====================================================== */
// GET /api/notifications/unread-count must be before /:userId
router.get("/unread-count", verifyToken, getUnreadCount);

router.get("/", verifyToken, getUserNotifications);
router.get("/:userId", verifyToken, getUserNotifications);

/* ======================================================
   ✅ MARK NOTIFICATIONS AS READ
   Allows POST /api/notifications/read (reads from token)
   or POST /api/notifications/read/:userId
====================================================== */
router.post("/read", verifyToken, markNotificationsRead);
router.post("/read/:userId", verifyToken, markNotificationsRead);

/* ======================================================
   ✅ MARK SINGLE NOTIFICATION AS READ
====================================================== */
router.post("/read-single/:id", verifyToken, markSingleNotificationRead);

export default router;
