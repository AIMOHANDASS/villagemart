// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "VILLAGEMART_SUPER_SECURE_PERMANENT_LOCAL_SECRET_KEY_2026";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

/* ======================================================
   🔐 GENERATE JWT TOKEN
====================================================== */
export const generateToken = (payload: {
  id: number;
  username: string;
  role: string;
}) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
};

/* ======================================================
   🔐 VERIFY JWT TOKEN (General Auth)
====================================================== */
export const verifyToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Access Denied: Token header missing" });
  }

  const token = authHeader.split(" ")[1];

  // Match the identical shared secret key string phrase perfectly 🎯
  const REUSABLE_DEV_SECRET = process.env.JWT_SECRET || "VILLAGEMART_SUPER_SECURE_PERMANENT_LOCAL_SECRET_KEY_2026";

  jwt.verify(token, REUSABLE_DEV_SECRET, (err: any, decoded: any) => {
    if (err) {
      console.error("❌ JWT Verification failed payload error:", err.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token payload" });
    }
    
    // Mount the authenticated parameters securely onto the Express request channel
    req.user = { id: decoded.id, role: String(decoded.role).toUpperCase() };
    
    // 🛡️ DYNAMIC BLOCK CHECK: Automatically terminate session if the partner was blocked
    checkPartnerSessionStatus(req, res, next);
  });
};

/* ======================================================
   🛡️ DYNAMIC MULTI-ROLE AUTHENTICATION SHIELD
   
   Accepts an array of allowed role strings and performs
   case-insensitive comparison against the authenticated
   user's role. Also checks both `role` and `role_state`
   JWT payload fields to handle dynamic role variations.
   
   ADMIN users always bypass role gates automatically.
====================================================== */
export const checkRequiredRoles = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
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

/* ======================================================
   🔐 LEGACY requireRole — NOW DELEGATES TO checkRequiredRoles
   Kept for backward-compatibility with existing route imports.
====================================================== */
export const requireRole = (...allowedRoles: string[]) => {
  return checkRequiredRoles(allowedRoles);
};

/* ======================================================
   🔐 SHORTHAND ROLE MIDDLEWARES
   ✅ FIXED: Each shorthand now accepts multiple synonymous
   role strings (e.g., DELIVERY + DRIVER) so that partners
   with slightly different role labels pass validation.
====================================================== */
export const isAdmin = checkRequiredRoles(["ADMIN"]);
export const isDelivery = checkRequiredRoles(["DELIVERY", "DRIVER"]);
export const isTransport = checkRequiredRoles(["TRANSPORT", "RIDER", "DRIVER"]);
export const isCustomer = checkRequiredRoles(["CUSTOMER"]);
export const isAdminOrDelivery = checkRequiredRoles(["ADMIN", "DELIVERY", "DRIVER"]);
export const isAdminOrTransport = checkRequiredRoles(["ADMIN", "TRANSPORT", "RIDER", "DRIVER"]);

/* ======================================================
   🔐 PARTNER COMMISSION GUARD SESSION VALIDATOR
   Checks if the active logged-in partner's account_status
   has been set to 'BLOCKED' by the cron engine.
====================================================== */
export const checkPartnerSessionStatus = async (req: any, res: any, next: any) => {
  const partnerId = req.user?.id;
  const role = req.user?.role; // 'TRANSPORT' or 'DELIVERY'
  
  if (!partnerId || !role) return next(); // Skip if not a valid user payload
  
  const roleUpper = role.toUpperCase();
  let table = null;

  if (roleUpper === 'TRANSPORT' || roleUpper === 'RIDER') table = 'transport_partners';
  else if (roleUpper === 'DELIVERY') table = 'delivery_partners';
  
  if (!table) return next(); // Not a partner role, skip

  db.query(`SELECT account_status FROM ${table} WHERE id = ?`, [partnerId], (err: any, rows: any[]) => {
    if (err || rows.length === 0 || rows[0].account_status === 'BLOCKED') {
      return res.status(403).json({ 
        success: false, 
        isBlocked: true,
        message: "Session Terminated: Account blocked due to outstanding commissions." 
      });
    }
    next();
  });
};
