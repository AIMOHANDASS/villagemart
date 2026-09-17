"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDeliveryOtp = exports.getActiveDeliveryOrders = exports.autoAssignNearestPartner = exports.toggleDeliveryOnline = exports.getDeliveryEarnings = exports.updateDeliveryLocation = exports.updatePartnerDeliveryStatus = exports.acceptOrder = exports.getDeliveryOrders = exports.loginDeliveryPartner = exports.signupDeliveryPartner = exports.triggerOrderNotification = void 0;
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const commissionGuard_1 = require("../cron/commissionGuard");
const notification_utils_1 = require("../utils/notification.utils");
const order_controller_1 = require("./order.controller");
/* ======================================================
   🔔 REUSABLE NOTIFICATION BUILDER HELPER
   Safely writes alert messages into our verified
   notifications table schema using backtick-escaped columns.
====================================================== */
const triggerOrderNotification = (userId, textMessage, orderId) => {
    const route = orderId ? `/?app=consumer/my-orders/${orderId}` : `/?app=consumer/my-orders`;
    (0, notification_utils_1.createAndSendNotification)(userId, "CUSTOMER", "Order Update", textMessage, { route });
};
exports.triggerOrderNotification = triggerOrderNotification;
/* ======================================================
   🗂 ENSURE DELIVERY PARTNERS TABLE EXISTS
====================================================== */
db_1.default.query(`CREATE TABLE IF NOT EXISTS delivery_partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(20),
    \`is active\` TINYINT(1) DEFAULT 1,
    \`is verified\` TINYINT(1) DEFAULT 0,
    \`created at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`document url\` TEXT,
    \`license number\` VARCHAR(50),
    aadhaar_number VARCHAR(20),
    profile_image TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
  )`, (err) => {
    if (err)
        console.error("❌ Could not ensure delivery_partners table:", err);
});
/* ======================================================
   🔐 SIGNUP DELIVERY PARTNER
   POST /api/delivery/signup
====================================================== */
const signupDeliveryPartner = async (req, res) => {
    const { name, email, phone, password, vehicle_type, vehicle_number, license_number, district, taluk, profile_image, dl_document_url, rc_document_url, aadhaar_document_url } = req.body;
    if (!name || !email || !phone || !password || !vehicle_type || !vehicle_number || !license_number || !district || !taluk) {
        return res.status(400).json({ success: false, message: "All fields are required to complete partner registration." });
    }
    if (!profile_image || !dl_document_url || !rc_document_url || !aadhaar_document_url) {
        return res.status(400).json({ success: false, message: "Required partner documents were not uploaded" });
    }
    try {
        const checkSql = "SELECT id, email, phone FROM delivery_partners WHERE email = ? OR phone = ? LIMIT 1";
        db_1.default.query(checkSql, [email, phone], async (checkErr, rows) => {
            if (checkErr)
                return res.status(500).json({ success: false, message: "Database error" });
            if (rows.length > 0) {
                const conflictField = rows[0].email === email ? 'email address' : 'phone number';
                return res.status(409).json({ success: false, message: `A partner with this ${conflictField} already exists` });
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const sql = `
        INSERT INTO delivery_partners 
        (name, phone, email, password, vehicle_type, vehicle_number, \`license number\`, district, taluk, profile_image, dl_document_url, rc_document_url, aadhaar_document_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `;
            db_1.default.query(sql, [name, phone, email, hashedPassword, vehicle_type, vehicle_number, license_number, district, taluk, profile_image, dl_document_url, rc_document_url, aadhaar_document_url], (err, result) => {
                if (err) {
                    console.error("❌ Delivery Partner Signup DB Error:", err);
                    return res.status(500).json({ success: false, message: `Signup failed: ${err.message}` });
                }
                return res.status(201).json({ success: true, message: "Delivery partner registered successfully" });
            });
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.signupDeliveryPartner = signupDeliveryPartner;
/* ======================================================
   🔐 LOGIN DELIVERY PARTNER
   POST /api/delivery/login
====================================================== */
const loginDeliveryPartner = (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    db_1.default.query("SELECT * FROM delivery_partners WHERE email = ? LIMIT 1", [email], async (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Database error" });
        if (rows.length === 0)
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        const partner = rows[0];
        const isMatch = await bcryptjs_1.default.compare(password, partner.password);
        if (!isMatch)
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        // ✅ Enforce approval status - Allow 'pending' to login so they can see the pending dashboard
        if (partner.status === "rejected") {
            return res.status(403).json({
                success: false,
                message: "Your application has been rejected. Please contact support.",
                status: partner.status
            });
        }
        const token = (0, auth_middleware_1.generateToken)({ id: partner.id, username: partner.name, role: "DELIVERY" });
        delete partner.password;
        return res.json({
            success: true,
            message: "Login successful",
            token,
            role: "DELIVERY",
            user_id: partner.id,
            status: partner.status,
            data: partner,
        });
    });
};
exports.loginDeliveryPartner = loginDeliveryPartner;
/* ======================================================
   📦 GET PENDING/ACTIONABLE ORDERS FOR DELIVERY PARTNER
   GET /api/delivery/orders
====================================================== */
const getDeliveryOrders = (req, res) => {
    const partnerId = req.user?.id;
    let sql = `
    SELECT 
      o.id AS orderId,
      o.\`user id\` AS user_id,
      u.username,
      u.phone AS customer_phone,
      u.address AS customer_address,
      COALESCE(o.delivery_latitude, u.latitude) AS customer_lat,
      COALESCE(o.delivery_longitude, u.longitude) AS customer_lng,
      o.delivery_latitude,
      o.delivery_longitude,
      o.\`total amount\` AS total_amount,
      o.delivery_fee,
      o.payment_method,
      o.status,
      o.tracking_status,
      o.delivery_status,
      o.\`created at\` AS created_at,
      o.\`picked at\` AS picked_at,
      o.out_for_delivery_at,
      o.\`delivered at\` AS delivered_at,

      oi.id AS item_id,
      oi.product_name,
      oi.unit_price,
      oi.weight,
      oi.total_price,
      oi.image,
      p.product_type

    FROM orders o
    JOIN users u ON u.id = o.\`user id\`
    LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
    LEFT JOIN \`products\` p ON p.id = oi.product_id
    WHERE o.status != 'CANCELLED' AND (o.delivery_status IS NULL OR o.delivery_status != 'CANCELLED') AND (
      (o.status IN ('ACCEPTED', 'CONFIRMED') AND o.delivery_partner_id IS NULL AND (o.delivery_status IS NULL OR o.delivery_status NOT IN ('OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')))
      OR (o.delivery_partner_id = ? AND (o.delivery_status IS NULL OR o.delivery_status NOT IN ('DELIVERED', 'CANCELLED')))
    )
      AND NOT EXISTS (
        SELECT 1 FROM \`order_items\` oi2 
        WHERE oi2.order_id = o.id 
          AND (LOWER(oi2.category) = 'garlands' OR LOWER(oi2.product_name) LIKE '%garland%')
      )
    ORDER BY o.\`created at\` DESC
  `;
    db_1.default.query(sql, [partnerId || 0], (err, rows) => {
        if (err) {
            console.error("❌ getDeliveryOrders error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch orders",
                data: [],
            });
        }
        // Group rows into orders with items
        const map = new Map();
        (rows || []).forEach((row) => {
            if (!map.has(row.orderId)) {
                const displayTrackingStatus = row.delivery_status === 'PENDING_PICKUP' ? 'CONFIRMED' : (row.delivery_status || row.tracking_status);
                map.set(row.orderId, {
                    orderId: row.orderId,
                    user_id: row.user_id,
                    username: row.username,
                    customer_phone: row.customer_phone,
                    customer_address: row.customer_address,
                    customer_lat: row.customer_lat,
                    customer_lng: row.customer_lng,
                    delivery_latitude: row.delivery_latitude || row.customer_lat,
                    delivery_longitude: row.delivery_longitude || row.customer_lng,
                    total_amount: Number(row.total_amount),
                    delivery_fee: Number(row.delivery_fee),
                    payment_method: row.payment_method || "cod",
                    status: row.status,
                    tracking_status: displayTrackingStatus,
                    created_at: row.created_at,
                    picked_at: row.picked_at,
                    out_for_delivery_at: row.out_for_delivery_at,
                    delivered_at: row.delivered_at,
                    items: [],
                });
            }
            if (row.item_id) {
                map.get(row.orderId).items.push({
                    product_name: row.product_name,
                    unit_price: Number(row.unit_price),
                    weight: Number(row.weight),
                    total_price: Number(row.total_price),
                    image: row.image,
                    product_type: row.product_type || "other",
                });
            }
        });
        return res.json({
            success: true,
            data: [...map.values()],
        });
    });
};
exports.getDeliveryOrders = getDeliveryOrders;
/* ======================================================
   📦 ACCEPT ORDER (Delivery Partner)
   POST /api/delivery/accept/:orderId
====================================================== */
const acceptOrder = (req, res) => {
    const orderId = Number(req.params.orderId);
    const partnerId = req.user?.id;
    if (!orderId) {
        return res.status(400).json({ success: false, message: "Invalid order id" });
    }
    // Check current status must be CONFIRMED and not CANCELLED
    db_1.default.query("SELECT status, tracking_status, `user id` FROM orders WHERE id = ? LIMIT 1", [orderId], (err, rows) => {
        if (err || !rows?.length) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (rows[0].status === 'CANCELLED') {
            return res.status(409).json({ success: false, message: "This order has been cancelled by the customer." });
        }
        const current = (rows[0].tracking_status || "PENDING").toUpperCase();
        if (current !== "PENDING" && current !== "PENDING_PICKUP" && current !== "CONFIRMED" && current !== "ACCEPTED") {
            return res.status(409).json({
                success: false,
                message: `Cannot accept order in ${current} status.`,
            });
        }
        const sql = `
        UPDATE orders 
        SET tracking_status = 'CONFIRMED', status = 'ACCEPTED', delivery_status = 'PARTNER_ASSIGNED',
            delivery_partner_id = ?
        WHERE id = ? AND status IN ('ACCEPTED', 'CONFIRMED') AND delivery_partner_id IS NULL
      `;
        db_1.default.query(sql, [partnerId || null, orderId], (updateErr, result) => {
            if (updateErr) {
                console.error("❌ acceptOrder update error:", updateErr);
                return res.status(500).json({ success: false, message: "Failed to accept order" });
            }
            if (result.affectedRows === 0) {
                return res.status(409).json({ success: false, message: "This order is no longer available or already accepted by another partner." });
            }
            // Notify customer
            (0, notification_utils_1.createAndSendNotification)(rows[0]["user id"], "CUSTOMER", "✅ Order Accepted", "Your order has been accepted by the delivery partner and is preparing for pickup!", { type: "DELIVERY_ACCEPTED", orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}` });
            return res.json({
                success: true,
                message: `Order #${orderId} accepted successfully`,
                data: { orderId, status: "CONFIRMED" },
            });
        });
    });
};
exports.acceptOrder = acceptOrder;
/* ======================================================
   📦 UPDATE PARTNER DELIVERY STATUS
   PUT /api/delivery/status-update/:orderId
   Body: { status: "CONFIRMED" | "PICKED" | "OUT_FOR_DELIVERY" | "DELIVERED" }
====================================================== */
const updatePartnerDeliveryStatus = (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const partnerId = req.user?.id; // Logged-in delivery partner ID from verifyToken middleware
    // 1. FIRST check the current status to prevent duplicate triggers on double-clicks
    db_1.default.query("SELECT status, delivery_status, payment_method FROM `orders` WHERE id = ?", [orderId], (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: err.message });
        if (rows.length === 0)
            return res.status(404).json({ success: false, message: "Order not found" });
        if (rows[0].status === 'CANCELLED' || rows[0].delivery_status === 'CANCELLED') {
            return res.status(409).json({ success: false, message: "This order has been cancelled by the customer." });
        }
        const currentStatus = (rows[0].delivery_status || "").toUpperCase();
        const paymentMethod = (rows[0].payment_method || "cod").toLowerCase();
        if (currentStatus === status.toUpperCase()) {
            return res.status(200).json({ success: true, message: "Order is already in this status." });
        }
        let statusField = "";
        let timestampColumn = "";
        let notifTitle = "";
        let notifBody = "";
        let assignPartner = false;
        switch (status.toUpperCase()) {
            case "CONFIRMED":
                statusField = "CONFIRMED";
                assignPartner = true;
                notifTitle = "✅ Order Accepted";
                notifBody = `Your order #${orderId} has been accepted by the delivery partner and is preparing for pickup!`;
                break;
            case "PICKED":
                statusField = "PICKED";
                timestampColumn = "`picked at` = NOW()";
                notifTitle = "📦 Order Picked Up";
                notifBody = `Your order #${orderId} has been successfully picked up from the store and is processing for transit!`;
                break;
            case "OUT_FOR_DELIVERY":
                statusField = "OUT_FOR_DELIVERY";
                // We will handle OTP separately after UPDATE to check if it's NULL
                timestampColumn = `\`out_for_delivery_at\` = NOW()`;
                notifTitle = "🚚 Out for Delivery";
                notifBody = `Your order #${orderId} is OUT FOR DELIVERY!`; // Will append OTP later if needed
                break;
            case "DELIVERED":
                return res.status(400).json({ success: false, message: "All orders require OTP verification to complete delivery." });
            default:
                return res.status(400).json({ success: false, message: "Invalid status pipeline state string" });
        }
        let updateQuery = timestampColumn
            ? `UPDATE \`orders\` SET \`delivery_status\` = ?, ${timestampColumn} WHERE id = ?`
            : `UPDATE \`orders\` SET \`delivery_status\` = ? WHERE id = ?`;
        if (assignPartner) {
            updateQuery = `UPDATE \`orders\` SET \`delivery_status\` = ?, \`tracking_status\` = 'ACCEPTED', delivery_partner_id = ${partnerId} WHERE id = ?`;
        }
        db_1.default.query(updateQuery, [statusField, orderId], (err, result) => {
            if (err)
                return res.status(500).json({ success: false, message: err.message });
            // Instantly fetch user id row to route the automated background notification query 🎯
            db_1.default.query("SELECT o.`user id`, u.email, u.username FROM `orders` o JOIN `users` u ON o.`user id` = u.id WHERE o.id = ?", [orderId], (uErr, uRes) => {
                if (!uErr && uRes.length > 0) {
                    const customerId = uRes[0]['user id'];
                    const customerEmail = uRes[0].email;
                    const customerName = uRes[0].username;
                    if (status.toUpperCase() !== "OUT_FOR_DELIVERY") {
                        (0, notification_utils_1.createAndSendNotification)(customerId, "CUSTOMER", notifTitle, notifBody, { entityType: "order", type: status.toUpperCase(), orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders" });
                    }
                    if (status.toUpperCase() === "OUT_FOR_DELIVERY") {
                        db_1.default.query("SELECT delivery_otp FROM orders WHERE id = ?", [orderId], (err, otpRows) => {
                            if (!err && otpRows.length > 0) {
                                let otp = otpRows[0].delivery_otp;
                                if (!otp) {
                                    otp = String(Math.floor(1000 + Math.random() * 9000));
                                    db_1.default.query("UPDATE orders SET delivery_otp = ? WHERE id = ?", [otp, orderId]);
                                }
                                const otpNotif = `Your Order #${orderId} is OUT FOR DELIVERY!\nOTP: ${otp}\nShare this OTP with the driver to receive your order.`;
                                (0, notification_utils_1.createAndSendNotification)(customerId, "CUSTOMER", "🔐 Delivery OTP", otpNotif, { entityType: "order", type: "OTP", orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders", priority: "high" });
                                // Trigger email
                                db_1.default.query(`SELECT o.id, o.\`total amount\` AS total_amount, o.delivery_fee, o.address, o.phone, o.payment_method, u.email, u.username, 
                    oi.id AS item_id, oi.product_name, oi.unit_price, oi.weight, oi.total_price, oi.image, p.gst, dp.name AS partner_name, dp.phone AS partner_phone
                   FROM orders o 
                   JOIN users u ON u.id = o.\`user id\` 
                   LEFT JOIN order_items oi ON oi.order_id = o.id
                   LEFT JOIN products p ON oi.product_id = p.id
                   LEFT JOIN delivery_partners dp ON dp.id = o.delivery_partner_id
                   WHERE o.id = ?`, [orderId], async (emailErr, emailRows) => {
                                    if (!emailErr && emailRows.length > 0) {
                                        const order = emailRows[0];
                                        if (order.email) {
                                            try {
                                                const items = emailRows
                                                    .filter(r => r.item_id)
                                                    .map(r => ({
                                                    product_name: r.product_name,
                                                    unit_price: Number(r.unit_price),
                                                    weight: Number(r.weight),
                                                    total_price: Number(r.total_price),
                                                    image: r.image,
                                                    gst: Number(r.gst || 0),
                                                    quantity: Math.round(Number(r.total_price) / Number(r.unit_price)) || 1
                                                }));
                                                const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
                                                const totalGst = items.reduce((sum, i) => sum + (i.total_price - (i.total_price / (1 + (i.gst / 100)))), 0);
                                                const { sendOutForDeliveryMail } = require("../utils/mailer");
                                                await sendOutForDeliveryMail(order.email, order.username, order.id, Number(order.total_amount), Number(order.delivery_fee || 0), otp, items, order.partner_name, order.partner_phone, subtotal, totalGst, order.address, order.phone, order.payment_method);
                                            }
                                            catch (e) {
                                                console.error("Out for delivery email failed", e);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    }
                    // Send email if order is confirmed (accepted by delivery partner)
                    if (assignPartner && customerEmail) {
                        const fetchOrderDetailsSql = `
              SELECT 
                o.\`total amount\` AS total_amount,
                o.delivery_fee,
                o.address,
                o.phone AS customer_phone,
                o.payment_method,
                oi.id AS item_id,
                oi.product_name,
                oi.unit_price,
                oi.weight,
                oi.total_price,
                oi.image,
                dp.name AS partner_name,
                dp.phone AS partner_phone,
                p.gst
              FROM orders o
              LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
              LEFT JOIN products p ON oi.product_id = p.id
              LEFT JOIN delivery_partners dp ON dp.id = ?
              WHERE o.id = ?
            `;
                        db_1.default.query(fetchOrderDetailsSql, [partnerId, orderId], async (detailsErr, detailsRows) => {
                            if (!detailsErr && detailsRows.length > 0) {
                                const order = detailsRows[0];
                                const partnerName = order.partner_name || "Assigned Partner";
                                const partnerPhone = order.partner_phone || "N/A";
                                const totalAmount = Number(order.total_amount || 0);
                                const deliveryFee = Number(order.delivery_fee || 0);
                                const address = order.address || "Address not provided";
                                const customerPhone = order.customer_phone || "";
                                const paymentMethod = order.payment_method || "cod";
                                try {
                                    const { sendPartnerAcceptedMail } = require("../utils/mailer");
                                    await sendPartnerAcceptedMail(customerEmail, customerName, orderId, partnerName, partnerPhone);
                                }
                                catch (e) {
                                    console.error("Partner Accepted email failed", e);
                                }
                            }
                        });
                    }
                }
            });
            (0, order_controller_1.fetchAndBroadcastOrder)(orderId);
            res.status(200).json({ success: true, message: `Order advanced to state: ${statusField} successfully!` });
        });
    });
};
exports.updatePartnerDeliveryStatus = updatePartnerDeliveryStatus;
/* ======================================================
   📍 UPDATE DELIVERY PARTNER LOCATION
   POST /api/delivery/location
   Body: { lat, lng }
====================================================== */
const updateDeliveryLocation = (req, res) => {
    const partnerId = req.user?.id;
    const { lat, lng } = req.body;
    if (!partnerId || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return res.status(400).json({ success: false, message: "Invalid location data" });
    }
    const sql = `
    INSERT INTO partner_locations (partner_id, partner_type, latitude, longitude)
    VALUES (?, 'delivery', ?, ?)
    ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), updated_at = NOW()
  `;
    db_1.default.query(sql, [partnerId, Number(lat), Number(lng)], (err) => {
        if (err) {
            console.error("❌ updateDeliveryLocation error:", err);
            return res.status(500).json({ success: false, message: "Failed to update location" });
        }
        return res.json({ success: true, message: "Location updated" });
    });
};
exports.updateDeliveryLocation = updateDeliveryLocation;
/* ======================================================
   💰 GET DELIVERY EARNINGS
   GET /api/delivery/earnings
====================================================== */
const getDeliveryEarnings = (req, res) => {
    const partnerId = req.user?.id;
    if (!partnerId) {
        return res.status(401).json({ success: false, message: "Partner not authenticated", data: [] });
    }
    // Retrieve delivery partner wallet and commission data
    db_1.default.query("SELECT wallet_balance, pending_commission, commission_deadline, commission_due_since FROM delivery_partners WHERE id = ?", [partnerId], (profileErr, profileRows) => {
        if (profileErr) {
            console.error("❌ getDeliveryEarnings profile fetch error:", profileErr);
            return res.status(500).json({ success: false, message: "Failed to fetch delivery profile data", data: [] });
        }
        const profile = profileRows && profileRows.length > 0
            ? profileRows[0]
            : { wallet_balance: 0.00, pending_commission: 0.00, commission_deadline: null, commission_due_since: null };
        const sql = `
      SELECT id, \`total amount\` AS total_amount, delivery_fee, tracking_status, \`created at\` AS created_at
      FROM orders
      WHERE delivery_partner_id = ? AND tracking_status = 'DELIVERED'
      ORDER BY \`created at\` DESC
    `;
        db_1.default.query(sql, [partnerId], (err, rows) => {
            if (err) {
                console.error("❌ getDeliveryEarnings database query error:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch earnings", data: [] });
            }
            const all = rows || [];
            // 🚩 BUSINESS LOGIC: 10% Platform Commission
            // Partner gets 90% of the delivery_fee
            const COMMISSION_RATE = 0.9;
            const totalEarnings = all.reduce((s, r) => s + (Number(r.delivery_fee || 20) * COMMISSION_RATE), 0);
            const totalDeliveries = all.length;
            const today = new Date().toDateString();
            const todayOrders = all.filter((r) => new Date(r.created_at).toDateString() === today);
            const todayEarnings = todayOrders.reduce((s, r) => s + (Number(r.delivery_fee || 20) * COMMISSION_RATE), 0);
            // Eliminate dynamic calculations on fetch. Return true database column values directly.
            const responseData = {
                totalEarnings: Number(totalEarnings.toFixed(2)),
                totalDeliveries,
                todayEarnings: Number(todayEarnings.toFixed(2)),
                todayDeliveries: todayOrders.length,
                history: all,
                wallet_balance: profile.wallet_balance,
                pending_commission: parseFloat(profile.pending_commission),
                commission_deadline: profile.commission_deadline,
                commission_due_since: profile.commission_due_since,
                // Direct DB column mapping equivalents
                netEarnings: Number(totalEarnings.toFixed(2)),
                grossFare: all.reduce((s, r) => s + Number(r.delivery_fee || 20), 0),
                pendingCommission: parseFloat(profile.pending_commission),
                walletBalance: profile.wallet_balance,
                totalDeliveriesForDisplay: totalDeliveries
            };
            return res.json({
                success: true,
                data: responseData,
            });
        });
    });
};
exports.getDeliveryEarnings = getDeliveryEarnings;
/* ======================================================
   🟢 TOGGLE ONLINE STATUS
   POST /api/delivery/toggle-online
====================================================== */
const toggleDeliveryOnline = (req, res) => {
    const partnerId = req.user?.id;
    const { is_online } = req.body;
    if (typeof is_online !== 'boolean') {
        return res.status(400).json({ success: false, message: "is_online (boolean) required" });
    }
    db_1.default.query("UPDATE delivery_partners SET `is active` = ? WHERE id = ?", [is_online ? 1 : 0, partnerId], (err) => {
        if (err)
            return res.status(500).json({ success: false, message: "Status update failed" });
        res.json({ success: true, message: `Status updated to ${is_online ? 'online' : 'offline'}` });
    });
};
exports.toggleDeliveryOnline = toggleDeliveryOnline;
/* ======================================================
   🤖 AUTO-ASSIGN NEAREST PARTNER
   Helper function (called during order confirmation)
====================================================== */
const autoAssignNearestPartner = (orderId, userLat, userLng) => {
    const sql = `
    SELECT 
      dp.id,
      (6371 * acos(
        cos(radians(?)) *
        cos(radians(pl.latitude)) *
        cos(radians(pl.longitude) - radians(?)) +
        sin(radians(?)) *
        sin(radians(pl.latitude))
      )) AS distance
    FROM delivery_partners dp
    JOIN partner_locations pl ON pl.partner_id = dp.id AND pl.partner_type = 'delivery'
    WHERE dp.status = 'approved' AND dp.\`is active\` = 1
    HAVING distance < 10
    ORDER BY distance ASC
    LIMIT 1
  `;
    db_1.default.query(sql, [userLat, userLng, userLat], (err, rows) => {
        if (err || !rows?.length) {
            console.log(`⚠️ No online partners found for Order #${orderId}`);
            return;
        }
        const partnerId = rows[0].id;
        const updateSql = "UPDATE orders SET delivery_partner_id = ?, tracking_status = 'ACCEPTED' WHERE id = ?";
        db_1.default.query(updateSql, [partnerId, orderId], (updateErr) => {
            if (!updateErr) {
                console.log(`✅ Order #${orderId} auto-assigned to Partner #${partnerId}`);
                // Notify partner
                (0, notification_utils_1.createAndSendNotification)(partnerId, "DELIVERY", "🛵 New Order Assigned", `New Order #${orderId} has been assigned to you!`, { type: "ORDER_ASSIGNED", orderId: String(orderId), route: "/?app=delivery" });
            }
        });
    });
};
exports.autoAssignNearestPartner = autoAssignNearestPartner;
/* ======================================================
   📍 GET NEARBY GROCERY ORDERS (20 KM RADIUS)
====================================================== */
const getActiveDeliveryOrders = (req, res) => {
    const partnerId = req.user?.id;
    const courierLat = Number(req.query.lat) && !isNaN(Number(req.query.lat)) ? Number(req.query.lat) : 10.938354;
    const courierLng = Number(req.query.lng) && !isNaN(Number(req.query.lng)) ? Number(req.query.lng) : 78.418579;
    // 1. Verify debt metrics directly out of the delivery_partners table ⏱️
    const checkLockoutSql = `SELECT wallet_balance, commission_due_since FROM delivery_partners WHERE id = ?`;
    db_1.default.query(checkLockoutSql, [partnerId], (lockErr, partnerResults) => {
        if (lockErr)
            return res.status(500).json({ success: false, error: lockErr.message });
        if (partnerResults.length > 0) {
            const { wallet_balance, commission_due_since } = partnerResults[0];
            if (wallet_balance < 0 && commission_due_since) {
                const hoursElapsed = (new Date().getTime() - new Date(commission_due_since).getTime()) / (1000 * 60 * 60);
                if (hoursElapsed >= 30) {
                    return res.status(402).json({
                        success: false,
                        isLockedOut: true,
                        message: "Delivery View Locked: Your 30-hour grace period has expired. Please clear your outstanding commission balance to accept new orders.",
                        walletBalance: wallet_balance,
                        hoursElapsed: Math.floor(hoursElapsed)
                    });
                }
            }
        }
        // 2. Fetch standard nearby delivery tickets if the account is clear
        const fetchOrdersSql = `
      SELECT 
        o.id, 
        o.\`user id\`, 
        o.\`total amount\`, 
        o.\`delivery_status\`, 
        o.\`status\`,
        o.\`tracking_status\`,
        o.\`delivery_partner_id\`,
        o.\`address\`, 
        o.\`phone\`, 
        o.\`payment_method\`,
        o.\`created at\`,
        COALESCE(o.delivery_latitude, u.latitude) AS customer_lat,
        COALESCE(o.delivery_longitude, u.longitude) AS customer_lng,
        o.delivery_latitude,
        o.delivery_longitude,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'product_name', COALESCE(oi.product_name, ''),
            'unit_price', COALESCE(oi.unit_price, 0.00),
            'weight', COALESCE(oi.weight, 0.00),
            'total_price', COALESCE(oi.total_price, 0.00),
            'image', COALESCE(oi.image, ''),
            'product_type', COALESCE(p.product_type, 'other')
          )
        ) AS items,
        (
          6371 * acos(
            cos(radians(?)) * cos(radians(COALESCE(o.delivery_latitude, u.latitude))) * cos(radians(COALESCE(o.delivery_longitude, u.longitude)) - radians(?)) + 
            sin(radians(?)) * sin(radians(COALESCE(o.delivery_latitude, u.latitude)))
          )
        ) AS distance
      FROM \`orders\` o
      JOIN \`users\` u ON o.\`user id\` = u.id
      LEFT JOIN \`order_items\` oi ON o.id = oi.order_id
      LEFT JOIN \`products\` p ON oi.product_id = p.id
      WHERE o.status != 'CANCELLED' AND (o.\`delivery_status\` IS NULL OR o.\`delivery_status\` != 'CANCELLED') AND (
        (o.\`status\` IN ('ACCEPTED', 'CONFIRMED') AND o.delivery_partner_id IS NULL AND (o.\`delivery_status\` IS NULL OR o.\`delivery_status\` NOT IN ('OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')))
        OR (o.delivery_partner_id = ? AND (o.\`delivery_status\` IS NULL OR o.\`delivery_status\` NOT IN ('DELIVERED', 'CANCELLED')))
      )
        AND NOT EXISTS (
          SELECT 1 FROM \`order_items\` oi2 
          WHERE oi2.order_id = o.id 
            AND (LOWER(oi2.category) = 'garlands' OR LOWER(oi2.product_name) LIKE '%garland%')
        )
      GROUP BY o.id
      ORDER BY o.id DESC
    `;
        db_1.default.query(fetchOrdersSql, [courierLat, courierLng, courierLat, partnerId], (err, results) => {
            if (err) {
                console.error("❌ Database query execution crash inside delivery controller:", err.message);
                return res.status(500).json({ success: false, error: err.message });
            }
            const formattedData = results.map((row) => {
                let parsedItems = [];
                try {
                    parsedItems = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
                }
                catch (parseError) {
                    console.error(`⚠️ Failed parsing items for Order #${row.id}:`, parseError);
                }
                return {
                    ...row,
                    items: parsedItems || []
                };
            });
            return res.status(200).json({ success: true, data: formattedData });
        });
    });
};
exports.getActiveDeliveryOrders = getActiveDeliveryOrders;
/* ======================================================
   🔐 VERIFY DELIVERY OTP (For Online Orders)
   POST /api/delivery/verify-otp
   Body: { orderId, otp }
====================================================== */
const verifyDeliveryOtp = (req, res) => {
    const { orderId, otp } = req.body;
    const partnerId = req.user?.id;
    if (!orderId || !otp) {
        return res.status(400).json({ success: false, message: "Order ID and OTP are required" });
    }
    if (String(otp).length !== 4) {
        return res.status(400).json({ success: false, message: "OTP must be exactly 4 digits" });
    }
    db_1.default.query("SELECT status, delivery_otp, delivery_status, payment_method, `user id`, delivery_partner_id, delivery_fee FROM orders WHERE id = ? AND delivery_partner_id = ? LIMIT 1", [orderId, partnerId], (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Database error" });
        if (rows.length === 0)
            return res.status(404).json({ success: false, message: "Order not found or assigned to another partner." });
        const order = rows[0];
        if (order.status === 'CANCELLED') {
            return res.status(409).json({ success: false, message: "This order has been cancelled by the customer." });
        }
        const currentStatus = (order.delivery_status || "").toUpperCase();
        if (currentStatus !== "OUT_FOR_DELIVERY") {
            return res.status(400).json({
                success: false,
                message: `Order is in ${currentStatus} state. OTP verification only allowed for OUT_FOR_DELIVERY orders.`,
            });
        }
        const storedOtp = String(order.delivery_otp || "").trim();
        const submittedOtp = String(otp).trim();
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: "No OTP was generated for this order." });
        }
        if (storedOtp !== submittedOtp) {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please verify with the customer." });
        }
        // 🔐 OTP is correct. Complete the delivery!
        const updateSql = `
        UPDATE orders 
        SET delivery_status = 'DELIVERED', 
            status = 'DELIVERED', 
            tracking_status = 'DELIVERED', 
            \`delivered at\` = NOW() 
        WHERE id = ?
      `;
        db_1.default.query(updateSql, [orderId], (updateErr) => {
            if (updateErr) {
                console.error("❌ Failed to finalize order via OTP:", updateErr);
                return res.status(500).json({ success: false, message: "Failed to verify OTP and complete order" });
            }
            const logMessage = `🎉 Order #${orderId} has been securely delivered via OTP verification! Thank you for shopping with VillageSmart.`;
            const notifySql = "INSERT INTO `notifications` (`user id`, message, `is read`) VALUES (?, ?, 0)";
            db_1.default.query(notifySql, [order["user id"], logMessage], (nErr) => {
                if (nErr)
                    console.error("❌ Notification layer failure:", nErr);
            });
            const deliveryPartnerId = order.delivery_partner_id;
            const deliveryFee = parseFloat(order.delivery_fee || 20);
            const commissionOwed = deliveryFee * 0.10;
            if (deliveryPartnerId && commissionOwed > 0) {
                (0, commissionGuard_1.triggerCommissionWindow)(deliveryPartnerId, 'delivery', commissionOwed);
            }
            // 💰 Register COD collection if applicable
            Promise.resolve().then(() => __importStar(require("../utils/cod.utils"))).then(m => m.processCodCollectionIfApplicable(orderId));
            return res.json({
                success: true,
                message: `OTP Verified! Order #${orderId} marked as DELIVERED.`,
                data: { status: "DELIVERED" },
            });
        });
    });
};
exports.verifyDeliveryOtp = verifyDeliveryOtp;
