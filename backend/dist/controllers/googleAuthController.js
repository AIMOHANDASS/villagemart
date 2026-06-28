"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuth = void 0;
const google_auth_library_1 = require("google-auth-library");
const db_1 = __importDefault(require("../db"));
const auth_middleware_1 = require("../middleware/auth.middleware");
// Dynamically initialized using the strict string (trimmed to prevent trailing space bugs)
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID?.trim());
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
        const targetAudience = process.env.GOOGLE_CLIENT_ID?.trim();
        // 1. SECURE JWT VERIFICATION LOGIC
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: targetAudience,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ message: "Invalid Google token payload" });
        }
        const { email, name, sub: googleId } = payload;
        if (!email) {
            return res.status(400).json({ message: "Email not found in Google payload" });
        }
        /* 3. AUTOMATED USER REGISTRATION & DATABASE UPSERT CHECK */
        db_1.default.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email], (err, rows) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ message: "Database verification error" });
            }
            // ✅ USER EXISTS → UPDATE & LOGIN
            if (rows.length > 0) {
                const user = rows[0];
                // Perform lightweight update for latest name (safely ignoring google_id to avoid schema crashes)
                db_1.default.query("UPDATE users SET name = ? WHERE id = ?", [name || user.name, user.id]);
                delete user.password;
                const role = (user.role || "CUSTOMER").toUpperCase();
                const authToken = (0, auth_middleware_1.generateToken)({
                    id: user.id,
                    username: user.username,
                    role,
                });
                return res.json({
                    success: true,
                    message: "Google Login successful",
                    token: authToken,
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
            // We specifically avoid injecting 'google_id' into the raw insert to prevent missing column crashes,
            // relying on the password field to track the provider type safely.
            db_1.default.query(`INSERT INTO users (name, username, email, phone, password, role)
           VALUES (?, ?, ?, ?, ?, ?)`, [name || "Google User", username, email, "0000000000", "GOOGLE_AUTH", "CUSTOMER"], (err, result) => {
                if (err) {
                    console.error("Database insert error:", err);
                    return res.status(500).json({ message: "Signup database insertion failed" });
                }
                const authToken = (0, auth_middleware_1.generateToken)({
                    id: result.insertId,
                    username,
                    role: "CUSTOMER",
                });
                return res.json({
                    success: true,
                    message: "Google Signup successful",
                    token: authToken,
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
        console.error("Google authentication handshake error:", error);
        return res.status(500).json({ message: "Google authentication token verification failed" });
    }
};
exports.googleAuth = googleAuth;
