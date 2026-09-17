"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePasswordDirect = exports.updateSettings = exports.changePassword = exports.updateProfile = exports.getProfile = void 0;
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/* =========================
   GET PROFILE
========================= */
const getProfile = (req, res) => {
    const { id } = req.params;
    db_1.default.query(`SELECT id, name, username, email, phone, address,
            latitude, longitude, profile_image,
            \`dark mode\` AS dark_mode, is_private, hide_phone, \`hide address\` AS hide_address
     FROM users WHERE id = ?`, [id], (err, rows) => {
        if (err)
            return res.status(500).json({ message: "DB error" });
        if (rows.length === 0)
            return res.status(404).json({ message: "User not found" });
        const userRecord = rows[0];
        const profilePayload = {
            ...userRecord,
            phone: userRecord.phone ? String(userRecord.phone).trim() : ""
        };
        res.json(profilePayload);
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
      \`dark mode\`=?,
      is_private=?,
      hide_phone=?,
      \`hide address\`=?
     WHERE id=?`, [dark_mode, is_private, hide_phone, hide_address, id], (err) => {
        if (err)
            return res.status(500).json({ message: "DB error" });
        res.json({ message: "Settings updated" });
    });
};
exports.updateSettings = updateSettings;
/* ======================================================
   🔐 DIRECT PASSWORD UPDATE (No OTP required for verified sessions)
====================================================== */
const updatePasswordDirect = async (req, res) => {
    const authenticatedUserId = req.user?.id;
    const userRole = String(req.user?.role || "").toUpperCase();
    const { email, newPassword } = req.body;
    if (!authenticatedUserId) {
        return res.status(401).json({ success: false, message: "Unauthorized: Access Denied." });
    }
    if (!email || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
    }
    const targetTable = (userRole === "TRANSPORT" || userRole === "RIDER" || userRole === "TRANSPORT_PARTNER") ? "transport_partners" :
        (userRole === "DELIVERY" || userRole === "DELIVERY_PARTNER") ? "delivery_partners" : "users";
    try {
        const secureHashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        db_1.default.query(`UPDATE ${targetTable} SET password = ? WHERE id = ? AND email = ?`, [secureHashedPassword, authenticatedUserId, email.trim().toLowerCase()], (updateErr, result) => {
            if (updateErr) {
                console.error("❌ Direct password update DB error:", updateErr.message);
                return res.status(500).json({ success: false, message: "Database query execution error." });
            }
            if (result && result.affectedRows === 0) {
                return res.status(400).json({ success: false, message: "Email does not match your authenticated profile." });
            }
            return res.status(200).json({
                success: true,
                message: "Password has been updated successfully.",
            });
        });
    }
    catch (error) {
        console.error("❌ Direct password update catch error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to update password." });
    }
};
exports.updatePasswordDirect = updatePasswordDirect;
