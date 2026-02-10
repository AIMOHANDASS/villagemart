"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCancelOrder = exports.adminCancelOrder = exports.updateOrderStatus = exports.confirmOrder = exports.getUserOrders = exports.getAllOrders = exports.createOrder = void 0;
const db_1 = __importDefault(require("../db"));
const mailer_1 = require("../utils/mailer");
const nodemailer_1 = __importDefault(require("nodemailer"));
/* ======================================================
   📧 EMAIL TRANSPORT (Admin Alert)
====================================================== */
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
/* ======================================================
   🔁 HELPER - UPDATE ORDER STATUS
====================================================== */
const updateStatus = (orderId, status, tracking, timeField) => {
    let sql = `UPDATE orders SET status=?, tracking_status=?`;
    const params = [status, tracking];
    if (timeField) {
        sql += `, ${timeField}=NOW()`;
    }
    sql += ` WHERE id=?`;
    params.push(orderId);
    db_1.default.query(sql, params, (err) => {
        if (err) {
            console.error("❌ updateStatus error:", err);
        }
    });
};
/* ======================================================
   🛒 CREATE ORDER
====================================================== */
const createOrder = (req, res) => {
    const { userId, items, address, phone, paymentMethod } = req.body;
    if (!userId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "❌ Invalid order data" });
    }
    // ✅ Calculate totals safely from backend
    const subtotal = items.reduce((sum, i) => sum + Number(i.total_price || 0), 0);
    const deliveryFee = subtotal >= 500 ? 0 : 5;
    const grandTotal = subtotal + deliveryFee;
    const orderSql = `
    INSERT INTO orders 
    (user_id, total_amount, delivery_fee, status, tracking_status, address, phone, payment_method)
    VALUES (?, ?, ?, 'PENDING', 'PENDING', ?, ?, ?)
  `;
    db_1.default.query(orderSql, [
        Number(userId),
        grandTotal,
        deliveryFee,
        address || "",
        phone || "",
        paymentMethod || "cod",
    ], (err, result) => {
        if (err) {
            console.error("❌ Create order error:", err);
            return res.status(500).json({ message: "Order creation failed" });
        }
        const orderId = result.insertId;
        const itemSql = `
        INSERT INTO order_items
        (order_id, product_id, product_name, unit_price, weight, total_price, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
        items.forEach((item) => {
            db_1.default.query(itemSql, [
                orderId,
                item.product_id,
                item.product_name,
                Number(item.unit_price),
                Number(item.weight),
                Number(item.total_price),
                item.image || "",
            ]);
        });
        res.json({ success: true, orderId });
    });
};
exports.createOrder = createOrder;
/* ======================================================
   📦 GET ALL ORDERS (ADMIN)
====================================================== */
const getAllOrders = (req, res) => {
    const sql = `
    SELECT 
      o.id AS orderId,
      u.username,
      u.email,
      o.total_amount,
      o.delivery_fee,
      o.status,
      o.tracking_status,
      o.cancel_reason,
      o.created_at,

      oi.id AS item_id,
      oi.product_name,
      oi.unit_price,
      oi.weight,
      oi.total_price,
      oi.image

    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ORDER BY o.created_at DESC
  `;
    db_1.default.query(sql, (err, rows) => {
        if (err) {
            console.error("❌ Fetch orders error:", err);
            return res.status(500).json([]);
        }
        const map = new Map();
        rows.forEach((row) => {
            if (!map.has(row.orderId)) {
                map.set(row.orderId, {
                    orderId: row.orderId,
                    username: row.username,
                    email: row.email,
                    total_amount: Number(row.total_amount),
                    delivery_fee: Number(row.delivery_fee),
                    status: row.status,
                    tracking_status: row.tracking_status,
                    cancel_reason: row.cancel_reason,
                    created_at: row.created_at,
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
                });
            }
        });
        res.json([...map.values()]);
    });
};
exports.getAllOrders = getAllOrders;
/* ======================================================
   👤 GET USER ORDERS
====================================================== */
const getUserOrders = (req, res) => {
    const { userId } = req.params;
    const sql = `
    SELECT 
      o.id AS orderId,
      o.total_amount,
      o.delivery_fee,
      o.status,
      o.tracking_status,
      o.cancel_reason,
      o.created_at,

      oi.id AS item_id,
      oi.product_name,
      oi.unit_price,
      oi.weight,
      oi.total_price,
      oi.image

    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ?
    ORDER BY o.id DESC
  `;
    db_1.default.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error("❌ Fetch user orders error:", err);
            return res.status(500).json([]);
        }
        const map = new Map();
        rows.forEach((row) => {
            if (!map.has(row.orderId)) {
                map.set(row.orderId, {
                    orderId: row.orderId,
                    total_amount: Number(row.total_amount),
                    delivery_fee: Number(row.delivery_fee),
                    status: row.status,
                    tracking_status: row.tracking_status,
                    cancel_reason: row.cancel_reason,
                    created_at: row.created_at,
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
                });
            }
        });
        res.json([...map.values()]);
    });
};
exports.getUserOrders = getUserOrders;
/* ======================================================
   ✅ ADMIN CONFIRM ORDER
====================================================== */
const confirmOrder = (req, res) => {
    const orderId = Number(req.params.orderId);
    const sql = `
    SELECT 
      o.id,
      o.user_id,
      o.total_amount,
      o.delivery_fee,
      u.email,
      u.username,

      oi.id AS item_id,
      oi.product_name,
      oi.unit_price,
      oi.weight,
      oi.total_price,
      oi.image

    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = ?
  `;
    db_1.default.query(sql, [orderId], async (err, rows) => {
        if (err || rows.length === 0) {
            console.error("❌ Confirm fetch error:", err);
            return res.status(404).json({ message: "Order not found" });
        }
        const items = rows
            .filter((r) => r.item_id)
            .map((r) => ({
            product_name: r.product_name,
            unit_price: Number(r.unit_price),
            weight: Number(r.weight),
            total_price: Number(r.total_price),
            image: r.image,
        }));
        const order = rows[0];
        updateStatus(orderId, "CONFIRMED", "CONFIRMED");
        db_1.default.query("INSERT INTO notifications (user_id,message) VALUES (?,?)", [order.user_id, `✅ Order #${orderId} confirmed`]);
        try {
            await (0, mailer_1.sendOrderConfirmMail)(order.email, order.username, orderId, Number(order.total_amount), Number(order.delivery_fee || 0), items);
            res.json({ success: true });
        }
        catch (mailErr) {
            console.error("❌ Mail failed:", mailErr);
            res.status(500).json({ message: "Mail failed" });
        }
    });
};
exports.confirmOrder = confirmOrder;
/* ======================================================
   🔄 ADMIN UPDATE STATUS
====================================================== */
const updateOrderStatus = (req, res) => {
    const orderId = Number(req.params.orderId);
    const { status } = req.body;
    if (!orderId || !status)
        return res.status(400).json({ message: "Invalid data" });
    let timeField;
    if (status === "PICKED")
        timeField = "picked_at";
    if (status === "OUT_FOR_DELIVERY")
        timeField = "out_for_delivery_at";
    if (status === "DELIVERED")
        timeField = "delivered_at";
    updateStatus(orderId, status, status, timeField);
    db_1.default.query("INSERT INTO notifications (user_id,message) SELECT user_id, ? FROM orders WHERE id=?", [`📦 Order #${orderId} updated → ${status}`, orderId]);
    res.json({ success: true });
};
exports.updateOrderStatus = updateOrderStatus;
/* ======================================================
   ❌ ADMIN CANCEL ORDER
====================================================== */
const adminCancelOrder = (req, res) => {
    const orderId = Number(req.params.orderId);
    const { reason } = req.body;
    updateStatus(orderId, "CANCELLED", "CANCELLED");
    db_1.default.query("UPDATE orders SET cancel_reason=? WHERE id=?", [
        reason,
        orderId,
    ]);
    db_1.default.query("INSERT INTO notifications (user_id,message) SELECT user_id, ? FROM orders WHERE id=?", [`❌ Order #${orderId} cancelled: ${reason}`, orderId]);
    res.json({ success: true });
};
exports.adminCancelOrder = adminCancelOrder;
/* ======================================================
   👤 USER CANCEL → ADMIN EMAIL ALERT
====================================================== */
const userCancelOrder = (req, res) => {
    const orderId = Number(req.params.orderId);
    const { reason } = req.body;
    updateStatus(orderId, "CANCELLED", "CANCELLED");
    db_1.default.query("UPDATE orders SET cancel_reason=? WHERE id=?", [
        reason,
        orderId,
    ]);
    const adminMessage = `⚠ User cancelled order #${orderId}. Reason: ${reason}`;
    db_1.default.query("INSERT INTO notifications (user_id,message) VALUES (?,?)", [
        1,
        adminMessage,
    ]);
    transporter.sendMail({
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject: `Order Cancelled (#${orderId})`,
        html: `<p>${adminMessage}</p>`,
    });
    res.json({ success: true });
};
exports.userCancelOrder = userCancelOrder;
