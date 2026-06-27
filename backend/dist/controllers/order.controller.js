"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCancelOrder = exports.adminCancelOrder = exports.updateOrderStatusUnified = exports.updateOrderStatus = exports.confirmOrder = exports.getUserOrders = exports.sendGarlandReminder = exports.getGarlandOrders = exports.getAllOrders = exports.createOrder = exports.getAdminPanelData = void 0;
const db_1 = __importDefault(require("../db"));
const mailer_1 = require("../utils/mailer");
const nodemailer_1 = __importDefault(require("nodemailer"));
const delivery_controller_1 = require("./delivery.controller");
/* ======================================================
    📧 EMAIL TRANSPORT (Admin Alert)
====================================================== */
const transporter = nodemailer_1.default.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for port 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        // Changed from EMAIL_PASS to EMAIL_PASSWORD to match your .env file
        pass: process.env.EMAIL_PASSWORD,
    },
});
/* ======================================================
   🗂 GARLAND PREORDER META TABLE
====================================================== */
db_1.default.query(`
    CREATE TABLE IF NOT EXISTS garland_order_schedule (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`order id\` INT NOT NULL,
      delivery_at DATETIME NOT NULL,
      \`reminder sent\` TINYINT(1) NOT NULL DEFAULT 0,
      \`last reminder at\` DATETIME NULL,
      \`created at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_garland_order_id (\`order id\`),
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
        // timeField values already use backticks when needed
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
   🔔 REUSABLE NOTIFICATION BUILDER HELPER
   Safely writes alert messages into our verified
   notifications table schema using backtick-escaped columns.
====================================================== */
const createOrderNotification = (userId, message) => {
    const sql = "INSERT INTO notifications (`user id`, message, `is read`) VALUES (?, ?, 0)";
    db_1.default.query(sql, [userId, message], (err) => {
        if (err)
            console.error("❌ Failed to log background action notification:", err);
        else
            console.log("🔔 Background action notification successfully broadcasted locally!");
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
    db_1.default.query("SELECT tracking_status, `user id` FROM orders WHERE id=? LIMIT 1", [orderId], (err, rows) => {
        if (err)
            return cb(err);
        if (!rows || rows.length === 0)
            return cb(new Error("Order not found"));
        cb(null, normalizeStatus(rows[0].tracking_status), Number(rows[0]["user id"]));
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
                payment_method: row.payment_method || "cod",
                tracking_status: row.tracking_status,
                delivery_status: row.delivery_status,
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
    o.\`total amount\` AS total_amount,
    o.delivery_fee,
    o.status,
    o.payment_method,
    COALESCE(o.delivery_status, o.tracking_status) AS tracking_status,
    o.delivery_status,
    o.delivery_partner_id,
    o.\`cancel reason\` AS cancel_reason,
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

    gs.garland_delivery_at,
    gs.garland_reminder_sent,
    gs.garland_last_reminder_at

  FROM orders o
  JOIN users u ON u.id = o.\`user id\`
  LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
  LEFT JOIN (
    SELECT
      \`order id\` AS order_id,
      MIN(delivery_at) AS garland_delivery_at,
      MAX(\`reminder sent\`) AS garland_reminder_sent,
      MAX(\`last reminder at\`) AS garland_last_reminder_at
    FROM garland_order_schedule
    GROUP BY \`order id\`
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
        const ordersSql = `${orderQuery} ORDER BY o.\`created at\` DESC`;
        const garlandSql = `
      ${orderQuery}
      WHERE EXISTS (
        SELECT 1 FROM garland_order_schedule gs2
        WHERE gs2.\`order id\` = o.id
      )
      OR EXISTS (
        SELECT 1 FROM \`order_items\` og
        WHERE og.order_id = o.id
        AND LOWER(og.product_name) LIKE '%garland%'
      )
      ORDER BY o.\`created at\` DESC
    `;
        const transportSql = `
      SELECT
        tb.id,
        tb.\`user id\` AS user_id,
        COALESCE(u.name, tb.customer_name) AS customer_name,
        COALESCE(u.phone, tb.customer_phone) AS customer_phone,
        tb.from_address,
        tb.\`from lat\` AS from_lat,
        tb.from_Ing AS from_lng,
        tb.\`to address\` AS to_address,
        tb.\`to lat\` AS to_lat,
        tb.\`to Ing\` AS to_lng,
        tb.\`distance km\` AS distance_km,
        tb.charge_amount,
        tb.vehicle_type,
        tb.status,
        tb.notes,
        tb.\`created at\` AS created_at,
        u.username,
        u.email
      FROM transport_bookings tb
      LEFT JOIN users u ON u.id = tb.\`user id\`
      ORDER BY tb.id DESC
    `;
        const partyHallSql = `
      SELECT
        ph.id,
        ph.\`user id\` AS user_id,
        ph.\`customer name\` AS customer_name,
        ph.customer_phone,
        ph.\`event date\` AS event_date,
        ph.\`start time\` AS start_time,
        ph.\`end time\` AS end_time,
        ph.person_count,
        ph.\`snacks count\` AS snacks_count,
        ph.water_count,
        ph.\`cake count\` AS cake_count,
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
      JOIN users u ON u.id = ph.\`user id\`
      ORDER BY ph.\`event date\` DESC, ph.\`start time\` DESC
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
const createOrder = async (req, res) => {
    const { userId, items, address, phone, paymentMethod, latitude, longitude } = req.body;
    if (!userId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "❌ Invalid order data" });
    }
    try {
        // 🚀 ATOMIC VALIDATION LOOP: Cross-references product tables before completing requests
        for (const item of items) {
            const [productRows] = await db_1.default.promise().query("SELECT id, E_name, inStock FROM products WHERE id = ?", [item.product_id || item.id]);
            if (!productRows || productRows.length === 0) {
                return res.status(404).json({ success: false, message: "Product missing." });
            }
            const availableStock = Number(productRows[0].inStock || 0);
            const requestedQuantity = Number(item.quantity || item.qty || item.weight || 1);
            // 🎯 STRICT BACKEND GATE: Rejects over-ordered pipelines instantly
            if (requestedQuantity > availableStock) {
                return res.status(400).json({
                    success: false,
                    message: `Order Failed! Item '${productRows[0].E_name}' only has ${availableStock} units left, but you requested ${requestedQuantity}. Please adjust your cart.`
                });
            }
        }
    }
    catch (validationErr) {
        console.error("❌ Stock validation error:", validationErr);
        return res.status(500).json({ success: false, message: "Failed to validate order stock." });
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
    const subtotal = Number(req.body.subtotal) || items.reduce((sum, i) => sum + Number(i.total_price || 0), 0);
    // ✅ FIXED: Use frontend delivery fee and total to properly include GST!
    const deliveryFee = req.body.deliveryFee !== undefined ? Number(req.body.deliveryFee) : (subtotal >= 500 ? 0 : 5);
    const grandTotal = req.body.total ? Number(req.body.total) : (subtotal + deliveryFee);
    const orderSql = `
    INSERT INTO orders 
    (\`user id\`, \`total amount\`, delivery_fee, status, tracking_status, address, phone, payment_method, delivery_latitude, delivery_longitude)
    VALUES (?, ?, ?, 'PENDING', 'PENDING', ?, ?, ?, ?, ?)
  `;
    db_1.default.query(orderSql, [
        Number(userId),
        grandTotal,
        deliveryFee,
        address || "",
        phone || "",
        paymentMethod || "cod",
        latitude || null,
        longitude || null,
    ], async (err, result) => {
        if (err) {
            console.error("❌ Create order error:", err);
            return res.status(500).json({ message: "Order creation failed" });
        }
        const orderId = result.insertId;
        // ✅ Notify customer: order placed
        createOrderNotification(Number(userId), `🛒 Order #${orderId} placed successfully! Total: ₹${grandTotal.toFixed(2)}`);
        // ✅ AUTO-ASSIGNMENT LOGIC: Prioritize explicit checkout coordinates
        if (latitude && longitude) {
            (0, delivery_controller_1.autoAssignNearestPartner)(orderId, Number(latitude), Number(longitude));
        }
        else {
            db_1.default.query("SELECT latitude, longitude FROM users WHERE id = ?", [userId], (locErr, locRows) => {
                if (!locErr && locRows.length > 0) {
                    const { latitude: uLat, longitude: uLng } = locRows[0];
                    if (uLat && uLng) {
                        (0, delivery_controller_1.autoAssignNearestPartner)(orderId, Number(uLat), Number(uLng));
                    }
                }
            });
        }
        const itemSql = `
        INSERT INTO \`order_items\`
        (order_id, product_id, product_name, unit_price, weight, total_price, image, category, deliveryDate, slot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
        items.forEach((item) => {
            const rawWeight = Number(item.weight) || 1;
            db_1.default.query(itemSql, [
                orderId,
                item.product_id,
                item.product_name,
                Number(item.unit_price),
                rawWeight,
                Number(item.total_price),
                item.image || "",
                item.category || null,
                item.deliveryDate || null,
                item.slot || null,
            ]);
            if (isGarlandItem(item)) {
                const deliveryDate = getValidDeliveryDate(item.deliveryDate || item.delivery_at);
                if (deliveryDate) {
                    db_1.default.query(`INSERT INTO garland_order_schedule (\`order id\`, delivery_at)
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
    const sql = `${orderQuery} ORDER BY o.\`created at\` DESC`;
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
      WHERE gs2.\`order id\` = o.id
    )
    OR EXISTS (
      SELECT 1 FROM \`order_items\` og
      WHERE og.order_id = o.id
      AND LOWER(og.product_name) LIKE '%garland%'
    )
    ORDER BY o.\`created at\` DESC
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
      o.\`user id\` AS user_id,
      u.username,
      u.email,
      gs.delivery_at,
      gs.\`reminder sent\` AS reminder_sent,
      gs.\`last reminder at\` AS last_reminder_at
    FROM orders o
    JOIN users u ON u.id = o.\`user id\`
    JOIN garland_order_schedule gs ON gs.\`order id\` = o.id
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
        createOrderNotification(row.user_id, message);
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
           SET \`reminder sent\` = 1, \`last reminder at\` = NOW()
           WHERE \`order id\` = ?`, [orderId]);
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
      o.\`total amount\` AS total_amount,
      o.delivery_fee,
      o.delivery_otp,
      o.status,
      o.tracking_status,
      o.delivery_status,
      o.\`cancel reason\` AS cancel_reason,
      o.\`created at\` AS created_at,
      o.\`picked at\` AS picked_at,
      o.out_for_delivery_at,
      o.\`delivered at\` AS delivered_at,

      oi.id AS item_id,
      oi.product_name,
      oi.unit_price,
      oi.weight,
      oi.total_price,
      oi.image

    FROM orders o
    LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
    WHERE o.\`user id\` = ?
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
                    delivery_otp: row.delivery_otp || null,
                    status: row.status,
                    tracking_status: row.tracking_status,
                    delivery_status: row.delivery_status,
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
   ✅ ADMIN ORDER LIFECYCLE ACTION
====================================================== */
const confirmOrder = (req, res) => {
    const orderId = Number(req.params.orderId);
    const action = (req.body.action || "").toUpperCase();
    if (!orderId)
        return res.status(400).json({ message: "Invalid order id" });
    if (!action)
        return res.status(400).json({ message: "Action is required" });
    db_1.default.query("SELECT `status`, `delivery_status` FROM `orders` WHERE `id` = ?", [orderId], (statusErr, statusRows) => {
        if (statusErr || statusRows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }
        const { status, delivery_status } = statusRows[0];
        let updates = [];
        let params = [];
        let requireEmailAndNotif = false;
        switch (action) {
            case "CONFIRM":
                if (status !== "PENDING") {
                    return res.status(409).json({ message: `Order already processed (${status}). Confirm allowed only once from PENDING.` });
                }
                updates.push("`status` = ?", "`delivery_status` = ?");
                params.push("ACCEPTED", "PENDING");
                requireEmailAndNotif = true;
                break;
            case "PICK":
                if (status !== "ACCEPTED" || delivery_status !== "PENDING") {
                    return res.status(409).json({ message: `Order cannot be picked from current state (status: ${status}, delivery: ${delivery_status}).` });
                }
                updates.push("`delivery_status` = ?", "`picked at` = NOW()");
                params.push("PICKED");
                break;
            case "OUT_FOR_DELIVERY":
                if (delivery_status !== "PICKED") {
                    return res.status(409).json({ message: `Order cannot be out for delivery from current state (${delivery_status}).` });
                }
                updates.push("`delivery_status` = ?", "`out_for_delivery_at` = NOW()");
                params.push("OUT_FOR_DELIVERY");
                break;
            case "DELIVERED":
                if (delivery_status !== "OUT_FOR_DELIVERY") {
                    return res.status(409).json({ message: `Order cannot be delivered from current state (${delivery_status}).` });
                }
                updates.push("`status` = ?", "`delivery_status` = ?", "`delivered at` = NOW()");
                params.push("DELIVERED", "DELIVERED");
                break;
            default:
                return res.status(400).json({ message: "Invalid action" });
        }
        params.push(orderId);
        const sqlUpdate = `UPDATE \`orders\` SET ${updates.join(", ")} WHERE \`id\` = ?`;
        db_1.default.query(sqlUpdate, params, async (updateErr) => {
            if (updateErr) {
                console.error("❌ Order lifecycle update error:", updateErr);
                return res.status(500).json({ message: "Database update failed" });
            }
            /* ── Fetch the customer's user id for notification targeting ── */
            const getCustomerSql = "SELECT `user id` AS customerId FROM orders WHERE id = ?";
            db_1.default.query(getCustomerSql, [orderId], (custErr, custResult) => {
                const targetCustomerId = (!custErr && custResult?.length) ? Number(custResult[0].customerId) : null;
                /* ── CONFIRM action: send email + notification ── */
                if (requireEmailAndNotif && targetCustomerId) {
                    const sqlSelect = `
              SELECT 
                o.id,
                o.\`user id\` AS user_id,
                o.\`total amount\` AS total_amount,
                o.delivery_fee,
                u.email,
                u.username,
                oi.id AS item_id,
                oi.product_name,
                oi.unit_price,
                oi.weight,
                oi.total_price,
                oi.image,
                p.GST AS gst
              FROM orders o
              JOIN users u ON u.id = o.\`user id\`
              LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
              LEFT JOIN \`products\` p ON oi.product_id = p.id
              WHERE o.id = ?
            `;
                    db_1.default.query(sqlSelect, [orderId], async (err, rows) => {
                        if (!err && rows.length > 0) {
                            const items = rows
                                .filter((r) => r.item_id)
                                .map((r) => ({
                                product_name: r.product_name,
                                unit_price: Number(r.unit_price),
                                weight: Number(r.weight),
                                total_price: Number(r.total_price),
                                image: r.image,
                                gst: Number(r.gst || 0),
                            }));
                            const order = rows[0];
                            try {
                                await (0, mailer_1.sendOrderConfirmMail)(order.email, order.username, orderId, Number(order.total_amount), Number(order.delivery_fee || 0), items);
                            }
                            catch (mailErr) {
                                console.error("❌ Mail failed:", mailErr);
                            }
                            createOrderNotification(targetCustomerId, `✅ Your Order #${orderId} has been confirmed by admin and is ready for packaging!`);
                        }
                    });
                }
                /* ── PICK / OUT_FOR_DELIVERY / DELIVERED: inject notification ── */
                if (!requireEmailAndNotif && targetCustomerId) {
                    let notificationMsg = "";
                    switch (action) {
                        case "PICK":
                            notificationMsg = `📦 Order #${orderId} has been updated: PICKED and is packaging for transit!`;
                            break;
                        case "OUT_FOR_DELIVERY":
                            notificationMsg = `🛵 Order #${orderId} status updated: OUT_FOR_DELIVERY is on the way!`;
                            break;
                        case "DELIVERED":
                            notificationMsg = `✅ Order #${orderId} status updated: DELIVERED successfully to doorstep!`;
                            break;
                        default:
                            console.log("ℹ️ No notification generated for lifecycle action:", action);
                    }
                    if (notificationMsg) {
                        const insertNotifSql = "INSERT INTO notifications (`user id`, message, `is read`) VALUES (?, ?, 0)";
                        db_1.default.query(insertNotifSql, [targetCustomerId, notificationMsg], (notifErr) => {
                            if (notifErr)
                                console.error("❌ Critical notification DB injection failure:", notifErr);
                            else
                                console.log(`🔔 Notification row successfully written for action: ${action}`);
                        });
                    }
                }
                /* ── Return updated order to sync frontend state ── */
                const selectUpdatedOrderSql = `SELECT id AS orderId, status, delivery_status, \`picked at\` AS picked_at, out_for_delivery_at, \`delivered at\` AS delivered_at FROM orders WHERE id = ?`;
                db_1.default.query(selectUpdatedOrderSql, [orderId], (err, rowArray) => {
                    if (err || rowArray.length === 0) {
                        return res.json({ success: true, message: `Action ${action} executed successfully` });
                    }
                    return res.json({ success: true, message: `Action ${action} executed successfully`, order: rowArray[0] });
                });
            });
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
    /* ── STEP 1: Retrieve the actual customer's user id from the order ── */
    const getOrderSql = "SELECT `user id` AS customerId FROM orders WHERE id = ?";
    db_1.default.query(getOrderSql, [orderId], (orderErr, orderResult) => {
        if (orderErr || !orderResult || orderResult.length === 0) {
            return res.status(404).json({ success: false, message: "Order context not found" });
        }
        const targetCustomerId = Number(orderResult[0].customerId);
        /* ── Validate transition ── */
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
            /* ── Build time-stamp field ── */
            let timeField;
            if (requestedStatus === "PICKED")
                timeField = "`picked at`";
            if (requestedStatus === "OUT_FOR_DELIVERY")
                timeField = "out_for_delivery_at";
            if (requestedStatus === "DELIVERED")
                timeField = "`delivered at`";
            /* ── Execute the status update ── */
            let sql = `UPDATE orders SET status=?, tracking_status=?`;
            const params = [requestedStatus, requestedStatus];
            if (timeField) {
                sql += `, ${timeField}=NOW()`;
            }
            sql += ` WHERE id=?`;
            params.push(orderId);
            db_1.default.query(sql, params, (updateErr) => {
                if (updateErr) {
                    console.error("❌ updateOrderStatus DB error:", updateErr);
                    return res.status(500).json({ success: false, message: "Database update failed" });
                }
                /* ── STEP 2: Inject notification using switch on statusKey ── */
                const statusKey = String(requestedStatus).toUpperCase();
                let notificationMsg = "";
                switch (statusKey) {
                    case "CONFIRMED":
                    case "READY":
                        notificationMsg = `✅ Your Order #${orderId} has been confirmed by admin and is ready for packaging!`;
                        break;
                    case "PICKED":
                        notificationMsg = `📦 Order #${orderId} has been updated: PICKED and is packaging for transit!`;
                        break;
                    case "OUT_FOR_DELIVERY":
                        notificationMsg = `🛵 Order #${orderId} status updated: OUT_FOR_DELIVERY is on the way!`;
                        break;
                    case "DELIVERED":
                        notificationMsg = `✅ Order #${orderId} status updated: DELIVERED successfully to doorstep!`;
                        break;
                    default:
                        console.log("ℹ️ No background message generated for status:", statusKey);
                }
                if (notificationMsg) {
                    const insertNotifSql = "INSERT INTO notifications (`user id`, message, `is read`) VALUES (?, ?, 0)";
                    db_1.default.query(insertNotifSql, [targetCustomerId, notificationMsg], (notifErr) => {
                        if (notifErr)
                            console.error("❌ Critical notification DB injection failure:", notifErr);
                        else
                            console.log(`🔔 Notification row successfully written for action: ${statusKey}`);
                    });
                }
                return res.json({ success: true, message: `Order #${orderId} updated to ${requestedStatus}` });
            });
        });
    });
};
exports.updateOrderStatus = updateOrderStatus;
/* ======================================================
   🔄 UNIFIED UPDATE STATUS (ADMIN & DELIVERY)
   PUT /api/orders/:id/status
====================================================== */
const updateOrderStatusUnified = (req, res) => {
    const orderId = Number(req.params.id);
    if (!orderId) {
        return res.status(400).json({ success: false, message: "Invalid order id" });
    }
    const userRole = req.user?.role;
    const userId = req.user?.id;
    // Fetch current order state
    db_1.default.query("SELECT status, delivery_status, delivery_partner_id, delivery_otp, `user id` FROM orders WHERE id = ? LIMIT 1", [orderId], (err, rows) => {
        if (err) {
            console.error("❌ Fetch order error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        const currentOrder = rows[0];
        const currentStatus = (currentOrder.status || "").toUpperCase();
        const customerUserId = currentOrder["user id"];
        // Determine requested status and delivery_status
        let requestedStatus = normalizeStatus(req.body.status);
        let requestedDeliveryStatus = normalizeStatus(req.body.delivery_status || req.body.status);
        // Foolproof transition: PENDING to ACCEPTED automatic rules
        if (currentStatus === "PENDING" && (requestedStatus === "ACCEPTED" || requestedStatus === "CONFIRMED")) {
            requestedStatus = "ACCEPTED";
            requestedDeliveryStatus = "PENDING_PICKUP";
        }
        // Determine delivery_partner_id
        let partnerId = currentOrder.delivery_partner_id;
        if (userRole === "DELIVERY") {
            partnerId = userId;
        }
        else if (req.body.delivery_partner_id !== undefined) {
            partnerId = req.body.delivery_partner_id ? Number(req.body.delivery_partner_id) : null;
        }
        // OTP validation if transitioning to DELIVERED and delivery partner is handling it
        if (requestedDeliveryStatus === "DELIVERED") {
            if (currentOrder.delivery_partner_id || userRole === "DELIVERY") {
                const submittedOtp = req.body.otp;
                const storedOtp = currentOrder.delivery_otp;
                if (!storedOtp) {
                    return res.status(400).json({
                        success: false,
                        message: "No OTP found. Order must be OUT_FOR_DELIVERY first."
                    });
                }
                if (!submittedOtp || String(submittedOtp).trim() !== String(storedOtp).trim()) {
                    return res.status(403).json({
                        success: false,
                        message: "Invalid OTP. Please enter the correct delivery code from the customer."
                    });
                }
            }
        }
        // Update status SQL query must strictly use the structure:
        // UPDATE orders SET status = ?, delivery_status = ?, delivery_partner_id = ? WHERE id = ?
        const updateSql = "UPDATE orders SET status = ?, delivery_status = ?, delivery_partner_id = ? WHERE id = ?";
        db_1.default.query(updateSql, [requestedStatus, requestedDeliveryStatus, partnerId, orderId], (updateErr) => {
            if (updateErr) {
                console.error("❌ updateOrderStatusUnified error:", updateErr);
                return res.status(500).json({ success: false, message: "Failed to update order status" });
            }
            // Driver-specific status flow rules for timestamps
            let generatedOtp = "";
            if (requestedDeliveryStatus === "PICKED") {
                db_1.default.query("UPDATE orders SET `picked at` = NOW() WHERE id = ?", [orderId]);
            }
            else if (requestedDeliveryStatus === "OUT_FOR_DELIVERY") {
                generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
                db_1.default.query("UPDATE orders SET out_for_delivery_at = NOW(), delivery_otp = ? WHERE id = ?", [generatedOtp, orderId]);
            }
            else if (requestedDeliveryStatus === "DELIVERED") {
                db_1.default.query("UPDATE orders SET `delivered at` = NOW(), delivery_otp = NULL WHERE id = ?", [orderId]);
            }
            // Handle PENDING -> ACCEPTED (PENDING_PICKUP) mail & notifications
            if (currentStatus === "PENDING" && requestedStatus === "ACCEPTED") {
                const confirmFetchSql = `
            SELECT 
              o.id,
              o.\`user id\` AS user_id,
              o.\`total amount\` AS total_amount,
              o.delivery_fee,
              u.email,
              u.username,
              oi.id AS item_id,
              oi.product_name,
              oi.unit_price,
              oi.weight,
              oi.total_price,
              oi.image,
              p.GST AS gst
            FROM orders o
            JOIN users u ON u.id = o.\`user id\`
            LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
            LEFT JOIN \`products\` p ON oi.product_id = p.id
            WHERE o.id = ?
          `;
                db_1.default.query(confirmFetchSql, [orderId], async (fetchErr, rows) => {
                    if (!fetchErr && rows.length > 0) {
                        const items = rows
                            .filter((r) => r.item_id)
                            .map((r) => ({
                            product_name: r.product_name,
                            unit_price: Number(r.unit_price),
                            weight: Number(r.weight),
                            total_price: Number(r.total_price),
                            image: r.image,
                            gst: Number(r.gst || 0),
                        }));
                        const order = rows[0];
                        createOrderNotification(order.user_id, `✅ Order #${orderId} confirmed and is being prepared!`);
                        try {
                            await (0, mailer_1.sendOrderConfirmMail)(order.email, order.username, orderId, Number(order.total_amount), Number(order.delivery_fee || 0), items);
                        }
                        catch (mailErr) {
                            console.error("❌ Mail failed in unified updater:", mailErr);
                        }
                    }
                });
            }
            else {
                // Send normal notifications
                const statusEmoji = {
                    PICKED: "📦",
                    OUT_FOR_DELIVERY: "🛵",
                    DELIVERED: "✅",
                };
                const notifMsg = `${statusEmoji[requestedDeliveryStatus] || "📦"} Order #${orderId} → ${requestedDeliveryStatus.replace("_", " ")}`;
                createOrderNotification(customerUserId, notifMsg);
                if (requestedDeliveryStatus === "OUT_FOR_DELIVERY" && generatedOtp) {
                    createOrderNotification(customerUserId, `🔐 Your delivery OTP for Order #${orderId} is ${generatedOtp}. Share this code with the delivery partner to confirm delivery.`);
                }
            }
            return res.json({
                success: true,
                message: `Order #${orderId} updated to status ${requestedStatus} and delivery_status ${requestedDeliveryStatus}`,
                data: {
                    orderId,
                    status: requestedStatus,
                    delivery_status: requestedDeliveryStatus
                }
            });
        });
    });
};
exports.updateOrderStatusUnified = updateOrderStatusUnified;
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
        db_1.default.query("UPDATE orders SET `cancel reason`=? WHERE id=?", [reason, orderId]);
        // Notify customer of cancellation
        getCurrentOrderStatus(orderId, (notifErr, _status, notifUserId) => {
            if (!notifErr && notifUserId) {
                createOrderNotification(notifUserId, `❌ Order #${orderId} cancelled: ${reason}`);
            }
        });
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
        db_1.default.query("UPDATE orders SET `cancel reason`=? WHERE id=?", [reason, orderId]);
        const adminMessage = `⚠ User cancelled order #${orderId}. Reason: ${reason}`;
        createOrderNotification(1, adminMessage);
        transporter.sendMail({
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject: `Order Cancelled (#${orderId})`,
            html: `<p>${adminMessage}</p>`,
        });
        return res.json({ success: true });
    });
};
exports.userCancelOrder = userCancelOrder;
