// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import db from "../db";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/auth.middleware";

/* ======================================================
   🗂 ENSURE ROLE COLUMN EXISTS ON USERS TABLE
   (safe ALTER — won't break if column already exists)
====================================================== */
db.query(
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'`,
  (err) => {
    if (err && !String(err.message).includes("Duplicate")) {
      // Fallback for MySQL versions without IF NOT EXISTS on ALTER
      db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='role'`,
        (checkErr: any, rows: any[]) => {
          if (!checkErr && (!rows || rows.length === 0)) {
            db.query(
              `ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'`,
              (addErr) => {
                if (addErr) console.error("❌ Could not add role column:", addErr);
                else console.log("✅ Added 'role' column to users table");
              }
            );
          }
        }
      );
    }
  }
);

/* ======================================================
   🔐 UNIFIED LOGIN (Role-based)
   POST /api/auth/login
   Body: { username, password, loginType }
====================================================== */
import jwt from "jsonwebtoken";

export const login = async (req: any, res: any) => {
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

    db.query(sql, [usernameOrEmail, usernameOrEmail], async (err, results: any) => {
      if (err || !results.length) {
        return res.status(401).json({ success: false, message: "Invalid account credentials" });
      }

      const activeProfile = results[0];

      // 🎯 CRITICAL REJECTION GATEWAY: Blocks logins if blocked by the system
      if (activeProfile.account_status === 'BLOCKED') {
        return res.status(403).json({ 
          success: false, 
          message: "Access Denied: Your account is blocked due to an overdue commission payment balance. Please contact VillageMart Admin." 
        });
      }

      // Match bcrypt password string hashes securely
      const isValidPassword = await bcrypt.compare(password, activeProfile.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: "Invalid password credentials" });
      }

      // Extract the precise role value string from the row row 🎯
      const assignedRole = String(activeProfile.role || defaultRole).toUpperCase();

      // Establish a permanent shared fallback signature key string variable 🎯
      const REUSABLE_DEV_SECRET = process.env.JWT_SECRET || "VILLAGEMART_SUPER_SECURE_PERMANENT_LOCAL_SECRET_KEY_2026";
      const token = jwt.sign(
        { id: activeProfile.id, role: assignedRole },
        REUSABLE_DEV_SECRET,
        { expiresIn: "30d" }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: activeProfile.id,
          name: activeProfile.name,
          username: activeProfile.username || activeProfile.phone,
          email: activeProfile.email || "",
          role: assignedRole
        }
      });
    });
  } catch (error) {
    console.error("❌ High-level authentication endpoint crash:", error);
    return res.status(500).json({ success: false, message: "Internal server authentication failure" });
  }
};

/* ======================================================
   🔐 REGISTER PARTNER (Admin creates delivery/transport users)
   POST /api/auth/register-partner
   Body: { name, username, email, phone, password, role }
   
   ✅ FIXED: Now inserts into the correct role-specific table
   (delivery_partners / transport_partners) instead of always
   using the users table.
====================================================== */
export const registerPartner = async (req: Request, res: Response) => {
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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Route to the correct table based on role
    if (upperRole === "DELIVERY") {
      // Check if email already exists in delivery_partners
      db.query("SELECT id FROM delivery_partners WHERE email = ? OR phone = ? LIMIT 1", [email, phone], (checkErr: any, rows: any[]) => {
        if (checkErr) return res.status(500).json({ success: false, message: "Database error" });
        if (rows.length > 0) return res.status(409).json({ success: false, message: "Email or phone already exists" });

        const sql = `
          INSERT INTO delivery_partners (name, phone, email, password, status)
          VALUES (?, ?, ?, ?, 'approved')
        `;
        db.query(sql, [name, phone, email, hashedPassword], (err: any, result: any) => {
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
    } else if (upperRole === "TRANSPORT") {
      // Check if email already exists in transport_partners
      db.query("SELECT id FROM transport_partners WHERE email = ? OR phone = ? LIMIT 1", [email, phone], (checkErr: any, rows: any[]) => {
        if (checkErr) return res.status(500).json({ success: false, message: "Database error" });
        if (rows.length > 0) return res.status(409).json({ success: false, message: "Email or phone already exists" });

        const sql = `
          INSERT INTO transport_partners (name, phone, email, password, status)
          VALUES (?, ?, ?, ?, 'approved')
        `;
        db.query(sql, [name, phone, email, hashedPassword], (err: any, result: any) => {
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
    } else if (upperRole === "ADMIN") {
      // Admin goes into admins table
      db.query("SELECT id FROM admins WHERE email = ? OR username = ? LIMIT 1", [email, username || email], (checkErr: any, rows: any[]) => {
        if (checkErr) return res.status(500).json({ success: false, message: "Database error" });
        if (rows.length > 0) return res.status(409).json({ success: false, message: "Admin already exists" });

        const sql = `INSERT INTO admins (name, username, email, password) VALUES (?, ?, ?, ?)`;
        db.query(sql, [name, username || email, email, hashedPassword], (err: any, result: any) => {
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
  } catch (error) {
    console.error("❌ Register partner error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   👤 GET CURRENT USER (from JWT)
   GET /api/auth/me
   
   ✅ FIXED: Multi-table lookup based on JWT role.
   Queries the correct table (users, admins, delivery_partners,
   transport_partners) instead of always querying users.
====================================================== */
export const getMe = (req: any, res: Response) => {
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
      sql = `SELECT id, name, username, email, phone, address, latitude, longitude, role FROM users WHERE id = ? LIMIT 1`;
      responseRole = "CUSTOMER";
  }

  db.query(sql, [userId], (err: any, rows: any[]) => {
    if (err || !rows?.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      data: {
        ...rows[0],
        role: responseRole,
      },
    });
  });
};
