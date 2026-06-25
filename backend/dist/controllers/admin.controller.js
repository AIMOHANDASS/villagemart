"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.rejectPartner = exports.approvePartner = exports.getTransportPartners = exports.getDeliveryPartners = exports.adminLogin = void 0;
const db_1 = __importDefault(require("../db"));
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
    const sql = "SELECT id, name, email, phone, vehicle_type, vehicle_number, status, `created at` AS created_at, profile_image, `document url` AS document_url FROM delivery_partners ORDER BY `created at` DESC";
    db_1.default.query(sql, (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, data: rows });
    });
};
exports.getDeliveryPartners = getDeliveryPartners;
const getTransportPartners = (req, res) => {
    const sql = "SELECT id, name, email, phone, vehicle_type, vehicle_number, status, `created at` AS created_at, profile_image, `document url` AS document_url FROM transport_partners ORDER BY `created at` DESC";
    db_1.default.query(sql, (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, data: rows });
    });
};
exports.getTransportPartners = getTransportPartners;
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
