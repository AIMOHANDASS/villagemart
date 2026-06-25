"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markSingleNotificationRead = exports.markNotificationsRead = exports.getUserNotifications = void 0;
const db_1 = __importDefault(require("../db"));
/* ======================================================
   🔔 GET USER NOTIFICATIONS
====================================================== */
const getUserNotifications = (req, res) => {
    let userId;
    if (req.params.userId) {
        userId = Number(req.params.userId);
    }
    else if (req.user) {
        userId = Number(req.user.id);
    }
    if (!userId || isNaN(userId) || String(userId) === '1') {
        return res.status(200).json([]);
    }
    const sql = 'SELECT `id`, `user id` AS userId, `message`, `is read` AS isRead, `created_at` AS createdAt FROM notifications WHERE `user id` = ? ORDER BY `created_at` DESC';
    db_1.default.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("❌ Local database notification fetch failure:", err);
            return res.status(200).json([]);
        }
        const standardizedOutput = Array.isArray(results) ? results : [];
        return res.status(200).json(standardizedOutput);
    });
};
exports.getUserNotifications = getUserNotifications;
/* ======================================================
   ✅ MARK ALL USER NOTIFICATIONS AS READ
====================================================== */
const markNotificationsRead = (req, res) => {
    let userId;
    if (req.params.userId) {
        userId = Number(req.params.userId);
    }
    else if (req.user) {
        userId = req.user.id;
    }
    if (!userId) {
        return res.status(400).json({ message: "Invalid userId" });
    }
    const sql = "UPDATE notifications SET `is read` = 1 WHERE `user id` = ?";
    db_1.default.query(sql, [userId], (err) => {
        if (err) {
            console.error("❌ Update notifications error:", err);
            return res.status(500).json({ message: "Failed to update notifications" });
        }
        res.json({ success: true });
    });
};
exports.markNotificationsRead = markNotificationsRead;
/* ======================================================
   ✅ MARK SINGLE NOTIFICATION AS READ (Backward Compatibility)
====================================================== */
const markSingleNotificationRead = (req, res) => {
    const notifId = Number(req.params.id);
    if (!notifId) {
        return res.status(400).json({ message: "Invalid notification ID" });
    }
    const sql = "UPDATE notifications SET `is read` = 1 WHERE id = ?";
    db_1.default.query(sql, [notifId], (err) => {
        if (err) {
            console.error("❌ Mark single notification read error:", err);
            return res.status(500).json({ message: "Failed to update notification" });
        }
        res.json({ success: true });
    });
};
exports.markSingleNotificationRead = markSingleNotificationRead;
