"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUsername = exports.loginUser = exports.signupUser = void 0;
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_middleware_1 = require("../middleware/auth.middleware");
/* =========================
   SIGNUP
   POST /api/user/signup
========================= */
const signupUser = async (req, res) => {
    const { name, username, email, phone, address, password, latitude, longitude, } = req.body;
    /* ✅ 1. ENFORCE VALIDATION GUARDS */
    if (!name || !username || !email || !phone || !password) {
        return res.status(400).json({
            success: false,
            message: "Missing required signup registration fields",
        });
    }
    try {
        /* ✅ 2. CHECK DUPLICATE USERNAME OR EMAIL */
        const checkSql = "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1";
        db_1.default.query(checkSql, [username, email], async (checkErr, rows) => {
            if (checkErr) {
                console.error("❌ Duplicate check DB error:", checkErr);
                return res.status(500).json({
                    success: false,
                    message: "Database error during duplicate check",
                });
            }
            if (rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Username or Email already exists",
                });
            }
            /* ✅ 3. HASH PASSWORD CLEANLY (bcrypt) */
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            /* ✅ 4. WRITE SECURELY TO LOCAL MYSQL USER SCHEMA PROFILE 🎯
               Explicitly map all columns including space-literal names and provide safe defaults
               for role, dark mode, is_private, hide_phone, hide address */
            const insertSql = `
        INSERT INTO users
        (name, username, email, phone, password, address, latitude, longitude, role, \`dark mode\`, is_private, hide_phone, \`hide address\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CUSTOMER', 0, 0, 0, 0)
      `;
            db_1.default.query(insertSql, [
                name,
                username,
                email,
                phone,
                hashedPassword,
                address || '',
                latitude || null,
                longitude || null,
            ], (err, result) => {
                if (err) {
                    console.error("❌ Critical MySQL signup write crash:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Database failure creating user account",
                        error: err.sqlMessage || err.message,
                    });
                }
                const newUserId = result.insertId;
                /* ✅ 5. IMMEDIATELY SIGN A FRESH VALID JWT BEARER TOKEN */
                const token = (0, auth_middleware_1.generateToken)({ id: newUserId, username, role: "CUSTOMER" });
                console.log(`🚀 User successfully registered in local DB! Assigned ID: ${newUserId}`);
                /* ✅ 6. SEND BACK COMPLETE USER RESPONSE OBJECT MATCHING FRONTEND EXPECTATIONS */
                return res.status(201).json({
                    success: true,
                    message: "Signup successful",
                    token,
                    role: "CUSTOMER",
                    user_id: newUserId,
                    user: {
                        id: newUserId,
                        name,
                        username,
                        email,
                        phone,
                        address: address || '',
                        latitude: latitude || null,
                        longitude: longitude || null,
                        role: "CUSTOMER",
                    },
                });
            });
        });
    }
    catch (error) {
        console.error("❌ High-level auth registration handler crash:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during registration sequence",
        });
    }
};
exports.signupUser = signupUser;
/* =========================
   LOGIN
   POST /api/users/login
========================= */
const loginUser = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required",
        });
    }
    const sql = `
    SELECT id, name, username, email, phone, address, latitude, longitude, password, role
    FROM users
    WHERE username = ?
    LIMIT 1
  `;
    db_1.default.query(sql, [username], async (err, rows) => {
        if (err) {
            console.error("Login DB error:", err);
            return res.status(500).json({ message: "Database error" });
        }
        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password",
            });
        }
        const user = rows[0];
        /* ✅ VERIFY PASSWORD */
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid username or password",
            });
        }
        delete user.password;
        const role = (user.role || "CUSTOMER").toUpperCase();
        return res.json({
            success: true,
            message: "Login successful",
            token: (0, auth_middleware_1.generateToken)({ id: user.id, username: user.username, role }),
            role,
            user_id: user.id,
            user: {
                ...user,
                role
            },
        });
    });
};
exports.loginUser = loginUser;
/* =========================
   CHECK USERNAME AVAILABILITY
   GET /api/users/check-username/:username
========================= */
const checkUsername = (req, res) => {
    const { username } = req.params;
    if (!username) {
        return res.status(400).json({ available: false });
    }
    const sql = "SELECT id FROM users WHERE username = ? LIMIT 1";
    db_1.default.query(sql, [username], (err, rows) => {
        if (err) {
            console.error("Username check error:", err);
            return res.status(500).json({ available: false });
        }
        return res.json({
            available: rows.length === 0,
        });
    });
};
exports.checkUsername = checkUsername;
