"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
/* ======================================================
   🔔 GET USER NOTIFICATIONS
====================================================== */
router.get("/:userId", (req, res) => {
    const userId = Number(req.params.userId);
    if (!userId) {
        return res.status(400).json({ message: "Invalid userId" });
    }
    const sql = `
    SELECT 
      id,
      user_id,
      message,
      is_read,
      created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY id DESC
  `;
    db_1.default.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error("❌ Fetch notifications error:", err);
            return res.status(500).json({ message: "Failed to load notifications" });
        }
        res.json(rows || []);
    });
});
/* ======================================================
   ✅ MARK USER NOTIFICATIONS AS READ
====================================================== */
router.post("/read/:userId", (req, res) => {
    const userId = Number(req.params.userId);
    if (!userId) {
        return res.status(400).json({ message: "Invalid userId" });
    }
    const sql = `
    UPDATE notifications 
    SET is_read = 1 
    WHERE user_id = ?
  `;
    db_1.default.query(sql, [userId], (err) => {
        if (err) {
            console.error("❌ Update notifications error:", err);
            return res.status(500).json({ message: "Failed to update notifications" });
        }
        res.json({ success: true });
    });
});
exports.default = router;
