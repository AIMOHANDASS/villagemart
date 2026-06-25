"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminOrTransport = exports.isAdminOrDelivery = exports.isCustomer = exports.isTransport = exports.isDelivery = exports.isAdmin = exports.requireRole = exports.checkRequiredRoles = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "VILLAGEMART_SUPER_SECURE_PERMANENT_LOCAL_SECRET_KEY_2026";
/* ======================================================
   🔐 GENERATE JWT TOKEN
====================================================== */
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "30d" });
};
exports.generateToken = generateToken;
/* ======================================================
   🔐 VERIFY JWT TOKEN (General Auth)
====================================================== */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Access Denied: Token header missing" });
    }
    const token = authHeader.split(" ")[1];
    // Match the identical shared secret key string phrase perfectly 🎯
    const REUSABLE_DEV_SECRET = process.env.JWT_SECRET || "VILLAGEMART_SUPER_SECURE_PERMANENT_LOCAL_SECRET_KEY_2026";
    jsonwebtoken_1.default.verify(token, REUSABLE_DEV_SECRET, (err, decoded) => {
        if (err) {
            console.error("❌ JWT Verification failed payload error:", err.message);
            return res.status(401).json({ success: false, message: "Invalid or expired token payload" });
        }
        // Mount the authenticated parameters securely onto the Express request channel
        req.user = { id: decoded.id, role: String(decoded.role).toUpperCase() };
        next();
    });
};
exports.verifyToken = verifyToken;
/* ======================================================
   🛡️ DYNAMIC MULTI-ROLE AUTHENTICATION SHIELD
   
   Accepts an array of allowed role strings and performs
   case-insensitive comparison against the authenticated
   user's role. Also checks both `role` and `role_state`
   JWT payload fields to handle dynamic role variations.
   
   ADMIN users always bypass role gates automatically.
====================================================== */
const checkRequiredRoles = (allowedRoles) => {
    return (req, res, next) => {
        // 1. Verify if user authentication token context payload exists
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized: Missing active login session context tokens." });
        }
        // 2. Normalize role strings to uppercase to clear out string mismatch bugs 🎯
        const currentUserRole = String(req.user.role || req.user.role_state || "").trim().toUpperCase();
        const normalizedAllowedRoles = allowedRoles.map(role => role.toUpperCase());
        console.log(`🛡️ Security Verification Engine -> User Role: [${currentUserRole}] | Required Gates: [${normalizedAllowedRoles.join(", ")}]`);
        // Allow entry if the user carries an ADMIN status string or matches the allowed tracking matrix arrays
        if (currentUserRole === "ADMIN" || normalizedAllowedRoles.includes(currentUserRole)) {
            return next(); // Authorization clear, proceed down the controller stream 🚀
        }
        // 3. Fallback gate if role checks fail to resolve
        return res.status(403).json({
            success: false,
            message: `Access Denied: Required role state matrix context mismatch. Expected one of: [${allowedRoles.join(", ")}]`
        });
    };
};
exports.checkRequiredRoles = checkRequiredRoles;
/* ======================================================
   🔐 LEGACY requireRole — NOW DELEGATES TO checkRequiredRoles
   Kept for backward-compatibility with existing route imports.
====================================================== */
const requireRole = (...allowedRoles) => {
    return (0, exports.checkRequiredRoles)(allowedRoles);
};
exports.requireRole = requireRole;
/* ======================================================
   🔐 SHORTHAND ROLE MIDDLEWARES
   ✅ FIXED: Each shorthand now accepts multiple synonymous
   role strings (e.g., DELIVERY + DRIVER) so that partners
   with slightly different role labels pass validation.
====================================================== */
exports.isAdmin = (0, exports.checkRequiredRoles)(["ADMIN"]);
exports.isDelivery = (0, exports.checkRequiredRoles)(["DELIVERY", "DRIVER"]);
exports.isTransport = (0, exports.checkRequiredRoles)(["TRANSPORT", "RIDER", "DRIVER"]);
exports.isCustomer = (0, exports.checkRequiredRoles)(["CUSTOMER"]);
exports.isAdminOrDelivery = (0, exports.checkRequiredRoles)(["ADMIN", "DELIVERY", "DRIVER"]);
exports.isAdminOrTransport = (0, exports.checkRequiredRoles)(["ADMIN", "TRANSPORT", "RIDER", "DRIVER"]);
