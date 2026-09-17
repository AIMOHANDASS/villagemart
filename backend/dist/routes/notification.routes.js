"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const notification_controller_1 = require("../controllers/notification.controller");
const router = express_1.default.Router();
/* ======================================================
   ✅ REGISTER & UNREGISTER FCM TOKEN
====================================================== */
router.post("/register-token", auth_middleware_1.verifyToken, notification_controller_1.registerToken);
router.delete("/unregister-token", auth_middleware_1.verifyToken, notification_controller_1.unregisterToken);
router.post("/send-custom", auth_middleware_1.verifyToken, notification_controller_1.sendCustomPush);
/* ======================================================
   🔔 GET USER NOTIFICATIONS
   Allows GET /api/notifications (reads from token)
   or GET /api/notifications/:userId
====================================================== */
// GET /api/notifications/unread-count must be before /:userId
router.get("/unread-count", auth_middleware_1.verifyToken, notification_controller_1.getUnreadCount);
router.get("/", auth_middleware_1.verifyToken, notification_controller_1.getUserNotifications);
router.get("/:userId", auth_middleware_1.verifyToken, notification_controller_1.getUserNotifications);
/* ======================================================
   ✅ MARK NOTIFICATIONS AS READ
   Allows POST /api/notifications/read (reads from token)
   or POST /api/notifications/read/:userId
====================================================== */
router.post("/read", auth_middleware_1.verifyToken, notification_controller_1.markNotificationsRead);
router.post("/read/:userId", auth_middleware_1.verifyToken, notification_controller_1.markNotificationsRead);
/* ======================================================
   ✅ MARK SINGLE NOTIFICATION AS READ
====================================================== */
router.post("/read-single/:id", auth_middleware_1.verifyToken, notification_controller_1.markSingleNotificationRead);
exports.default = router;
