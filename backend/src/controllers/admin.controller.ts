import { Request, Response } from "express";
import db from "../db";
import { io } from "../server";
import { generateToken } from "../middleware/auth.middleware";
import { createPartnerPaymentLink } from "./razorpay.controller";
import { sendCommissionOverdueMail, sendPartnerSuspensionMail } from "../utils/mailer";
import bcrypt from "bcryptjs";
import { Storage } from "@google-cloud/storage";

export const getPartnerDocumentUrl = async (req: Request, res: Response): Promise<any> => {
  const { path } = req.query;
  if (!path || typeof path !== 'string' || !path.startsWith('gs://')) {
    return res.status(400).json({ success: false, message: "Invalid document path provided." });
  }

  const bucketName = process.env.GCS_BUCKET;
  const keyFilename = process.env.GCS_KEYFILE || "./keyfile.json";

  if (!bucketName) {
    return res.status(500).json({ success: false, message: "Server storage configuration is missing." });
  }

  try {
    const gcsOptions: any = {};
    const fs = require('fs');
    if (fs.existsSync(keyFilename)) {
      gcsOptions.keyFilename = keyFilename;
    }
    const storage = new Storage(gcsOptions);
    const bucket = storage.bucket(bucketName);
    
    // gs://villagemart-c7f3d.firebasestorage.app/partners/delivery/12345_profile.png
    const prefix = `gs://${bucketName}/`;
    if (!path.startsWith(prefix)) {
      return res.status(403).json({ success: false, message: "Unauthorized bucket access." });
    }
    
    const filename = path.replace(prefix, '');
    const file = bucket.file(filename);

    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ success: false, message: "Document not found in storage." });
    }

    // Generate a signed URL that expires in 15 minutes
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, 
    });

    return res.json({ success: true, url: signedUrl });
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    return res.status(500).json({ success: false, message: "Failed to generate document link." });
  }
};


export const adminLogin = async (req: Request, res: Response): Promise<any> => {
  const { username, password } = req.body;

  // First check database for admin
  db.query(
    "SELECT * FROM admins WHERE username = ? OR email = ? LIMIT 1",
    [username, username],
    async (err, rows: any[]) => {
      if (!err && rows && rows.length > 0) {
        const admin = rows[0];
        const isValid = bcrypt.compareSync(password, admin.password);
        if (isValid) {
          const perms = admin.permissions ? JSON.parse(admin.permissions) : [];
          const token = generateToken({
            id: admin.id,
            username: admin.username,
            role: "ADMIN",
            permissions: perms,
          } as any);
          return res.json({
            success: true,
            role: "ADMIN",
            token,
            user: {
              id: admin.id,
              username: admin.username,
              name: admin.name,
              role: "ADMIN",
              permissions: perms,
            },
          });
        }
      }

      // Hardcoded fallback for Mohan default admin (Super Admin)
      if (username === "Mohan" && password === "mohan123") {
        const defaultPerms = [
          "dashboard",
          "orders",
          "products",
          "users",
          "partners",
          "transport",
          "party-hall"
        ];
        const token = generateToken({
          id: 1, // Super admin ID
          username: "Mohan",
          role: "ADMIN",
          permissions: defaultPerms,
        } as any);
        return res.json({
          success: true,
          role: "ADMIN",
          token,
          user: {
            id: 1,
            username: "Mohan",
            name: "Admin Mohan",
            role: "ADMIN",
            permissions: defaultPerms,
          },
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
  );
};

/* ======================================================
   👥 PARTNER MANAGEMENT
====================================================== */

/**
 * Resolves absolute URLs for uploaded partner documents/images.
 * Auto-detects local relative paths vs already absolute GCS links.
 * Leverages HTTPS secure protocol in production to bypass browser Mixed Content blocks.
 */
const getAbsoluteDocumentUrl = (req: Request, fileName: string | null | undefined): string | null => {
  if (!fileName) return null;
  const trimmed = fileName.trim();
  if (!trimmed) return null;

  // Already a GCS/external absolute URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Detect base URL dynamically or use environment configuration
  let baseUrl = process.env.BACKEND_URL;
  if (!baseUrl) {
    const isProd = process.env.NODE_ENV === "production" || req.get("host")?.includes("run.app") || req.get("host")?.includes("villagesmart");
    const protocol = isProd ? "https" : req.protocol;
    baseUrl = `${protocol}://${req.get("host")}`;
  }

  // Ensure no trailing slash, and path starts with /
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanFile = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  // If path is e.g. /uploads/filename.png, prepend backend URL
  if (cleanFile.startsWith("/uploads/")) {
    return `${cleanBase}${cleanFile}`;
  }
  
  // Otherwise, default to the api uploads folder structure path: /uploads/filename.png
  return `${cleanBase}/uploads${cleanFile}`;
};

export const getDeliveryPartners = (req: Request, res: Response) => {
  const sql = "SELECT id, name, email, phone, vehicle_type, vehicle_number, status, account_status, `created at` AS created_at, profile_image, dl_document_url, rc_document_url, aadhaar_document_url FROM delivery_partners ORDER BY `created at` DESC";
  db.query(sql, (err, rows: any[]) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    
    const formattedRows = (rows || []).map((partner: any) => ({
      ...partner,
      profile_image: getAbsoluteDocumentUrl(req, partner.profile_image),
      dl_document_url: getAbsoluteDocumentUrl(req, partner.dl_document_url),
      rc_document_url: getAbsoluteDocumentUrl(req, partner.rc_document_url),
      aadhaar_document_url: getAbsoluteDocumentUrl(req, partner.aadhaar_document_url),
    }));

    res.json({ success: true, data: formattedRows });
  });
};

export const getTransportPartners = (req: Request, res: Response) => {
  const sql = "SELECT id, name, email, phone, vehicle_type, vehicle_number, status, account_status, `created at` AS created_at, profile_image, dl_document_url, rc_document_url, aadhaar_document_url FROM transport_partners ORDER BY `created at` DESC";
  db.query(sql, (err, rows: any[]) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });

    const formattedRows = (rows || []).map((partner: any) => ({
      ...partner,
      profile_image: getAbsoluteDocumentUrl(req, partner.profile_image),
      dl_document_url: getAbsoluteDocumentUrl(req, partner.dl_document_url),
      rc_document_url: getAbsoluteDocumentUrl(req, partner.rc_document_url),
      aadhaar_document_url: getAbsoluteDocumentUrl(req, partner.aadhaar_document_url),
    }));

    res.json({ success: true, data: formattedRows });
  });
};

export const getUsers = (req: Request, res: Response) => {
  const sql = "SELECT id, name, username, email, phone, profile_image, `created at` AS created_at, 1 AS is_verified FROM users WHERE is_deleted = 0 ORDER BY `created at` DESC";
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("❌ Error fetching users:", err);
      // Fallback query in case username doesn't exist
      const fallbackSql = "SELECT id, name, email, phone, `created at` AS created_at, 1 AS is_verified FROM users WHERE is_deleted = 0 ORDER BY `created at` DESC";
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
  const { partnerId, partnerRole, clearDues = false } = req.body; 
  if (!partnerId || !partnerRole) {
    return res.status(400).json({ success: false, message: "Missing partnerId or partnerRole." });
  }

  const roleLower = String(partnerRole).toLowerCase();
  const targetTable = roleLower === "transport" ? "transport_partners" : "delivery_partners";

  let unblockSql = "";
  if (clearDues) {
    // Explicit settlement requested: zero balances and clear due timers
    unblockSql = `
      UPDATE ${targetTable} 
      SET account_status = 'APPROVED', 
          blocking_reason = NULL,
          pending_commission = 0.00, 
          wallet_balance = 0.00,
          commission_due_since = NULL,
          commission_deadline = NULL 
      WHERE id = ?
    `;
  } else {
    // Unblock partner access while retaining outstanding platform dues
    unblockSql = `
      UPDATE ${targetTable} 
      SET account_status = 'APPROVED', 
          blocking_reason = NULL 
      WHERE id = ?
    `;
  }

  db.query(unblockSql, [partnerId], (err: any, result: any) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    
    return res.status(200).json({ 
      success: true, 
      message: `🎉 Partner #${partnerId} successfully unblocked! Service access has been restored.` 
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

  const roleLower = String(partnerRole).toLowerCase();
  const targetTable = roleLower === "transport" ? "transport_partners" : "delivery_partners";

  const blockSql = `
    UPDATE ${targetTable} 
    SET account_status = 'BLOCKED',
        blocking_reason = 'Reason: Manually blocked by administrator'
    WHERE id = ?
  `;

  db.query(blockSql, [partnerId], (err: any, result: any) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    
    // Fetch partner details to dispatch suspension email immediately
    db.query(`SELECT name, email, pending_commission FROM \`${targetTable}\` WHERE id = ?`, [partnerId], async (fetchErr, rows: any[]) => {
      if (!fetchErr && rows && rows.length > 0) {
        const partner = rows[0];
        if (partner.email) {
          const dueAmt = parseFloat(partner.pending_commission || 0);
          await sendPartnerSuspensionMail(
            partner.email,
            partner.name || "Partner",
            dueAmt,
            partnerId,
            roleLower
          );
          console.log(`✉️ Suspension email sent to ${roleLower} partner #${partnerId}`);
        }
      }
    });

    return res.status(200).json({ 
      success: true, 
      message: `🚫 Partner #${partnerId} has been manually blocked and notified via email.` 
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

/* ======================================================
   🏛️ PARTY HALL AVAILABILITY CONTROLS
====================================================== */
export const getPartyHallServiceStatus = (req: Request, res: Response) => {
  const sql = "SELECT setting_value FROM system_settings WHERE setting_key = 'party_hall_service_available' LIMIT 1";
  db.query(sql, (err, rows: any[]) => {
    if (err) {
      console.error("❌ getPartyHallServiceStatus error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
    const isAvailable = rows && rows.length > 0 ? (rows[0].setting_value === "true" || rows[0].setting_value === "1") : true;
    return res.status(200).json({ success: true, available: isAvailable });
  });
};

export const togglePartyHallService = (req: Request, res: Response) => {
  const providedValue = req.body.available;
  
  if (providedValue !== undefined && typeof providedValue === "boolean") {
    const valStr = providedValue ? "true" : "false";
    const sql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = 'party_hall_service_available'";
    db.query(sql, [valStr], (err, result: any) => {
      if (err) {
        console.error("❌ togglePartyHallService error:", err);
        return res.status(500).json({ success: false, error: err.message });
      }
      return res.status(200).json({ success: true, available: providedValue, message: `Party Hall service set to ${valStr}` });
    });
  } else {
    const selectSql = "SELECT setting_value FROM system_settings WHERE setting_key = 'party_hall_service_available' LIMIT 1";
    db.query(selectSql, (err, rows: any[]) => {
      if (err) {
        console.error("❌ select key togglePartyHallService error:", err);
        return res.status(500).json({ success: false, error: err.message });
      }
      const currentVal = rows && rows.length > 0 ? (rows[0].setting_value === "true" || rows[0].setting_value === "1") : true;
      const nextVal = !currentVal;
      const nextValStr = nextVal ? "true" : "false";
      
      const updateSql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = 'party_hall_service_available'";
      db.query(updateSql, [nextValStr], (updateErr) => {
        if (updateErr) {
          console.error("❌ update key togglePartyHallService error:", updateErr);
          return res.status(500).json({ success: false, error: updateErr.message });
        }
        return res.status(200).json({ success: true, available: nextVal, message: `Party Hall service toggled to ${nextValStr}` });
      });
    });
  }
};

// DELETE /api/admin/users/:id (Permanent Hard Delete)
export const deleteUser = (req: Request, res: Response) => {
  const id = req.params.id;
  db.query("DELETE FROM users WHERE id = ?", [id], (err, result: any) => {
    if (err) {
      console.error("Hard delete error:", err);
      return res.status(550).json({ success: false, message: "Database error deleting user" });
    }
    
    if (result && result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User record not found." });
    }

    return res.json({ 
      success: true, 
      message: `User #${id} permanently purged from database.` 
    });
  });
};

// GET /api/admin/sub-admins
export const getSubAdmins = (req: Request, res: Response) => {
  db.query("SELECT id, name, username, email, permissions FROM admins ORDER BY id ASC", (err, rows: any[]) => {
    if (err) {
      console.error("Error fetching sub-admins:", err);
      return res.status(550).json({ success: false, message: "Database error fetching admins" });
    }
    const mapped = rows.map((r) => ({
      ...r,
      permissions: r.permissions ? JSON.parse(r.permissions) : [],
    }));
    return res.json({ success: true, data: mapped });
  });
};

// POST /api/admin/sub-admins
export const createSubAdmin = (req: Request, res: Response) => {
  const { name, username, email, password, permissions } = req.body;
  if (!name || !username || !email || !password) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const permsStr = JSON.stringify(permissions || []);

  db.query(
    "INSERT INTO admins (name, username, email, password, permissions) VALUES (?, ?, ?, ?, ?)",
    [name, username, email, hashedPassword, permsStr],
    (err, result: any) => {
      if (err) {
        console.error("Error creating sub-admin:", err);
        return res.status(550).json({ success: false, message: "Username or email already exists" });
      }
      return res.status(201).json({
        success: true,
        message: "Sub-admin created successfully",
        data: { id: result.insertId, name, username, email, permissions },
      });
    }
  );
};

// PUT /api/admin/sub-admins/:id
export const updateSubAdmin = (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, username, email, password, permissions } = req.body;

  if (id === 1) {
    return res.status(403).json({ success: false, message: "Super Admin configuration cannot be modified" });
  }

  let sql = "UPDATE admins SET name = ?, username = ?, email = ?, permissions = ?";
  const params = [name, username, email, JSON.stringify(permissions || [])];

  if (password) {
    sql += ", password = ?";
    params.push(bcrypt.hashSync(password, 10));
  }

  sql += " WHERE id = ?";
  params.push(id);

  db.query(sql, params, (err) => {
    if (err) {
      console.error("Error updating sub-admin:", err);
      return res.status(550).json({ success: false, message: "Database error updating admin" });
    }
    return res.json({ success: true, message: "Sub-admin updated successfully" });
  });
};

// DELETE /api/admin/sub-admins/:id
export const deleteSubAdmin = (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (id === 1) {
    return res.status(403).json({ success: false, message: "Super Admin cannot be deleted" });
  }

  db.query("DELETE FROM admins WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Error deleting sub-admin:", err);
      return res.status(550).json({ success: false, message: "Database error deleting admin" });
    }
    return res.json({ success: true, message: "Sub-admin deleted successfully" });
  });
};

/* ==========================================
   SUPPORT TICKETS & ALERTS
   ========================================== */

// GET /api/admin/alerts
export const getSupportTickets = (req: Request, res: Response) => {
  const sql = `
    SELECT 
      st.id,
      st.issue,
      st.status AS ticket_status,
      st.priority,
      st.created_at,
      tb.id AS ride_id,
      tb.booking_number,
      tb.status AS ride_status,
      tb.from_address,
      tb.\`to address\` AS to_address,
      u.id AS user_id,
      COALESCE(u.name, tb.customer_name) AS customer_name,
      COALESCE(u.phone, tb.customer_phone) AS customer_phone,
      tp.id AS driver_id,
      tp.name AS driver_name,
      tp.phone AS driver_phone
    FROM support_tickets st
    JOIN transport_bookings tb ON tb.id = st.ride_id
    LEFT JOIN users u ON u.id = tb.\`user id\`
    LEFT JOIN transport_partners tp ON tp.id = tb.driver_id
    ORDER BY st.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Error fetching support tickets:", err);
      return res.status(500).json({ success: false, message: "Database error fetching tickets" });
    }
    return res.json({ success: true, tickets: rows });
  });
};

// PATCH /api/admin/alerts/:id/resolve
export const resolveSupportTicket = (req: Request, res: Response) => {
  const ticketId = req.params.id;
  db.query("UPDATE support_tickets SET status = 'RESOLVED' WHERE id = ?", [ticketId], (err, result: any) => {
    if (err) {
      console.error("Error resolving support ticket:", err);
      return res.status(500).json({ success: false, message: "Database error resolving ticket" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    return res.json({ success: true, message: "Ticket marked as resolved" });
  });
};
