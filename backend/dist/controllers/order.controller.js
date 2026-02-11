"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCancelOrder = exports.adminCancelOrder = exports.updateOrderStatus = exports.confirmOrder = exports.getUserOrders = exports.sendGarlandReminder = exports.getGarlandOrders = exports.getAllOrders = exports.createOrder = exports.getAdminPanelData = void 0;
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
   🗂 GARLAND PREORDER META TABLE
====================================================== */
db_1.default.query(`
    CREATE TABLE IF NOT EXISTS garland_order_schedule (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      delivery_at DATETIME NOT NULL,
      reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
      last_reminder_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_garland_order_id (order_id),
      INDEX idx_garland_delivery_at (delivery_at)
    )
  `, (err) => {
    if (err) {
        console.error("❌ Could not ensure garland_order_schedule table:", err);
    }
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
const normalizeStatus = (value) => (value || "").toUpperCase();
const isGarlandItem = (item) => {
    const category = String(item?.category || "").toLowerCase();
    const name = String(item?.product_name || "").toLowerCase();
    return category === "garlands" || name.includes("garland");
};
const getValidDeliveryDate = (value) => {
    if (!value)
        return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    return date;
};
const isAtLeast24HoursAhead = (date) => {
    const diffHours = (date.getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours >= 24;
};
const getCurrentOrderStatus = (orderId, cb) => {
    db_1.default.query("SELECT tracking_status, user_id FROM orders WHERE id=? LIMIT 1", [orderId], (err, rows) => {
        if (err)
            return cb(err);
        if (!rows || rows.length === 0)
            return cb(new Error("Order not found"));
        cb(null, normalizeStatus(rows[0].tracking_status), Number(rows[0].user_id));
    });
};
const mapOrders = (rows) => {
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
                picked_at: row.picked_at,
                out_for_delivery_at: row.out_for_delivery_at,
                delivered_at: row.delivered_at,
                garland_delivery_at: row.garland_delivery_at,
                garland_reminder_sent: Number(row.garland_reminder_sent || 0),
                garland_last_reminder_at: row.garland_last_reminder_at,
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
    return [...map.values()];
};
const orderQuery = `
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
    o.picked_at,
    o.out_for_delivery_at,
    o.delivered_at,

    oi.id AS item_id,
    oi.product_name,
    oi.unit_price,
    oi.weight,
    oi.total_price,
    oi.image,

    gs.garland_delivery_at,
    gs.garland_reminder_sent,
    gs.garland_last_reminder_at

  FROM orders o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN (
    SELECT
      order_id,
      MIN(delivery_at) AS garland_delivery_at,
      MAX(reminder_sent) AS garland_reminder_sent,
      MAX(last_reminder_at) AS garland_last_reminder_at
    FROM garland_order_schedule
    GROUP BY order_id
  ) gs ON gs.order_id = o.id
`;
const queryRows = (sql, params = []) => new Promise((resolve, reject) => {
    db_1.default.query(sql, params, (err, rows) => {
        if (err)
            return reject(err);
        resolve((rows || []));
    });
});
const getAdminPanelData = async (req, res) => {
    try {
        const ordersSql = `${orderQuery} ORDER BY o.created_at DESC`;
        const garlandSql = `
      ${orderQuery}
      WHERE EXISTS (
        SELECT 1 FROM garland_order_schedule gs2
        WHERE gs2.order_id = o.id
      )
      OR EXISTS (
        SELECT 1 FROM order_items og
        WHERE og.order_id = o.id
        AND LOWER(og.product_name) LIKE '%garland%'
      )
      ORDER BY o.created_at DESC
    `;
        const transportSql = `
      SELECT
        tb.id,
        tb.user_id,
        tb.customer_name,
        tb.customer_phone,
        tb.from_address,
        tb.from_lat,
        tb.from_lng,
        tb.to_address,
        tb.to_lat,
        tb.to_lng,
        tb.distance_km,
        tb.charge_amount,
        tb.status,
        tb.notes,
        tb.created_at,
        u.username,
        u.email
      FROM transport_bookings tb
      JOIN users u ON u.id = tb.user_id
      ORDER BY tb.created_at DESC
    `;
        const partyHallSql = `
      SELECT
        ph.id,
        ph.user_id,
        ph.customer_name,
        ph.customer_phone,
        ph.event_date,
        ph.start_time,
        ph.end_time,
        ph.person_count,
        ph.snacks_count,
        ph.water_count,
        ph.cake_count,
        ph.add_ons_json,
        ph.notes,
        ph.base_charge,
        ph.add_on_charge,
        ph.total_charge,
        ph.status,
        ph.created_at,
        u.username,
        u.email
      FROM party_hall_bookings ph
      JOIN users u ON u.id = ph.user_id
      ORDER BY ph.event_date DESC, ph.start_time DESC
    `;
        const [orderRows, garlandRows, transportRows, partyRows] = await Promise.all([
            queryRows(ordersSql),
            queryRows(garlandSql),
            queryRows(transportSql).catch(() => []),
            queryRows(partyHallSql).catch(() => []),
        ]);
        return res.json({
            orders: mapOrders(orderRows),
            garlandOrders: mapOrders(garlandRows),
            transportBookings: transportRows,
            partyHallBookings: partyRows,
        });
    }
    catch (err) {
        console.error("❌ getAdminPanelData error:", err);
        return res.status(500).json({
            message: "Failed to load admin panel data",
            orders: [],
            garlandOrders: [],
            transportBookings: [],
            partyHallBookings: [],
        });
    }
};
exports.getAdminPanelData = getAdminPanelData;
/* ======================================================
   🛒 CREATE ORDER
====================================================== */
const createOrder = (req, res) => {
    const { userId, items, address, phone, paymentMethod } = req.body;
    if (!userId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "❌ Invalid order data" });
    }
    const garlandItems = items.filter((item) => isGarlandItem(item));
    for (const garlandItem of garlandItems) {
        const deliveryDate = getValidDeliveryDate(garlandItem.deliveryDate || garlandItem.delivery_at);
        if (!deliveryDate) {
            return res.status(400).json({
                message: "Garland orders require a valid delivery date & time",
            });
        }
        if (!isAtLeast24HoursAhead(deliveryDate)) {
            return res.status(400).json({
                message: "Garland orders must be placed at least 24 hours in advance",
            });
        }
    }
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
            if (isGarlandItem(item)) {
                const deliveryDate = getValidDeliveryDate(item.deliveryDate || item.delivery_at);
                if (deliveryDate) {
                    db_1.default.query(`INSERT INTO garland_order_schedule (order_id, delivery_at)
               VALUES (?, ?)`, [orderId, deliveryDate]);
                }
            }
        });
        res.json({ success: true, orderId });
    });
};
exports.createOrder = createOrder;
/* ======================================================
   📦 GET ALL ORDERS (ADMIN)
====================================================== */
const getAllOrders = (req, res) => {
    const sql = `${orderQuery} ORDER BY o.created_at DESC`;
    db_1.default.query(sql, (err, rows) => {
        if (err) {
            console.error("❌ Fetch orders error:", err);
            return res.status(500).json([]);
        }
        res.json(mapOrders(rows));
    });
};
exports.getAllOrders = getAllOrders;
/* ======================================================
   🌸 GET GARLAND ORDERS (ADMIN)
====================================================== */
const getGarlandOrders = (req, res) => {
    const sql = `
    ${orderQuery}
    WHERE EXISTS (
      SELECT 1 FROM garland_order_schedule gs2
      WHERE gs2.order_id = o.id
    )
    OR EXISTS (
      SELECT 1 FROM order_items og
      WHERE og.order_id = o.id
      AND LOWER(og.product_name) LIKE '%garland%'
    )
    ORDER BY o.created_at DESC
  `;
    db_1.default.query(sql, (err, rows) => {
        if (err) {
            console.error("❌ Fetch garland orders error:", err);
            return res.status(500).json([]);
        }
        res.json(mapOrders(rows));
    });
};
exports.getGarlandOrders = getGarlandOrders;
/* ======================================================
   ⏰ ADMIN SEND GARLAND REMINDER
====================================================== */
const sendGarlandReminder = (req, res) => {
    const orderId = Number(req.params.orderId);
    if (!orderId) {
        return res.status(400).json({ message: "Invalid order id" });
    }
    const sql = `
    SELECT
      o.id AS order_id,
      o.user_id,
      u.username,
      u.email,
      gs.delivery_at,
      gs.reminder_sent,
      gs.last_reminder_at
    FROM orders o
    JOIN users u ON u.id = o.user_id
    JOIN garland_order_schedule gs ON gs.order_id = o.id
    WHERE o.id = ?
    ORDER BY gs.delivery_at ASC
    LIMIT 1
  `;
    db_1.default.query(sql, [orderId], (err, rows) => {
        if (err) {
            console.error("❌ Garland reminder lookup error:", err);
            return res.status(500).json({ message: "Reminder failed" });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: "Garland schedule not found" });
        }
        const row = rows[0];
        const deliveryDate = new Date(row.delivery_at);
        if (Number.isNaN(deliveryDate.getTime())) {
            return res.status(400).json({ message: "Invalid schedule date" });
        }
        if (deliveryDate.getTime() <= Date.now()) {
            return res.status(409).json({
                message: "Scheduled garland date is already passed",
            });
        }
        const message = `🌸 Reminder: Your garland order #${orderId} is scheduled for ${deliveryDate.toLocaleString("en-IN")}`;
        db_1.default.query("INSERT INTO notifications (user_id,message) VALUES (?,?)", [
            row.user_id,
            message,
        ]);
        const adminMail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        Promise.all([
            row.email
                ? transporter.sendMail({
                    to: row.email,
                    subject: `Garland Order Reminder (#${orderId})`,
                    html: `<p>Hi ${row.username},</p><p>${message}</p>`,
                })
                : Promise.resolve(),
            adminMail
                ? transporter.sendMail({
                    to: adminMail,
                    subject: `Admin Copy: Garland Reminder Sent (#${orderId})`,
                    html: `<p>Reminder sent to user <b>${row.username}</b> for order <b>#${orderId}</b>.</p><p>Schedule: ${deliveryDate.toLocaleString("en-IN")}</p>`,
                })
                : Promise.resolve(),
        ])
            .catch((mailErr) => {
            console.error("❌ Garland reminder mail error:", mailErr);
        })
            .finally(() => {
            db_1.default.query(`UPDATE garland_order_schedule
           SET reminder_sent = 1, last_reminder_at = NOW()
           WHERE order_id = ?`, [orderId]);
            return res.json({ success: true, message: "Reminder sent" });
        });
    });
};
exports.sendGarlandReminder = sendGarlandReminder;
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
      o.picked_at,
      o.out_for_delivery_at,
      o.delivered_at,

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
    if (!orderId)
        return res.status(400).json({ message: "Invalid order id" });
    getCurrentOrderStatus(orderId, (statusErr, currentStatus) => {
        if (statusErr) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (currentStatus !== "PENDING") {
            return res.status(409).json({
                message: `Order already processed (${currentStatus}). Confirm allowed only once from PENDING.`,
            });
        }
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
            db_1.default.query("INSERT INTO notifications (user_id,message) VALUES (?,?)", [
                order.user_id,
                `✅ Order #${orderId} confirmed`,
            ]);
            try {
                await (0, mailer_1.sendOrderConfirmMail)(order.email, order.username, orderId, Number(order.total_amount), Number(order.delivery_fee || 0), items);
                return res.json({ success: true });
            }
            catch (mailErr) {
                console.error("❌ Mail failed:", mailErr);
                return res.status(500).json({ message: "Mail failed" });
            }
        });
    });
};
exports.confirmOrder = confirmOrder;
/* ======================================================
   🔄 ADMIN UPDATE STATUS
====================================================== */
const updateOrderStatus = (req, res) => {
    const orderId = Number(req.params.orderId);
    const requestedStatus = normalizeStatus(req.body?.status);
    if (!orderId || !requestedStatus) {
        return res.status(400).json({ message: "Invalid data" });
    }
    const nextStatusMap = {
        CONFIRMED: "PICKED",
        PICKED: "OUT_FOR_DELIVERY",
        OUT_FOR_DELIVERY: "DELIVERED",
    };
    getCurrentOrderStatus(orderId, (statusErr, currentStatus) => {
        if (statusErr || !currentStatus) {
            return res.status(404).json({ message: "Order not found" });
        }
        const expectedNext = nextStatusMap[currentStatus];
        if (!expectedNext) {
            return res.status(409).json({
                message: `Cannot update status from ${currentStatus}`,
            });
        }
        if (requestedStatus !== expectedNext) {
            return res.status(409).json({
                message: `Invalid transition. Allowed next status is ${expectedNext}.`,
            });
        }
        let timeField;
        if (requestedStatus === "PICKED")
            timeField = "picked_at";
        if (requestedStatus === "OUT_FOR_DELIVERY")
            timeField = "out_for_delivery_at";
        if (requestedStatus === "DELIVERED")
            timeField = "delivered_at";
        updateStatus(orderId, requestedStatus, requestedStatus, timeField);
        db_1.default.query("INSERT INTO notifications (user_id,message) SELECT user_id, ? FROM orders WHERE id=?", [`📦 Order #${orderId} updated → ${requestedStatus}`, orderId]);
        return res.json({ success: true });
    });
};
exports.updateOrderStatus = updateOrderStatus;
/* ======================================================
   ❌ ADMIN CANCEL ORDER
====================================================== */
const adminCancelOrder = (req, res) => {
    const orderId = Number(req.params.orderId);
    const { reason } = req.body;
    if (!orderId || !reason) {
        return res.status(400).json({ message: "Invalid cancel request" });
    }
    getCurrentOrderStatus(orderId, (statusErr, currentStatus) => {
        if (statusErr || !currentStatus) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (["CANCELLED", "DELIVERED"].includes(currentStatus)) {
            return res.status(409).json({
                message: `Order cannot be cancelled from ${currentStatus}`,
            });
        }
        updateStatus(orderId, "CANCELLED", "CANCELLED");
        db_1.default.query("UPDATE orders SET cancel_reason=? WHERE id=?", [reason, orderId]);
        db_1.default.query("INSERT INTO notifications (user_id,message) SELECT user_id, ? FROM orders WHERE id=?", [`❌ Order #${orderId} cancelled: ${reason}`, orderId]);
        return res.json({ success: true });
    });
};
exports.adminCancelOrder = adminCancelOrder;
/* ======================================================
   👤 USER CANCEL → ADMIN EMAIL ALERT
====================================================== */
const userCancelOrder = (req, res) => {
    const orderId = Number(req.params.orderId);
    const { reason } = req.body;
    if (!orderId || !reason) {
        return res.status(400).json({ message: "Invalid cancel request" });
    }
    getCurrentOrderStatus(orderId, (statusErr, currentStatus) => {
        if (statusErr || !currentStatus) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (["CANCELLED", "DELIVERED"].includes(currentStatus)) {
            return res.status(409).json({
                message: `Order cannot be cancelled from ${currentStatus}`,
            });
        }
        updateStatus(orderId, "CANCELLED", "CANCELLED");
        db_1.default.query("UPDATE orders SET cancel_reason=? WHERE id=?", [reason, orderId]);
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
        return res.json({ success: true });
    });
};
exports.userCancelOrder = userCancelOrder;
