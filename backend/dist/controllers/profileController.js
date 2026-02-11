"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.changePassword = exports.updateProfile = exports.getProfile = void 0;
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/* =========================
   GET PROFILE
========================= */
const getProfile = (req, res) => {
    const { id } = req.params;
    db_1.default.query(`SELECT id, name, username, email, phone, address,
            latitude, longitude, profile_image
     FROM users WHERE id = ?`, [id], (err, rows) => {
        if (err)
            return res.status(500).json({ message: "DB error" });
        if (rows.length === 0)
            return res.status(404).json({ message: "User not found" });
        res.json(rows[0]);
    });
};
exports.getProfile = getProfile;
/* =========================
   UPDATE PROFILE
========================= */
const updateProfile = (req, res) => {
    const { id } = req.params;
    const { name, username, phone, address, latitude, longitude, profile_image } = req.body;
    db_1.default.query(`UPDATE users
     SET name=?, username=?, phone=?, address=?,
         latitude=?, longitude=?, profile_image=?
     WHERE id=?`, [
        name,
        username,
        phone,
        address,
        latitude,
        longitude,
        profile_image,
        id,
    ], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Update failed" });
        }
        res.json({ message: "Profile updated successfully" });
    });
};
exports.updateProfile = updateProfile;
/* =========================
   CHANGE PASSWORD
========================= */
const changePassword = async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    db_1.default.query("SELECT password FROM users WHERE id=?", [userId], async (err, rows) => {
        if (err)
            return res.status(500).json({ message: "DB error" });
        if (rows.length === 0)
            return res.status(404).json({ message: "User not found" });
        const stored = rows[0].password;
        if (stored !== "GOOGLE_AUTH") {
            const ok = await bcryptjs_1.default.compare(currentPassword, stored);
            if (!ok)
                return res
                    .status(401)
                    .json({ message: "Current password incorrect" });
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        db_1.default.query("UPDATE users SET password=? WHERE id=?", [hashed, userId], () => res.json({ message: "Password updated successfully" }));
    });
};
exports.changePassword = changePassword;
/* =========================
   UPDATE SETTINGS
========================= */
const updateSettings = (req, res) => {
    const { id } = req.params;
    const { dark_mode, is_private, hide_phone, hide_address } = req.body;
    db_1.default.query(`UPDATE users SET
      dark_mode=?,
      is_private=?,
      hide_phone=?,
      hide_address=?
     WHERE id=?`, [dark_mode, is_private, hide_phone, hide_address, id], (err) => {
        if (err)
            return res.status(500).json({ message: "DB error" });
        res.json({ message: "Settings updated" });
    });
};
exports.updateSettings = updateSettings;
