"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRead = exports.getUserNotifications = void 0;
const db_1 = __importDefault(require("../db"));
const getUserNotifications = (req, res) => {
    const { userId } = req.params;
    db_1.default.query("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC", [userId], (err, rows) => {
        if (err)
            return res.status(500).json([]);
        res.json(rows);
    });
};
exports.getUserNotifications = getUserNotifications;
const markRead = (req, res) => {
    db_1.default.query("UPDATE notifications SET is_read=true WHERE id=?", [req.params.id], () => res.json({ success: true }));
};
exports.markRead = markRead;
