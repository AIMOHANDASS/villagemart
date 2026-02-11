"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUsername = exports.loginUser = exports.signupUser = void 0;
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/* =========================
   SIGNUP
   POST /api/users/signup
========================= */
const signupUser = async (req, res) => {
    const { name, username, email, phone, address, password, latitude, longitude, } = req.body;
    /* ✅ BASIC VALIDATION */
    if (!name || !username || !email || !phone || !password) {
        return res.status(400).json({
            message: "Name, username, email, phone and password are required",
        });
    }
    try {
        /* ✅ CHECK DUPLICATE USERNAME OR EMAIL */
        const checkSql = "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1";
        db_1.default.query(checkSql, [username, email], async (checkErr, rows) => {
            if (checkErr) {
                console.error("Duplicate check error:", checkErr);
                return res.status(500).json({
                    message: "Database error",
                });
            }
            if (rows.length > 0) {
                return res.status(409).json({
                    message: "Username or Email already exists",
                });
            }
            /* ✅ HASH PASSWORD */
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            /* ✅ INSERT USER */
            const insertSql = `
        INSERT INTO users
        (name, username, email, phone, password, address, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
            db_1.default.query(insertSql, [
                name,
                username,
                email,
                phone,
                hashedPassword,
                address || null,
                latitude || null,
                longitude || null,
            ], (err, result) => {
                if (err) {
                    console.error("Signup DB error:", err);
                    return res.status(500).json({
                        message: err.sqlMessage || "Database error",
                    });
                }
                return res.status(201).json({
                    message: "Signup successful",
                    user: {
                        id: result.insertId,
                        name,
                        username,
                        email,
                        phone,
                        address,
                        latitude,
                        longitude,
                    },
                });
            });
        });
    }
    catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({ message: "Server error" });
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
    SELECT id, name, username, email, phone, address, latitude, longitude, password
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
        return res.json({
            message: "Login successful",
            user,
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
