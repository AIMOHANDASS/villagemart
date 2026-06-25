import { Request, Response } from "express";
import db from "../db";
import { io } from "../server";
import { generateToken } from "../middleware/auth.middleware";

export const adminLogin = async (req: Request, res: Response): Promise<any> => {
  const { username, password } = req.body;

  // ✅ DEFAULT ADMIN (In a real app, this would be a proper DB check)
  if (username === "Mohan" && password === "mohan123") {
    const token = generateToken({ id: 0, username: "Mohan", role: "ADMIN" });
    return res.json({
      success: true,
      role: "ADMIN",
      token, // Real signed token instead of "admin-token-12345"
      user: {
        id: 0,
        username: "Mohan",
        name: "Admin Mohan",
        role: "ADMIN"
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials"
  });
};

/* ======================================================
   👥 PARTNER MANAGEMENT
====================================================== */

export const getDeliveryPartners = (req: Request, res: Response) => {
  const sql = "SELECT id, name, email, phone, vehicle_type, vehicle_number, status, account_status, `created at` AS created_at, profile_image, dl_document_url, rc_document_url, aadhaar_document_url FROM delivery_partners ORDER BY `created at` DESC";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    res.json({ success: true, data: rows });
  });
};

export const getTransportPartners = (req: Request, res: Response) => {
  const sql = "SELECT id, name, email, phone, vehicle_type, vehicle_number, status, account_status, `created at` AS created_at, profile_image, dl_document_url, rc_document_url, aadhaar_document_url FROM transport_partners ORDER BY `created at` DESC";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    res.json({ success: true, data: rows });
  });
};

export const getUsers = (req: Request, res: Response) => {
  const sql = "SELECT id, name, username, email, phone, profile_image, `created at` AS created_at, 1 AS is_verified FROM users ORDER BY `created at` DESC";
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("❌ Error fetching users:", err);
      // Fallback query in case username doesn't exist
      const fallbackSql = "SELECT id, name, email, phone, `created at` AS created_at, 1 AS is_verified FROM users ORDER BY `created at` DESC";
      db.query(fallbackSql, (err2, rows2) => {
        if (err2) return res.status(500).json({ success: false, message: "Database error fetching users" });
        return res.json({ success: true, data: rows2 });
      });
      return;
    }
    res.json({ success: true, data: rows });
  });
};

export const approvePartner = (type: "delivery" | "transport") => async (req: Request, res: Response) => {
  const id = req.params.id;
  const table = type === "delivery" ? "delivery_partners" : "transport_partners";
  const sql = `UPDATE ${table} SET status='approved' WHERE id=?`;
  
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: "Failed to approve partner" });
    res.json({ success: true, message: `${type} partner approved` });
  });
};

export const rejectPartner = (type: "delivery" | "transport") => async (req: Request, res: Response) => {
  const id = req.params.id;
  const table = type === "delivery" ? "delivery_partners" : "transport_partners";
  const sql = `UPDATE ${table} SET status='rejected' WHERE id=?`;
  
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: "Failed to reject partner" });
    res.json({ success: true, message: `${type} partner rejected` });
  });
};

/* ======================================================
   📊 ADMIN ANALYTICS (DUMMY)
====================================================== */
export const getStats = (req: Request, res: Response) => {
  // Parallel counts
  const queries = [
    "SELECT COUNT(*) as count FROM orders",
    "SELECT COUNT(*) as count FROM delivery_partners WHERE status='approved'",
    "SELECT COUNT(*) as count FROM delivery_partners WHERE status='pending'",
    "SELECT SUM(`total amount`) as revenue FROM orders WHERE status='DELIVERED'"
  ];

  // For brevity, using sequential but in real app use Promise.all
  db.query(queries[0], (err1, r1: any) => {
    db.query(queries[1], (err2, r2: any) => {
      db.query(queries[2], (err3, r3: any) => {
        db.query(queries[3], (err4, r4: any) => {
          res.json({
            success: true,
            data: {
              totalOrders: r1?.[0]?.count || 0,
              activePartners: r2?.[0]?.count || 0,
              pendingApprovals: r3?.[0]?.count || 0,
              totalRevenue: r4?.[0]?.revenue || 0
            }
          });
        });
      });
    });
  });
};

/* ======================================================
   🔓 UNBLOCK PARTNER (Admin override)
====================================================== */
export const handleAdminUnblockPartner = async (req: any, res: any) => {
  const { partnerId, partnerRole } = req.body; 
  if (!partnerId || !partnerRole) {
    return res.status(400).json({ success: false, message: "Missing partnerId or partnerRole." });
  }

  const targetTable = String(partnerRole).toLowerCase() === "transport" ? "transport_partners" : "delivery_partners";

  // 🎯 ADMIN RESET OVERRIDE: Unblocks accounts, zeroes the owed balance, and clears timer records
  const unblockSql = `
    UPDATE ${targetTable} 
    SET account_status = 'APPROVED', 
        pending_commission = 0.00, 
        commission_deadline = NULL 
    WHERE id = ?
  `;

  db.query(unblockSql, [partnerId], (err: any, result: any) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    
    return res.status(200).json({ 
      success: true, 
      message: `🎉 Partner #${partnerId} successfully unblocked! Service access has been completely restored.` 
    });
  });
};

/* ======================================================
   🚫 BLOCK PARTNER (Admin override)
====================================================== */
export const handleAdminBlockPartner = async (req: any, res: any) => {
  const { partnerId, partnerRole } = req.body; 
  if (!partnerId || !partnerRole) {
    return res.status(400).json({ success: false, message: "Missing partnerId or partnerRole." });
  }

  const targetTable = String(partnerRole).toLowerCase() === "transport" ? "transport_partners" : "delivery_partners";

  const blockSql = `
    UPDATE ${targetTable} 
    SET account_status = 'BLOCKED'
    WHERE id = ?
  `;

  db.query(blockSql, [partnerId], (err: any, result: any) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    
    return res.status(200).json({ 
      success: true, 
      message: `🚫 Partner #${partnerId} has been manually blocked.` 
    });
  });
};

/* ======================================================
   🔄 FORCE GLOBAL RELOAD
====================================================== */
export const handleAdminForceReload = (req: Request, res: Response) => {
  // Broadcast an instruction to every connected Socket.IO client globally
  io.emit("system_reload");
  return res.status(200).json({ success: true, message: "🚀 Broadcast sent: All client applications are now reloading." });
};
