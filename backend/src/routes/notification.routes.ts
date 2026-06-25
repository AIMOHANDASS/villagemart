import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  getUserNotifications,
  markNotificationsRead,
  markSingleNotificationRead,
} from "../controllers/notification.controller";

const router = express.Router();

/* ======================================================
   🔔 GET USER NOTIFICATIONS
   Allows GET /api/notifications (reads from token)
   or GET /api/notifications/:userId
====================================================== */
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
