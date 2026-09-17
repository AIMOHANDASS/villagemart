"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeProfileFields = exports.updateProfile = exports.passwordLogin = exports.phoneLogin = exports.googleLogin = exports.phoneAuth = exports.getMe = exports.registerPartner = exports.login = void 0;
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_middleware_1 = require("../middleware/auth.middleware");
/* ======================================================
   🗂 ENSURE ROLE COLUMN EXISTS ON USERS TABLE
   (safe ALTER — won't break if column already exists)
====================================================== */
db_1.default.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'`, (err) => {
    if (err && !String(err.message).includes("Duplicate")) {
        // Fallback for MySQL versions without IF NOT EXISTS on ALTER
        db_1.default.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='role'`, (checkErr, rows) => {
            if (!checkErr && (!rows || rows.length === 0)) {
                db_1.default.query(`ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'`, (addErr) => {
                    if (addErr)
                        console.error("❌ Could not add role column:", addErr);
                    else
                        console.log("✅ Added 'role' column to users table");
                });
            }
        });
    }
});
/* ======================================================
   🔐 UNIFIED LOGIN (Role-based)
   POST /api/auth/login
   Body: { username, password, loginType }
====================================================== */
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const login = async (req, res) => {
    const { usernameOrEmail, password, loginType } = req.body;
    try {
        if (!usernameOrEmail || !password) {
            return res.status(400).json({ success: false, message: "Missing required login fields" });
        }
        let sql = "";
        let defaultRole = "CUSTOMER";
        switch (loginType) {
            case "admin":
                sql = "SELECT *, 'ADMIN' AS role FROM admins WHERE username = ? OR email = ?";
                defaultRole = "ADMIN";
                break;
            case "partner_transport":
                sql = "SELECT * FROM transport_partners WHERE phone = ? OR email = ?";
                defaultRole = "TRANSPORT";
                break;
            case "partner_delivery":
                sql = "SELECT * FROM delivery_partners WHERE phone = ? OR email = ?";
                defaultRole = "DELIVERY";
                break;
            default:
                sql = "SELECT * FROM users WHERE username = ? OR email = ?";
                defaultRole = "CUSTOMER";
        }
        db_1.default.query(sql, [usernameOrEmail, usernameOrEmail], async (err, results) => {
            if (err || !results.length) {
                return res.status(401).json({ success: false, message: "Invalid account credentials" });
            }
            const activeProfile = results[0];
            // 🎯 CRITICAL REJECTION GATEWAY: Blocks logins if blocked by the system
            if (activeProfile.account_status === 'BLOCKED') {
                return res.status(403).json({
                    success: false,
                    message: "Access Denied: Your account is blocked due to an overdue commission payment balance. Please contact VillageSmart Admin."
                });
            }
            // Match bcrypt password string hashes securely
            const isValidPassword = await bcryptjs_1.default.compare(password, activeProfile.password);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: "Invalid password credentials" });
            }
            // Extract the precise role value string from the row row 🎯
            const assignedRole = String(activeProfile.role || defaultRole).toUpperCase();
            // Establish a permanent shared fallback signature key string variable 🎯
            const REUSABLE_DEV_SECRET = process.env.JWT_SECRET || "VILLAGEMART_SUPER_SECURE_PERMANENT_LOCAL_SECRET_KEY_2026";
            const token = jsonwebtoken_1.default.sign({ id: activeProfile.id, role: assignedRole }, REUSABLE_DEV_SECRET, { expiresIn: "30d" });
            return res.status(200).json({
                success: true,
                token,
                user: {
                    id: activeProfile.id,
                    name: activeProfile.name,
                    username: activeProfile.username || activeProfile.phone,
                    email: activeProfile.email || "",
                    phone: activeProfile.phone ? String(activeProfile.phone).trim() : "",
                    address: activeProfile.address || "",
                    role: assignedRole
                }
            });
        });
    }
    catch (error) {
        console.error("❌ High-level authentication endpoint crash:", error);
        return res.status(500).json({ success: false, message: "Internal server authentication failure" });
    }
};
exports.login = login;
/* ======================================================
   🔐 REGISTER PARTNER (Admin creates delivery/transport users)
   POST /api/auth/register-partner
   Body: { name, username, email, phone, password, role }
   
   ✅ FIXED: Now inserts into the correct role-specific table
   (delivery_partners / transport_partners) instead of always
   using the users table.
====================================================== */
const registerPartner = async (req, res) => {
    const { name, username, email, phone, password, role } = req.body;
    const validRoles = ["DELIVERY", "TRANSPORT", "ADMIN"];
    const upperRole = (role || "").toUpperCase();
    if (!name || !email || !phone || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, email, phone, and password are required",
        });
    }
    if (!validRoles.includes(upperRole)) {
        return res.status(400).json({
            success: false,
            message: "Invalid role. Must be DELIVERY, TRANSPORT or ADMIN",
        });
    }
    try {
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Route to the correct table based on role
        if (upperRole === "DELIVERY") {
            // Check if email already exists in delivery_partners
            db_1.default.query("SELECT id FROM delivery_partners WHERE email = ? OR phone = ? LIMIT 1", [email, phone], (checkErr, rows) => {
                if (checkErr)
                    return res.status(500).json({ success: false, message: "Database error" });
                if (rows.length > 0)
                    return res.status(409).json({ success: false, message: "Email or phone already exists" });
                const sql = `
          INSERT INTO delivery_partners (name, phone, email, password, status)
          VALUES (?, ?, ?, ?, 'approved')
        `;
                db_1.default.query(sql, [name, phone, email, hashedPassword], (err, result) => {
                    if (err) {
                        console.error("❌ Register delivery partner error:", err);
                        return res.status(500).json({ success: false, message: err.sqlMessage || "Database error" });
                    }
                    return res.status(201).json({
                        success: true,
                        message: "DELIVERY partner registered successfully",
                        data: { id: result.insertId, name, email, phone, role: upperRole },
                    });
                });
            });
        }
        else if (upperRole === "TRANSPORT") {
            // Check if email already exists in transport_partners
            db_1.default.query("SELECT id FROM transport_partners WHERE email = ? OR phone = ? LIMIT 1", [email, phone], (checkErr, rows) => {
                if (checkErr)
                    return res.status(500).json({ success: false, message: "Database error" });
                if (rows.length > 0)
                    return res.status(409).json({ success: false, message: "Email or phone already exists" });
                const sql = `
          INSERT INTO transport_partners (name, phone, email, password, status)
          VALUES (?, ?, ?, ?, 'approved')
        `;
                db_1.default.query(sql, [name, phone, email, hashedPassword], (err, result) => {
                    if (err) {
                        console.error("❌ Register transport partner error:", err);
                        return res.status(500).json({ success: false, message: err.sqlMessage || "Database error" });
                    }
                    return res.status(201).json({
                        success: true,
                        message: "TRANSPORT partner registered successfully",
                        data: { id: result.insertId, name, email, phone, role: upperRole },
                    });
                });
            });
        }
        else if (upperRole === "ADMIN") {
            // Admin goes into admins table
            db_1.default.query("SELECT id FROM admins WHERE email = ? OR username = ? LIMIT 1", [email, username || email], (checkErr, rows) => {
                if (checkErr)
                    return res.status(500).json({ success: false, message: "Database error" });
                if (rows.length > 0)
                    return res.status(409).json({ success: false, message: "Admin already exists" });
                const sql = `INSERT INTO admins (name, username, email, password) VALUES (?, ?, ?, ?)`;
                db_1.default.query(sql, [name, username || email, email, hashedPassword], (err, result) => {
                    if (err) {
                        console.error("❌ Register admin error:", err);
                        return res.status(500).json({ success: false, message: err.sqlMessage || "Database error" });
                    }
                    return res.status(201).json({
                        success: true,
                        message: "ADMIN registered successfully",
                        data: { id: result.insertId, name, username: username || email, email, role: upperRole },
                    });
                });
            });
        }
    }
    catch (error) {
        console.error("❌ Register partner error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.registerPartner = registerPartner;
/* ======================================================
   👤 GET CURRENT USER (from JWT)
   GET /api/auth/me
   
   ✅ FIXED: Multi-table lookup based on JWT role.
   Queries the correct table (users, admins, delivery_partners,
   transport_partners) instead of always querying users.
====================================================== */
const getMe = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    const userRole = String(req.user.role || "").toUpperCase();
    const userId = req.user.id;
    let sql = "";
    let responseRole = userRole;
    switch (userRole) {
        case "ADMIN":
            sql = `SELECT id, name, username, email FROM admins WHERE id = ? LIMIT 1`;
            break;
        case "DELIVERY":
            sql = `SELECT id, name, phone, email, vehicle_type, vehicle_number, status, profile_image FROM delivery_partners WHERE id = ? LIMIT 1`;
            break;
        case "TRANSPORT":
            sql = `SELECT id, name, phone, email, vehicle_type, vehicle_number, status, profile_image FROM transport_partners WHERE id = ? LIMIT 1`;
            break;
        default:
            // CUSTOMER (default)
            sql = `SELECT id, name, username, email, phone, address, latitude, longitude, role, profile_completed FROM users WHERE id = ? LIMIT 1`;
            responseRole = "CUSTOMER";
    }
    db_1.default.query(sql, [userId], (err, rows) => {
        if (err) {
            console.warn("⚠️ getMe database query error, trying fallback query:", err.message);
            const fallbackSql = `SELECT id, name, username, email, phone, address, latitude, longitude, role FROM users WHERE id = ? LIMIT 1`;
            db_1.default.query(fallbackSql, [userId], (fallbackErr, fallbackRows) => {
                if (fallbackErr || !fallbackRows?.length) {
                    return res.status(404).json({ success: false, message: "User not found" });
                }
                const userRecord = fallbackRows[0];
                const profilePayload = {
                    ...userRecord,
                    role: responseRole,
                    phone: userRecord.phone ? String(userRecord.phone).trim() : "",
                    profileCompleted: false
                };
                return res.json({
                    success: true,
                    data: profilePayload
                });
            });
            return;
        }
        if (!rows?.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const userRecord = rows[0];
        const profilePayload = {
            ...userRecord,
            role: responseRole,
            phone: userRecord.phone ? String(userRecord.phone).trim() : "",
            profileCompleted: userRecord.profile_completed === 1
        };
        return res.json({
            success: true,
            data: profilePayload
        });
    });
};
exports.getMe = getMe;
/* ======================================================
   🔐 PHONE OTP AUTH / LOGIN (Firebase Verified Phone Number)
   POST /api/auth/phone
   Body: { phone }
====================================================== */
const phoneAuth = async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    // Normalize phone number to standard 10-digit format
    let cleanPhone = String(phone).trim();
    let tenDigitPhone = cleanPhone.replace(/^\+91|^91|\s+/g, '');
    if (tenDigitPhone.length !== 10 || !/^\d{10}$/.test(tenDigitPhone)) {
        return res.status(400).json({ success: false, message: "Invalid 10-digit phone number" });
    }
    try {
        // Query local DB users by phone number variants
        db_1.default.query("SELECT * FROM users WHERE phone = ? OR phone = ? OR phone LIKE ? LIMIT 1", [cleanPhone, tenDigitPhone, `%${tenDigitPhone}`], async (err, rows) => {
            if (err) {
                console.error("❌ Phone login DB error:", err);
                return res.status(500).json({ success: false, message: "Database verification error" });
            }
            // Case 1: USER EXISTS -> Log them in directly
            if (rows && rows.length > 0) {
                const user = rows[0];
                if (user.account_status === "BLOCKED") {
                    return res.status(403).json({
                        success: false,
                        message: "Access Denied: Your account is blocked due to an overdue commission payment balance. Please contact VillageSmart Admin."
                    });
                }
                delete user.password;
                const role = (user.role || "CUSTOMER").toUpperCase();
                const token = (0, auth_middleware_1.generateToken)({ id: user.id, username: user.username, role });
                return res.json({
                    success: true,
                    message: "Mobile OTP Login successful",
                    token,
                    role,
                    user_id: user.id,
                    user: {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        email: user.email || "",
                        phone: user.phone ? String(user.phone).trim() : "",
                        address: user.address || "",
                        role
                    }
                });
            }
            // Case 2: NEW USER -> Auto-signup
            // 🎯 FIX: Generate unique placeholder email to avoid UNIQUE KEY collision on users.email
            const randomSuffix = Math.floor(Math.random() * 100000);
            const username = `user_${tenDigitPhone}_${randomSuffix}`;
            const placeholderEmail = `phone_${tenDigitPhone}_${randomSuffix}@placeholder.villagemart.local`;
            const defaultName = 'VillageSmart User';
            const insertSql = `
          INSERT INTO users
          (name, username, email, phone, password, address, latitude, longitude, role, \`dark mode\`, is_private, hide_phone, \`hide address\`, pincode)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CUSTOMER', 0, 0, 0, 0, '')
        `;
            db_1.default.query(insertSql, [
                defaultName,
                username,
                placeholderEmail,
                tenDigitPhone,
                "FIREBASE_PHONE_AUTH", // placeholder password
                "", // address
                null,
                null
            ], (insertErr, result) => {
                if (insertErr) {
                    console.error("❌ Phone signup DB insert error [phoneAuth]:");
                    console.error("   SQL Error Code:", insertErr.code);
                    console.error("   SQL Errno:", insertErr.errno);
                    console.error("   SQL Message:", insertErr.sqlMessage);
                    console.error("   Full Error:", insertErr);
                    // 🛡️ Race condition guard: if ER_DUP_ENTRY, the user may have been created
                    // between our SELECT and INSERT — re-fetch and log them in
                    if (insertErr.code === 'ER_DUP_ENTRY') {
                        db_1.default.query("SELECT * FROM users WHERE phone = ? OR phone LIKE ? LIMIT 1", [tenDigitPhone, `%${tenDigitPhone}`], (retryErr, retryRows) => {
                            if (!retryErr && retryRows && retryRows.length > 0) {
                                const existingUser = retryRows[0];
                                delete existingUser.password;
                                const role = (existingUser.role || "CUSTOMER").toUpperCase();
                                const token = (0, auth_middleware_1.generateToken)({ id: existingUser.id, username: existingUser.username, role });
                                return res.json({
                                    success: true,
                                    message: "Mobile OTP Login successful (recovered)",
                                    token, role, user_id: existingUser.id,
                                    user: {
                                        id: existingUser.id, name: existingUser.name,
                                        username: existingUser.username, email: existingUser.email || "",
                                        phone: existingUser.phone ? String(existingUser.phone).trim() : "",
                                        address: existingUser.address || "", role
                                    }
                                });
                            }
                            return res.status(500).json({ success: false, message: "Signup failed: duplicate entry detected but recovery failed" });
                        });
                        return;
                    }
                    return res.status(500).json({
                        success: false,
                        message: "Signup database insertion failed",
                        error: insertErr.sqlMessage || insertErr.message
                    });
                }
                const newUserId = result.insertId;
                const token = (0, auth_middleware_1.generateToken)({ id: newUserId, username, role: "CUSTOMER" });
                return res.status(201).json({
                    success: true,
                    message: "Mobile OTP Registration successful",
                    token,
                    role: "CUSTOMER",
                    user_id: newUserId,
                    user: {
                        id: newUserId,
                        name: defaultName,
                        username,
                        email: "",
                        phone: tenDigitPhone,
                        address: "",
                        role: "CUSTOMER"
                    }
                });
            });
        });
    }
    catch (error) {
        console.error("❌ High-level phone authentication endpoint crash:", error);
        return res.status(500).json({ success: false, message: "Internal server authentication failure" });
    }
};
exports.phoneAuth = phoneAuth;
/* ======================================================
   🔐 GOOGLE LOGIN (Firebase Auth verification bypass exchange)
   POST /api/auth/google-login
   Body: { email, name }
====================================================== */
const googleLogin = async (req, res) => {
    const { email, name } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }
    try {
        // Check if user exists by email
        db_1.default.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email], async (err, rows) => {
            if (err) {
                console.error("❌ Google login query error:", err);
                return res.status(500).json({ success: false, message: "Database verification error" });
            }
            const checkCompletenessAndRespond = (user) => {
                // googleLogin check: phone or pincode missing
                const isPhoneMissing = !user.phone || String(user.phone).trim() === "" || String(user.phone).trim() === "0000000000";
                const isPincodeMissing = !user.pincode || String(user.pincode).trim() === "";
                const isProfileComplete = user.profile_completed === 1 || (!isPhoneMissing && !isPincodeMissing);
                const role = (user.role || "CUSTOMER").toUpperCase();
                const token = (0, auth_middleware_1.generateToken)({ id: user.id, username: user.username, role });
                return res.json({
                    success: true,
                    profileComplete: isProfileComplete,
                    token,
                    role,
                    user_id: user.id,
                    user: {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        email: user.email || "",
                        phone: user.phone ? String(user.phone).trim() : "",
                        address: user.address || "",
                        pincode: user.pincode || "",
                        latitude: user.latitude,
                        longitude: user.longitude,
                        role,
                        profileCompleted: user.profile_completed === 1
                    }
                });
            };
            if (rows && rows.length > 0) {
                return checkCompletenessAndRespond(rows[0]);
            }
            // User doesn't exist, create a new one with default metadata
            // 🎯 FIX: Wider random range to reduce username collision risk
            const username = email.split("@")[0] + "_" + Math.floor(Math.random() * 100000);
            const insertSql = `
        INSERT INTO users
        (name, username, email, phone, password, address, latitude, longitude, role, \`dark mode\`, is_private, hide_phone, \`hide address\`, pincode)
        VALUES (?, ?, ?, '', 'GOOGLE_AUTH', '', null, null, 'CUSTOMER', 0, 0, 0, 0, '')
      `;
            db_1.default.query(insertSql, [name || "Google User", username, email], (insertErr, result) => {
                if (insertErr) {
                    // 🎯 FIX: Full diagnostic error logging instead of swallowing the SQL error
                    console.error("❌ Google login insert error [googleLogin]:");
                    console.error("   SQL Error Code:", insertErr.code);
                    console.error("   SQL Errno:", insertErr.errno);
                    console.error("   SQL Message:", insertErr.sqlMessage);
                    console.error("   Full Error:", insertErr);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to create user record",
                        error: insertErr.sqlMessage || insertErr.message
                    });
                }
                const newUserId = result.insertId;
                db_1.default.query("SELECT * FROM users WHERE id = ? LIMIT 1", [newUserId], (selectErr, newRows) => {
                    if (selectErr || !newRows || newRows.length === 0) {
                        return res.status(500).json({ success: false, message: "Failed to retrieve newly created profile" });
                    }
                    return checkCompletenessAndRespond(newRows[0]);
                });
            });
        });
    }
    catch (error) {
        console.error("❌ Google login controller crash:", error);
        return res.status(500).json({ success: false, message: "Internal server authentication failure" });
    }
};
exports.googleLogin = googleLogin;
/* ======================================================
   🔐 PHONE OTP LOGIN (Firebase Verified Phone Number)
   POST /api/auth/phone-login
   Body: { phone }
====================================================== */
const phoneLogin = async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    // Normalize phone number to standard 10-digit format
    let cleanPhone = String(phone).trim();
    let tenDigitPhone = cleanPhone.replace(/^\+91|^91|\s+/g, '');
    if (tenDigitPhone.length !== 10 || !/^\d{10}$/.test(tenDigitPhone)) {
        return res.status(400).json({ success: false, message: "Invalid 10-digit phone number" });
    }
    try {
        // Check if user exists by phone
        db_1.default.query("SELECT * FROM users WHERE phone = ? OR phone = ? OR phone LIKE ? LIMIT 1", [cleanPhone, tenDigitPhone, `%${tenDigitPhone}`], async (err, rows) => {
            if (err) {
                console.error("❌ Phone login query error:", err);
                return res.status(500).json({ success: false, message: "Database verification error" });
            }
            const checkCompletenessAndRespond = (user) => {
                // phoneLogin check: email or pincode missing
                // 🎯 FIX: Treat placeholder emails as "missing" for profile completeness
                const rawEmail = String(user.email || "").trim();
                const isEmailMissing = !rawEmail || rawEmail.endsWith("@placeholder.villagemart.local");
                const isPincodeMissing = !user.pincode || String(user.pincode).trim() === "";
                const isProfileComplete = user.profile_completed === 1 || (!isEmailMissing && !isPincodeMissing);
                const role = (user.role || "CUSTOMER").toUpperCase();
                const token = (0, auth_middleware_1.generateToken)({ id: user.id, username: user.username, role });
                // Return clean email to frontend (hide placeholder from UI)
                const displayEmail = rawEmail.endsWith("@placeholder.villagemart.local") ? "" : rawEmail;
                return res.json({
                    success: true,
                    profileComplete: isProfileComplete,
                    token,
                    role,
                    user_id: user.id,
                    user: {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        email: displayEmail,
                        phone: user.phone ? String(user.phone).trim() : "",
                        address: user.address || "",
                        pincode: user.pincode || "",
                        latitude: user.latitude,
                        longitude: user.longitude,
                        role,
                        profileCompleted: user.profile_completed === 1
                    }
                });
            };
            if (rows && rows.length > 0) {
                const user = rows[0];
                if (user.account_status === "BLOCKED") {
                    return res.status(403).json({
                        success: false,
                        message: "Access Denied: Your account is blocked due to an overdue commission payment balance."
                    });
                }
                return checkCompletenessAndRespond(user);
            }
            // User doesn't exist, create a new user saving ONLY phone number and defaults
            // 🎯 FIX: Generate unique placeholder email to avoid UNIQUE KEY collision on users.email
            const randomSuffix = Math.floor(Math.random() * 100000);
            const username = `user_${tenDigitPhone}_${randomSuffix}`;
            const placeholderEmail = `phone_${tenDigitPhone}_${randomSuffix}@placeholder.villagemart.local`;
            const defaultName = 'VillageSmart User';
            const insertSql = `
          INSERT INTO users
          (name, username, email, phone, password, address, latitude, longitude, role, \`dark mode\`, is_private, hide_phone, \`hide address\`, pincode)
          VALUES (?, ?, ?, ?, 'FIREBASE_PHONE_AUTH', '', null, null, 'CUSTOMER', 0, 0, 0, 0, '')
        `;
            db_1.default.query(insertSql, [defaultName, username, placeholderEmail, tenDigitPhone], (insertErr, result) => {
                if (insertErr) {
                    // 🎯 FIX: Full diagnostic error logging instead of swallowing the SQL error
                    console.error("❌ Phone signup insert error [phoneLogin]:");
                    console.error("   SQL Error Code:", insertErr.code);
                    console.error("   SQL Errno:", insertErr.errno);
                    console.error("   SQL Message:", insertErr.sqlMessage);
                    console.error("   Full Error:", insertErr);
                    // 🛡️ Race condition guard: if ER_DUP_ENTRY, the user may have been created
                    // between our SELECT and INSERT — re-fetch and log them in
                    if (insertErr.code === 'ER_DUP_ENTRY') {
                        db_1.default.query("SELECT * FROM users WHERE phone = ? OR phone LIKE ? LIMIT 1", [tenDigitPhone, `%${tenDigitPhone}`], (retryErr, retryRows) => {
                            if (!retryErr && retryRows && retryRows.length > 0) {
                                return checkCompletenessAndRespond(retryRows[0]);
                            }
                            return res.status(500).json({ success: false, message: "Signup failed: duplicate entry detected but recovery failed" });
                        });
                        return;
                    }
                    return res.status(500).json({
                        success: false,
                        message: "Failed to create user record",
                        error: insertErr.sqlMessage || insertErr.message
                    });
                }
                const newUserId = result.insertId;
                db_1.default.query("SELECT * FROM users WHERE id = ? LIMIT 1", [newUserId], (selectErr, newRows) => {
                    if (selectErr || !newRows || newRows.length === 0) {
                        return res.status(500).json({ success: false, message: "Failed to retrieve newly created profile" });
                    }
                    return checkCompletenessAndRespond(newRows[0]);
                });
            });
        });
    }
    catch (error) {
        console.error("❌ Phone login controller crash:", error);
        return res.status(500).json({ success: false, message: "Internal server authentication failure" });
    }
};
exports.phoneLogin = phoneLogin;
/* ======================================================
   🔐 PASSWORD LOGIN (Username / Email / Phone + Password)
   POST /api/auth/password-login
   Body: { usernameOrEmail, password }
====================================================== */
const passwordLogin = async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
        return res.status(400).json({ success: false, message: "Missing login parameters" });
    }
    try {
        const sql = "SELECT * FROM users WHERE username = ? OR email = ? OR phone = ? LIMIT 1";
        db_1.default.query(sql, [usernameOrEmail, usernameOrEmail, usernameOrEmail], async (err, results) => {
            if (err || !results || results.length === 0) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            const user = results[0];
            if (user.account_status === "BLOCKED") {
                return res.status(403).json({
                    success: false,
                    message: "Access Denied: Your account is blocked due to an overdue commission payment balance."
                });
            }
            // Verify bcrypt password
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            // Check completeness
            const isEmailMissing = !user.email || String(user.email).trim() === "";
            const isPhoneMissing = !user.phone || String(user.phone).trim() === "" || String(user.phone).trim() === "0000000000";
            const isPincodeMissing = !user.pincode || String(user.pincode).trim() === "";
            const isProfileComplete = !isEmailMissing && !isPhoneMissing && !isPincodeMissing;
            const role = (user.role || "CUSTOMER").toUpperCase();
            const token = (0, auth_middleware_1.generateToken)({ id: user.id, username: user.username, role });
            delete user.password;
            return res.json({
                success: true,
                token,
                profileComplete: isProfileComplete,
                role,
                user_id: user.id,
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email || "",
                    phone: user.phone ? String(user.phone).trim() : "",
                    address: user.address || "",
                    pincode: user.pincode || "",
                    latitude: user.latitude,
                    longitude: user.longitude,
                    role
                }
            });
        });
    }
    catch (error) {
        console.error("❌ Password login controller crash:", error);
        return res.status(500).json({ success: false, message: "Internal server authentication failure" });
    }
};
exports.passwordLogin = passwordLogin;
/* ======================================================
   ✏️ UPDATE PROFILE (PUT /api/auth/update-profile)
   Protected session handler
====================================================== */
const updateProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Access Denied: Unauthenticated session" });
    }
    const { name, email, phone, address, pincode, latitude, longitude } = req.body;
    try {
        db_1.default.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId], (selectErr, rows) => {
            if (selectErr || !rows || rows.length === 0) {
                return res.status(404).json({ success: false, message: "User profile not found" });
            }
            const existingUser = rows[0];
            // Merge values cleanly
            const updatedName = name !== undefined ? name : existingUser.name;
            const updatedEmail = email !== undefined ? email : existingUser.email;
            const updatedPhone = phone !== undefined ? phone : existingUser.phone;
            const updatedAddress = address !== undefined ? address : existingUser.address;
            const updatedPincode = pincode !== undefined ? pincode : existingUser.pincode;
            const updatedLatitude = latitude !== undefined ? latitude : existingUser.latitude;
            const updatedLongitude = longitude !== undefined ? longitude : existingUser.longitude;
            // Check for conflicting unique email/phone in another user record
            const emailToCheck = email !== undefined ? String(email).trim().toLowerCase() : "";
            const isEmailPlaceholder = emailToCheck.endsWith("@placeholder.villagemart.local");
            const existingEmailVal = String(existingUser.email || "").trim().toLowerCase();
            const proceedWithPhoneCheck = () => {
                const phoneToCheck = String(updatedPhone || "").trim();
                const tenDigitPhone = phoneToCheck.replace(/^\+91|^91|\s+/g, '');
                const existingPhoneVal = String(existingUser.phone || "").trim().replace(/^\+91|^91|\s+/g, '');
                // If the number matches the existing user's phone number, skip the duplicate check
                if (phoneToCheck && phoneToCheck !== "0000000000" && tenDigitPhone !== existingPhoneVal && phoneToCheck !== existingUser.phone) {
                    db_1.default.query("SELECT id FROM users WHERE (phone = ? OR phone = ? OR phone LIKE ?) AND id != ? LIMIT 1", [phoneToCheck, tenDigitPhone, `%${tenDigitPhone}`, userId], (phoneCheckErr, phoneRows) => {
                        if (phoneCheckErr) {
                            console.error("❌ Phone conflict query check failed:", phoneCheckErr);
                            return res.status(500).json({ success: false, message: "Conflict verification check failed" });
                        }
                        if (phoneRows && phoneRows.length > 0) {
                            return res.status(400).json({
                                success: false,
                                message: "This phone number is already associated with another account."
                            });
                        }
                        performProfileUpdate();
                    });
                }
                else {
                    performProfileUpdate();
                }
            };
            const performProfileUpdate = () => {
                // Check if profile is complete (meaning name, email, phone, address, pincode are set)
                const isEmailValid = updatedEmail && String(updatedEmail).trim() !== "" && !String(updatedEmail).endsWith("@placeholder.villagemart.local");
                const isPhoneValid = updatedPhone && String(updatedPhone).trim() !== "" && String(updatedPhone).trim() !== "0000000000";
                const isAddressValid = updatedAddress && String(updatedAddress).trim() !== "";
                const isPincodeValid = updatedPincode && String(updatedPincode).trim() !== "";
                const profileCompletedVal = (isEmailValid && isPhoneValid && isAddressValid && isPincodeValid) ? 1 : 0;
                const updateSql = `
          UPDATE users
          SET name = ?, email = ?, phone = ?, address = ?, pincode = ?, latitude = ?, longitude = ?, profile_completed = ?
          WHERE id = ?
        `;
                const fallbackUpdateSql = `
          UPDATE users
          SET name = ?, email = ?, phone = ?, address = ?, pincode = ?, latitude = ?, longitude = ?
          WHERE id = ?
        `;
                const sendResponse = () => {
                    db_1.default.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId], (fetchErr, updatedRows) => {
                        if (fetchErr || !updatedRows || updatedRows.length === 0) {
                            return res.status(500).json({ success: false, message: "Failed to retrieve updated profile" });
                        }
                        const user = updatedRows[0];
                        delete user.password;
                        const role = (user.role || "CUSTOMER").toUpperCase();
                        return res.json({
                            success: true,
                            message: "Profile updated successfully",
                            user: {
                                id: user.id,
                                name: user.name,
                                username: user.username,
                                email: user.email || "",
                                phone: user.phone ? String(user.phone).trim() : "",
                                address: user.address || "",
                                pincode: user.pincode || "",
                                latitude: user.latitude,
                                longitude: user.longitude,
                                role,
                                profileCompleted: user.profile_completed !== undefined ? user.profile_completed === 1 : false
                            }
                        });
                    });
                };
                db_1.default.query(updateSql, [updatedName, updatedEmail, updatedPhone, updatedAddress, updatedPincode, updatedLatitude, updatedLongitude, profileCompletedVal, userId], (updateErr) => {
                    if (updateErr) {
                        console.warn("⚠️ Failed to update with profile_completed, running fallback update query:", updateErr.message);
                        db_1.default.query(fallbackUpdateSql, [updatedName, updatedEmail, updatedPhone, updatedAddress, updatedPincode, updatedLatitude, updatedLongitude, userId], (fallbackErr) => {
                            if (fallbackErr) {
                                console.error("❌ Fallback update profile DB error:", fallbackErr);
                                return res.status(500).json({ success: false, message: "Profile update transaction failed" });
                            }
                            sendResponse();
                        });
                        return;
                    }
                    sendResponse();
                });
            };
            if (emailToCheck && !isEmailPlaceholder && emailToCheck !== existingEmailVal) {
                db_1.default.query("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1", [emailToCheck, userId], (emailCheckErr, emailRows) => {
                    if (emailCheckErr) {
                        console.error("❌ Email conflict query check failed:", emailCheckErr);
                        return res.status(500).json({ success: false, message: "Conflict verification check failed" });
                    }
                    if (emailRows && emailRows.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: "This email address is already in use by another account."
                        });
                    }
                    proceedWithPhoneCheck();
                });
            }
            else {
                proceedWithPhoneCheck();
            }
        });
    }
    catch (error) {
        console.error("❌ Profile update crash:", error);
        return res.status(500).json({ success: false, message: "Internal server profile update failure" });
    }
};
exports.updateProfile = updateProfile;
/* ======================================================
   ✏️ COMPLETE PROFILE FIELDS (PUT /api/auth/complete-profile-fields)
   Protected session handler
====================================================== */
const completeProfileFields = async (req, res) => {
    return (0, exports.updateProfile)(req, res);
};
exports.completeProfileFields = completeProfileFields;
