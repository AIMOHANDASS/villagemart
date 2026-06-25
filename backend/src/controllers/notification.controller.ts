import { Response } from "express";
import db from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

/* ======================================================
   🔔 GET USER NOTIFICATIONS
====================================================== */
export const getUserNotifications = (req: AuthRequest, res: Response) => {
  let userId: number | undefined;

  if (req.params.userId) {
    userId = Number(req.params.userId);
  } else if (req.user) {
    userId = Number(req.user.id);
  }

  if (!userId || isNaN(userId) || String(userId) === '1') {
    return res.status(200).json([]);
  }

  const sql = 'SELECT `id`, `user id` AS userId, `message`, `is read` AS isRead, `created_at` AS createdAt FROM notifications WHERE `user id` = ? ORDER BY `created_at` DESC';

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Local database notification fetch failure:", err);
      return res.status(200).json([]);
    }
    const standardizedOutput = Array.isArray(results) ? results : [];
    return res.status(200).json(standardizedOutput);
  });
};

/* ======================================================
   ✅ MARK ALL USER NOTIFICATIONS AS READ
====================================================== */
export const markNotificationsRead = (req: AuthRequest, res: Response) => {
  let userId: number | undefined;

  if (req.params.userId) {
    userId = Number(req.params.userId);
  } else if (req.user) {
    userId = req.user.id;
  }

  if (!userId) {
    return res.status(400).json({ message: "Invalid userId" });
  }

  const sql = "UPDATE notifications SET `is read` = 1 WHERE `user id` = ?";

  db.query(sql, [userId], (err) => {
    if (err) {
      console.error("❌ Update notifications error:", err);
      return res.status(500).json({ message: "Failed to update notifications" });
    }
    res.json({ success: true });
  });
};

/* ======================================================
   ✅ MARK SINGLE NOTIFICATION AS READ (Backward Compatibility)
====================================================== */
export const markSingleNotificationRead = (req: AuthRequest, res: Response) => {
  const notifId = Number(req.params.id);

  if (!notifId) {
    return res.status(400).json({ message: "Invalid notification ID" });
  }

  const sql = "UPDATE notifications SET `is read` = 1 WHERE id = ?";

  db.query(sql, [notifId], (err) => {
    if (err) {
      console.error("❌ Mark single notification read error:", err);
      return res.status(500).json({ message: "Failed to update notification" });
    }
    res.json({ success: true });
  });
};
