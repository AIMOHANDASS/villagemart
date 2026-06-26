"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAdminForceReload = exports.handleAdminBlockPartner = exports.handleAdminUnblockPartner = exports.getStats = exports.rejectPartner = exports.approvePartner = exports.getUsers = exports.getTransportPartners = exports.getDeliveryPartners = exports.adminLogin = void 0;
const db_1 = __importDefault(require("../db"));
const server_1 = require("../server");
const auth_middleware_1 = require("../middleware/auth.middleware");
const adminLogin = async (req, res) => {
    const { username, password } = req.body;
    // ✅ DEFAULT ADMIN (In a real app, this would be a proper DB check)
    if (username === "Mohan" && password === "mohan123") {
        const token = (0, auth_middleware_1.generateToken)({ id: 0, username: "Mohan", role: "ADMIN" });
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
exports.adminLogin = adminLogin;
/* ======================================================
   👥 PARTNER MANAGEMENT
====================================================== */
const getDeliveryPartners = (req, res) => {
    const sql = "SELECT id, name, email, phone, vehicle_type, vehicle_number, status, account_status, `created at` AS created_at, profile_image, dl_document_url, rc_document_url, aadhaar_document_url FROM delivery_partners ORDER BY `created at` DESC";
    db_1.default.query(sql, (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, data: rows });
    });
};
exports.getDeliveryPartners = getDeliveryPartners;
const getTransportPartners = (req, res) => {
    const sql = "SELECT id, name, email, phone, vehicle_type, vehicle_number, status, account_status, `created at` AS created_at, profile_image, dl_document_url, rc_document_url, aadhaar_document_url FROM transport_partners ORDER BY `created at` DESC";
    db_1.default.query(sql, (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, data: rows });
    });
};
exports.getTransportPartners = getTransportPartners;
const getUsers = (req, res) => {
    const sql = "SELECT id, name, username, email, phone, profile_image, `created at` AS created_at, 1 AS is_verified FROM users ORDER BY `created at` DESC";
    db_1.default.query(sql, (err, rows) => {
        if (err) {
            console.error("❌ Error fetching users:", err);
            // Fallback query in case username doesn't exist
            const fallbackSql = "SELECT id, name, email, phone, `created at` AS created_at, 1 AS is_verified FROM users ORDER BY `created at` DESC";
            db_1.default.query(fallbackSql, (err2, rows2) => {
                if (err2)
                    return res.status(500).json({ success: false, message: "Database error fetching users" });
                return res.json({ success: true, data: rows2 });
            });
            return;
        }
        res.json({ success: true, data: rows });
    });
};
exports.getUsers = getUsers;
const approvePartner = (type) => async (req, res) => {
    const id = req.params.id;
    const table = type === "delivery" ? "delivery_partners" : "transport_partners";
    const sql = `UPDATE ${table} SET status='approved' WHERE id=?`;
    db_1.default.query(sql, [id], (err) => {
        if (err)
            return res.status(500).json({ success: false, message: "Failed to approve partner" });
        res.json({ success: true, message: `${type} partner approved` });
    });
};
exports.approvePartner = approvePartner;
const rejectPartner = (type) => async (req, res) => {
    const id = req.params.id;
    const table = type === "delivery" ? "delivery_partners" : "transport_partners";
    const sql = `UPDATE ${table} SET status='rejected' WHERE id=?`;
    db_1.default.query(sql, [id], (err) => {
        if (err)
            return res.status(500).json({ success: false, message: "Failed to reject partner" });
        res.json({ success: true, message: `${type} partner rejected` });
    });
};
exports.rejectPartner = rejectPartner;
/* ======================================================
   📊 ADMIN ANALYTICS (DUMMY)
====================================================== */
const getStats = (req, res) => {
    // Parallel counts
    const queries = [
        "SELECT COUNT(*) as count FROM orders",
        "SELECT COUNT(*) as count FROM delivery_partners WHERE status='approved'",
        "SELECT COUNT(*) as count FROM delivery_partners WHERE status='pending'",
        "SELECT SUM(`total amount`) as revenue FROM orders WHERE status='DELIVERED'"
    ];
    // For brevity, using sequential but in real app use Promise.all
    db_1.default.query(queries[0], (err1, r1) => {
        db_1.default.query(queries[1], (err2, r2) => {
            db_1.default.query(queries[2], (err3, r3) => {
                db_1.default.query(queries[3], (err4, r4) => {
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
exports.getStats = getStats;
/* ======================================================
   🔓 UNBLOCK PARTNER (Admin override)
====================================================== */
const handleAdminUnblockPartner = async (req, res) => {
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
    db_1.default.query(unblockSql, [partnerId], (err, result) => {
        if (err)
            return res.status(500).json({ success: false, error: err.message });
        return res.status(200).json({
            success: true,
            message: `🎉 Partner #${partnerId} successfully unblocked! Service access has been completely restored.`
        });
    });
};
exports.handleAdminUnblockPartner = handleAdminUnblockPartner;
/* ======================================================
   🚫 BLOCK PARTNER (Admin override)
====================================================== */
const handleAdminBlockPartner = async (req, res) => {
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
    db_1.default.query(blockSql, [partnerId], (err, result) => {
        if (err)
            return res.status(500).json({ success: false, error: err.message });
        return res.status(200).json({
            success: true,
            message: `🚫 Partner #${partnerId} has been manually blocked.`
        });
    });
};
exports.handleAdminBlockPartner = handleAdminBlockPartner;
/* ======================================================
   🔄 FORCE GLOBAL RELOAD
====================================================== */
const handleAdminForceReload = (req, res) => {
    // Broadcast an instruction to every connected Socket.IO client globally
    server_1.io.emit("system_reload");
    return res.status(200).json({ success: true, message: "🚀 Broadcast sent: All client applications are now reloading." });
};
exports.handleAdminForceReload = handleAdminForceReload;
