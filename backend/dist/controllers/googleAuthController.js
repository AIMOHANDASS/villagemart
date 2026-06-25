"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuth = void 0;
const google_auth_library_1 = require("google-auth-library");
const db_1 = __importDefault(require("../db"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
/* =========================
   GOOGLE LOGIN / SIGNUP
   POST /api/auth/google
========================= */
const googleAuth = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: "Token required" });
    }
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ message: "Invalid Google token" });
        }
        const { email, name, sub: googleId } = payload;
        if (!email) {
            return res.status(400).json({ message: "Email not found" });
        }
        /* 🔍 CHECK USER */
        db_1.default.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email], (err, rows) => {
            if (err) {
                return res.status(500).json({ message: "Database error" });
            }
            // ✅ USER EXISTS → LOGIN
            if (rows.length > 0) {
                const user = rows[0];
                delete user.password;
                const role = (user.role || "CUSTOMER").toUpperCase();
                const token = (0, auth_middleware_1.generateToken)({
                    id: user.id,
                    username: user.username,
                    role,
                });
                return res.json({
                    success: true,
                    message: "Google Login successful",
                    token,
                    role,
                    user_id: user.id,
                    user: {
                        ...user,
                        role
                    }
                });
            }
            // ✅ NEW USER → SIGNUP
            const username = email.split("@")[0] + "_" + Math.floor(Math.random() * 1000);
            db_1.default.query(`INSERT INTO users (name, username, email, phone, password, role)
           VALUES (?, ?, ?, ?, ?, ?)`, [name || "Google User", username, email, "0000000000", "GOOGLE_AUTH", "CUSTOMER"], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Signup failed" });
                }
                const token = (0, auth_middleware_1.generateToken)({
                    id: result.insertId,
                    username,
                    role: "CUSTOMER",
                });
                return res.json({
                    success: true,
                    message: "Google Signup successful",
                    token,
                    role: "CUSTOMER",
                    user_id: result.insertId,
                    user: {
                        id: result.insertId,
                        name,
                        username,
                        email,
                        phone: "0000000000",
                        role: "CUSTOMER"
                    },
                });
            });
        });
    }
    catch (error) {
        console.error("Google auth error:", error);
        return res.status(500).json({ message: "Google authentication failed" });
    }
};
exports.googleAuth = googleAuth;
