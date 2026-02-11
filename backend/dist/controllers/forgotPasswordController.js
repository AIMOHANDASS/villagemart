"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.verifyResetOtp = exports.sendResetOtp = void 0;
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mailer_1 = require("../utils/mailer");
/* =========================
   SEND RESET OTP
   POST /api/auth/forgot-password
========================= */
const sendResetOtp = (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const sql = "UPDATE users SET reset_otp = ?, reset_otp_expiry = ? WHERE email = ?";
    db_1.default.query(sql, [otp, expiry, email], async (err, result) => {
        if (err) {
            console.error("Forgot password error:", err);
            return res.status(500).json({ message: "Database error" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Email not found" });
        }
        await (0, mailer_1.sendEmailOtpMail)(email, otp);
        return res.json({ message: "Password reset OTP sent to email" });
    });
};
exports.sendResetOtp = sendResetOtp;
/* =========================
   VERIFY RESET OTP
   POST /api/auth/verify-reset-otp
========================= */
const verifyResetOtp = (req, res) => {
    const { email, otp } = req.body;
    const sql = `
    SELECT id FROM users
    WHERE email = ?
    AND reset_otp = ?
    AND reset_otp_expiry > NOW()
  `;
    db_1.default.query(sql, [email, otp], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        if (rows.length === 0) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        return res.json({ message: "OTP verified" });
    });
};
exports.verifyResetOtp = verifyResetOtp;
/* =========================
   RESET PASSWORD
   POST /api/auth/reset-password
========================= */
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!newPassword) {
        return res.status(400).json({ message: "New password required" });
    }
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
    const sql = `
    UPDATE users
    SET password = ?, reset_otp = NULL, reset_otp_expiry = NULL
    WHERE email = ?
    AND reset_otp = ?
    AND reset_otp_expiry > NOW()
  `;
    db_1.default.query(sql, [hashedPassword, email, otp], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "OTP expired or invalid" });
        }
        return res.json({ message: "Password reset successful" });
    });
};
exports.resetPassword = resetPassword;
