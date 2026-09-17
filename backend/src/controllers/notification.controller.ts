import { Response } from "express";
import db from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendPushNotification } from "../utils/notification.utils";

/* ======================================================
   🗂 ENSURE FCM_TOKEN COLUMN EXISTS
====================================================== */
const tables = ['users', 'admins', 'delivery_partners', 'transport_partners'];
tables.forEach(table => {
  db.query(
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255) NULL`,
    (err) => {
      if (err && !String(err.message).includes("Duplicate")) {
        // Fallback for MySQL versions without IF NOT EXISTS on ALTER
        db.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${table}' AND COLUMN_NAME='fcm_token'`,
          (checkErr: any, rows: any[]) => {
            if (!checkErr && (!rows || rows.length === 0)) {
              db.query(`ALTER TABLE ${table} ADD COLUMN fcm_token VARCHAR(255) NULL`, (addErr) => {
                if (!addErr) console.log(`✅ Added 'fcm_token' column to ${table} table`);
              });
            }
          }
        );
      }
    }
  );
});

/* ======================================================
   🔔 GET UNREAD NOTIFICATIONS COUNT
   GET /api/notifications/unread-count
====================================================== */
export const getUnreadCount = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(200).json({ count: 0 });

  const sql = "SELECT COUNT(*) as count FROM notifications WHERE `user id` = ? AND `is read` = 0";
  db.query(sql, [userId], (err, results: any[]) => {
    if (err) {
      console.error("❌ Database query failure fetching unread count:", err);
      return res.status(200).json({ count: 0 });
    }
    const count = results?.[0]?.count || 0;
    return res.status(200).json({ success: true, count });
  });
};

/* ======================================================
   🔔 GET USER NOTIFICATIONS
   GET /api/notifications or GET /api/notifications/:userId
====================================================== */
export const getUserNotifications = (req: AuthRequest, res: Response) => {
  let userId: number | undefined;

  // 1. Extract dynamic user ID from request parameters or JWT auth session payload
  if (req.params.userId) {
    userId = Number(req.params.userId);
  } else if (req.user) {
    userId = Number(req.user.id);
  }

  // Safe fallback validation for missing or invalid user ID parameters
  if (userId === undefined || isNaN(userId)) {
    return res.status(200).json([]);
  }

  // 2. Execute parameterized query matching the target user explicitly (no hardcoded ID gatekeepers)
  const sql = "SELECT `id`, `user id` AS userId, `message`, `is read` AS isRead, `created_at` AS createdAt FROM notifications WHERE `user id` = ? ORDER BY `created_at` DESC";

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Database query failure fetching user notifications:", err);
      // 3. Fall back to safe empty array so map/list rendering doesn't crash
      return res.status(200).json([]);
    }

    const standardizedOutput = Array.isArray(results) ? results : [];
    return res.status(200).json(standardizedOutput);
  });
};

/* ======================================================
   ✅ MARK ALL USER NOTIFICATIONS AS READ
   POST /api/notifications/read or POST /api/notifications/read/:userId
====================================================== */
export const markNotificationsRead = (req: AuthRequest, res: Response) => {
  let userId: number | undefined;

  if (req.params.userId) {
    userId = Number(req.params.userId);
  } else if (req.user) {
    userId = Number(req.user.id);
  }

  if (userId === undefined || isNaN(userId)) {
    return res.status(400).json({ success: false, message: "Invalid userId parameter provided." });
  }

  const sql = "UPDATE notifications SET `is read` = 1 WHERE `user id` = ?";

  db.query(sql, [userId], (err) => {
    if (err) {
      console.error("❌ Database update failure marking user notifications as read:", err);
      return res.status(500).json({ success: false, message: "Failed to update notification states in database." });
    }
    return res.status(200).json({ success: true });
  });
};

/* ======================================================
   ✅ MARK SINGLE NOTIFICATION AS READ
   POST /api/notifications/read-single/:id
====================================================== */
export const markSingleNotificationRead = (req: AuthRequest, res: Response) => {
  const notifId = Number(req.params.id);

  if (notifId === undefined || isNaN(notifId)) {
    return res.status(400).json({ success: false, message: "Invalid notification ID parameter provided." });
  }

  const sql = "UPDATE notifications SET `is read` = 1 WHERE id = ?";

  db.query(sql, [notifId], (err) => {
    if (err) {
      console.error("❌ Database update failure marking single notification as read:", err);
      return res.status(500).json({ success: false, message: "Failed to update notification state in database." });
    }
    return res.status(200).json({ success: true });
  });
};

/* ======================================================
   ✅ REGISTER FCM TOKEN
   POST /api/notifications/register-token
====================================================== */
export const registerToken = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const userRole = (req.user?.role || "CUSTOMER").toUpperCase();
  const { token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ success: false, message: "Missing userId or FCM token" });
  }

  let table = "users";
  if (userRole === "ADMIN") table = "admins";
  else if (userRole === "DELIVERY") table = "delivery_partners";
  else if (userRole === "TRANSPORT") table = "transport_partners";

  const sql = `UPDATE ${table} SET fcm_token = ? WHERE id = ?`;
  db.query(sql, [token, userId], (err) => {
    if (err) {
      console.error(`❌ Database update failure saving FCM token for ${table}:`, err);
      return res.status(500).json({ success: false, message: "Failed to save FCM token." });
    }
    return res.status(200).json({ success: true, message: "FCM token registered successfully." });
  });
};

/* ======================================================
   ✅ UNREGISTER FCM TOKEN
   DELETE /api/notifications/unregister-token
====================================================== */
export const unregisterToken = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const userRole = (req.user?.role || "CUSTOMER").toUpperCase();

  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing userId" });
  }

  let table = "users";
  if (userRole === "ADMIN") table = "admins";
  else if (userRole === "DELIVERY") table = "delivery_partners";
  else if (userRole === "TRANSPORT") table = "transport_partners";

  const sql = `UPDATE ${table} SET fcm_token = NULL WHERE id = ?`;
  db.query(sql, [userId], (err) => {
    if (err) {
      console.error(`❌ Database update failure removing FCM token for ${table}:`, err);
      return res.status(500).json({ success: false, message: "Failed to remove FCM token." });
    }
    return res.status(200).json({ success: true, message: "FCM token unregistered successfully." });
  });
};

/* ======================================================
   ✅ SEND CUSTOM PUSH NOTIFICATION (ADMIN ONLY)
   POST /api/notifications/send-custom
====================================================== */
export const sendCustomPush = (req: AuthRequest, res: Response) => {
  const userRole = (req.user?.role || "").toUpperCase();
  if (userRole !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
  }

  const { title, body, data, targetRole = "CUSTOMER", targetUserId } = req.body;
  
  if (!title || !body) {
    return res.status(400).json({ success: false, message: "Missing title or body" });
  }

  let table = "users";
  if (targetRole === "ADMIN") table = "admins";
  else if (targetRole === "DELIVERY") table = "delivery_partners";
  else if (targetRole === "TRANSPORT") table = "transport_partners";

  let sql = `SELECT fcm_token FROM ${table} WHERE fcm_token IS NOT NULL`;
  const params: any[] = [];
  
  if (targetUserId) {
    sql += " AND id = ?";
    params.push(targetUserId);
  }

  db.query(sql, params, (err, rows: any[]) => {
    if (err) {
      console.error(`❌ DB error fetching FCM tokens from ${table}:`, err);
      return res.status(500).json({ success: false, message: "Failed to fetch tokens" });
    }

    const tokens = rows.map(r => r.fcm_token).filter(Boolean);
    if (tokens.length === 0) {
      return res.status(404).json({ success: false, message: "No registered devices found for target." });
    }

    sendPushNotification(tokens, title, body, data);
    
    return res.status(200).json({ 
      success: true, 
      message: `Push notification queued for ${tokens.length} devices.` 
    });
  });
};
