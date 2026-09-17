import { Request, Response } from "express";
import db from "../db";
import { sendOrderConfirmMail } from "../utils/mailer";
import { createAndSendNotification } from "../utils/notification.utils";
import nodemailer from "nodemailer";
import { autoAssignNearestPartner } from "./delivery.controller";
import crypto from "crypto";
import { broadcastOrderUpdate } from "../utils/socketEmitter";

type GarlandScheduleRow = {
  order_id: number;
  delivery_at: string;
  reminder_sent: number;
  last_reminder_at: string | null;
};

/* ======================================================
    📧 EMAIL TRANSPORT (Admin Alert)
====================================================== */
const transporter = nodemailer.createTransport({
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
db.query(
  `
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
  `,
  (err) => {
    if (err) {
      console.error("❌ Could not ensure garland_order_schedule table:", err);
    }
  }
);

/* ======================================================
   🔁 HELPER - UPDATE ORDER STATUS
====================================================== */
const updateStatus = (
  orderId: number,
  status: string,
  tracking: string,
  timeField?: string
) => {
  let sql = `UPDATE orders SET status=?, tracking_status=?`;
  const params: any[] = [status, tracking];

  if (timeField) {
    // timeField values already use backticks when needed
    sql += `, ${timeField}=NOW()`;
  }

  sql += ` WHERE id=?`;
  params.push(orderId);

  db.query(sql, params, (err) => {
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
const createOrderNotification = (userId: number, message: string) => {
  const sql = "INSERT INTO notifications (`user id`, message, `is read`) VALUES (?, ?, 0)";
  db.query(sql, [userId, message], (err, result: any) => {
    if (err) console.error("❌ Failed to log background action notification:", err);
    else {
      console.log("🔔 Background action notification successfully broadcasted locally!");
      import("../utils/socketEmitter").then(({ broadcastNewNotification }) => {
        broadcastNewNotification(userId, {
          id: result?.insertId,
          message,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      }).catch(console.error);
    }
  });
};

const normalizeStatus = (value?: string) => (value || "").toUpperCase();

const isGarlandItem = (item: any) => {
  const category = String(item?.category || "").toLowerCase();
  const name = String(item?.product_name || "").toLowerCase();
  return category === "garlands" || name.includes("garland");
};

const getValidDeliveryDate = (value: any) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isAtLeast24HoursAhead = (date: Date) => {
  const diffHours = (date.getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours >= 24;
};

const getCurrentOrderStatus = (
  orderId: number,
  cb: (err: any, status?: string, userId?: number) => void
) => {
  db.query(
    "SELECT tracking_status, `user id` FROM orders WHERE id=? LIMIT 1",
    [orderId],
    (err: any, rows: any[]) => {
      if (err) return cb(err);
      if (!rows || rows.length === 0) return cb(new Error("Order not found"));
      cb(null, normalizeStatus(rows[0].tracking_status), Number(rows[0]["user id"]));
    }
  );
};

const mapOrders = (rows: any[]) => {
  const map = new Map<number, any>();

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
        delivery_partner_id: row.delivery_partner_id,
        partner_name: row.partner_name,
        partner_phone: row.partner_phone,
        partner_image: row.partner_image,
        partner_status: row.partner_status,
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
        id: row.item_id,
        product_id: row.product_id,
        product_name: row.product_name,
        unit_price: Number(row.unit_price),
        weight: Number(row.weight),
        total_price: Number(row.total_price),
        image: row.image,
        product_type: row.product_type || "other",
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
    o.address AS shipping_address,
    o.phone AS shipping_phone,
    o.status,
    o.payment_method,
    COALESCE(o.delivery_status, o.tracking_status) AS tracking_status,
    o.delivery_status,
    o.delivery_partner_id,
    dp.name AS partner_name,
    dp.phone AS partner_phone,
    dp.profile_image AS partner_image,
    dp.status AS partner_status,
    o.\`cancel reason\` AS cancel_reason,
    o.\`created at\` AS created_at,
    o.\`picked at\` AS picked_at,
    o.out_for_delivery_at,
    o.\`delivered at\` AS delivered_at,

    oi.id AS item_id,
    oi.product_id,
    oi.product_name,
    oi.unit_price,
    oi.weight,
    oi.total_price,
    oi.image,
    p.product_type,

    gs.garland_delivery_at,
    gs.garland_reminder_sent,
    gs.garland_last_reminder_at

  FROM orders o
  JOIN users u ON u.id = o.\`user id\`
  LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
  LEFT JOIN \`products\` p ON p.id = oi.product_id
  LEFT JOIN \`delivery_partners\` dp ON dp.id = o.delivery_partner_id
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

const queryRows = <T = any>(sql: string, params: any[] = []) =>
  new Promise<T[]>((resolve, reject) => {
    db.query(sql, params, (err: any, rows: any) => {
      if (err) return reject(err);
      resolve((rows || []) as T[]);
    });
  });

export const getAdminPanelData = async (req: Request, res: Response) => {
  // Admin check
  if ((req as any).user?.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
  }
  try {
    const ordersSql = `${orderQuery} ORDER BY o.\`created at\` DESC LIMIT 200`;
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
      LIMIT 200
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
        tb.ride_status,
        tb.booking_number,
        tb.support_ticket,
        tb.notes,
        tb.\`created at\` AS created_at,
        tb.driver_assigned_at,
        tb.driver_accepted_at,
        tb.ride_started_at,
        tb.ride_completed_at,
        u.username,
        u.email,
        tp.name AS driver_name,
        tp.phone AS driver_phone,
        tp.vehicle_number
      FROM transport_bookings tb
      LEFT JOIN users u ON u.id = tb.\`user id\`
      LEFT JOIN transport_partners tp ON tp.id = tb.driver_id
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
  } catch (err) {
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

/* ======================================================
   🛒 CREATE ORDER
====================================================== */
export const createOrder = async (req: Request, res: Response) => {
  const { userId, items, address, phone, paymentMethod, latitude, longitude, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!userId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "❌ Invalid order data" });
  }

  if (paymentMethod === "online") {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay credentials." });
    }
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: "SERVER_CONFIG_ERROR: Razorpay secret is missing." });
    }
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
      
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }
  }

  try {
    // 🚀 ATOMIC VALIDATION LOOP: Cross-references product tables before completing requests
    for (const item of items) {
      const [productRows]: any = await db.promise().query(
        "SELECT id, E_name, inStock FROM products WHERE id = ?", 
        [item.product_id || item.id]
      );

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
  } catch (validationErr: any) {
    console.error("❌ Stock validation error:", validationErr);
    return res.status(500).json({ success: false, message: "Failed to validate order stock." });
  }

  const garlandItems = items.filter((item: any) => isGarlandItem(item));

  for (const garlandItem of garlandItems) {
    const deliveryDate = getValidDeliveryDate(
      garlandItem.deliveryDate || garlandItem.delivery_at
    );

    if (!deliveryDate) {
      return res.status(400).json({
        message: "Garland orders require a valid delivery date & time",
      });
    }

    if (!isAtLeast24HoursAhead(deliveryDate)) {
      return res.status(400).json({
        message:
          "Garland orders must be placed at least 24 hours in advance",
      });
    }
  }

  const subtotal = Number(req.body.subtotal) || items.reduce(
    (sum: number, i: any) => sum + Number(i.total_price || 0),
    0
  );

  // ✅ FIXED: Use frontend delivery fee and total to properly include GST!
  const deliveryFee = req.body.deliveryFee !== undefined ? Number(req.body.deliveryFee) : (subtotal >= 500 ? 0 : 5);
  const grandTotal = req.body.total ? Number(req.body.total) : (subtotal + deliveryFee);

  const orderSql = `
    INSERT INTO orders 
    (\`user id\`, \`total amount\`, delivery_fee, status, tracking_status, address, phone, payment_method, delivery_latitude, delivery_longitude, razorpay_order_id, razorpay_payment_id, razorpay_signature)
    VALUES (?, ?, ?, 'PENDING', 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    orderSql,
    [
      Number(userId),
      grandTotal,
      deliveryFee,
      address || "",
      phone || "",
      paymentMethod || "cod",
      latitude || null,
      longitude || null,
      razorpay_order_id || null,
      razorpay_payment_id || null,
      razorpay_signature || null,
    ],
    async (err: any, result: any) => {
      if (err) {
        console.error("❌ Create order error:", err);
        return res.status(500).json({ message: "Order creation failed" });
      }

      const orderId = result.insertId;

      // 🔔 Notify customer: order placed
      createAndSendNotification(
        Number(userId),
        "CUSTOMER",
        "🛒 Order Placed!",
        `Your order #${orderId} has been placed successfully. Total: ₹${grandTotal.toFixed(2)}`,
        { entityType: "order", type: "ORDER_PLACED", orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders" }
      );

      // ✅ AUTO-ASSIGNMENT REMOVED per business rules.
      // Orders remain delivery_partner_id = NULL until explicitly confirmed by Admin and claimed by a Delivery Partner.

      const itemSql = `
        INSERT INTO \`order_items\`
        (order_id, product_id, product_name, unit_price, weight, total_price, image, category, deliveryDate, slot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      items.forEach((item: any) => {
        const rawWeight = Number(item.weight) || 1;

        db.query(itemSql, [
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
          const deliveryDate = getValidDeliveryDate(
            item.deliveryDate || item.delivery_at
          );

          if (deliveryDate) {
            db.query(
              `INSERT INTO garland_order_schedule (\`order id\`, delivery_at)
               VALUES (?, ?)`,
              [orderId, deliveryDate]
            );
          }
        }
      });

      // 🔄 Real-time Sync: Broadcast new order to Admin and Customer dashboards
      broadcastOrderUpdate({
        id: orderId,
        user_id: userId,
        status: "PENDING",
        tracking_status: "PENDING"
      });

      res.json({ success: true, orderId });
    }
  );
};

/* ======================================================
   📦 GET ALL ORDERS (ADMIN)
====================================================== */
export const getAllOrders = (req: Request, res: Response) => {
  if ((req as any).user?.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
  }
  const limit = parseInt(req.query.limit as string) || 200;
  const sql = `${orderQuery} ORDER BY o.\`created at\` DESC LIMIT ?`;

  db.query(sql, [limit], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ Fetch orders error:", err);
      return res.status(500).json([]);
    }

    res.json(mapOrders(rows));
  });
};

/* ======================================================
   🌸 GET GARLAND ORDERS (ADMIN)
====================================================== */
export const getGarlandOrders = (req: Request, res: Response) => {
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
    ORDER BY o.\`created at\` DESC
    LIMIT ?
  `;

  const limit = parseInt(req.query.limit as string) || 200;

  db.query(sql, [limit], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ Fetch garland orders error:", err);
      return res.status(500).json([]);
    }

    res.json(mapOrders(rows));
  });
};

/* ======================================================
   ⏰ ADMIN SEND GARLAND REMINDER
====================================================== */
export const sendGarlandReminder = (req: Request, res: Response) => {
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

  db.query(sql, [orderId], (err: any, rows: GarlandScheduleRow[] & any[]) => {
    if (err) {
      console.error("❌ Garland reminder lookup error:", err);
      return res.status(500).json({ message: "Reminder failed" });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Garland schedule not found" });
    }

    const row: any = rows[0];
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
        db.query(
          `UPDATE garland_order_schedule
           SET \`reminder sent\` = 1, \`last reminder at\` = NOW()
           WHERE \`order id\` = ?`,
          [orderId]
        );

        return res.json({ success: true, message: "Reminder sent" });
      });
  });
};

/* ======================================================
   👤 GET USER ORDERS
====================================================== */
export const getUserOrders = (req: Request, res: Response) => {
  const { userId } = req.params;
  const reqUser = (req as any).user;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  
  if (reqUser?.role !== "ADMIN" && reqUser?.id !== Number(userId)) {
    return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
  }

  // 1. Fetch paginated order IDs to avoid N+1 limit truncation issues on JOINs
  const idSql = `SELECT id FROM orders WHERE \`user id\` = ? ORDER BY id DESC LIMIT ? OFFSET ?`;
  
  db.query(idSql, [userId, limit, offset], (err: any, idRows: any[]) => {
    if (err) {
      console.error("❌ Fetch user order IDs error:", err);
      return res.status(500).json([]);
    }

    if (!idRows || idRows.length === 0) {
      return res.json([]);
    }

    const orderIds = idRows.map(r => r.id);

    // 2. Fetch full details ONLY for the paginated order IDs
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
        o.address AS shipping_address,
        o.phone AS shipping_phone,
        o.payment_method,

        oi.id AS item_id,
        oi.product_id,
        oi.product_name,
        oi.unit_price,
        oi.weight,
        oi.total_price,
        oi.image,
        p.product_type,

        dp.name AS driver_name,
        dp.phone AS driver_phone,

        (SELECT COUNT(id) FROM reviews r WHERE r.order_id = o.id AND r.product_id = oi.product_id AND r.user_id = o.\`user id\`) > 0 AS is_reviewed

      FROM orders o
      LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
      LEFT JOIN \`products\` p ON p.id = oi.product_id
      LEFT JOIN \`users\` dp ON dp.id = o.delivery_partner_id
      WHERE o.id IN (?)
      ORDER BY o.id DESC
    `;

    db.query(sql, [orderIds], (err2: any, rows: any[]) => {
      if (err2) {
        console.error("❌ Fetch user orders details error:", err2);
        return res.status(500).json([]);
      }

    const map = new Map<number, any>();

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
          shipping_address: row.shipping_address,
          shipping_phone: row.shipping_phone,
          payment_method: row.payment_method,
          driver_name: row.driver_name,
          driver_phone: row.driver_phone,
          items: [],
        });
      }

      if (row.item_id) {
        map.get(row.orderId).items.push({
          id: row.item_id,
          product_id: row.product_id,
          product_name: row.product_name,
          unit_price: Number(row.unit_price),
          weight: Number(row.weight),
          total_price: Number(row.total_price),
          image: row.image,
          product_type: row.product_type || "other",
          is_reviewed: !!row.is_reviewed,
        });
      }
    });

    res.json([...map.values()]);
    });
  });
};

/* ======================================================
   👤 GET SINGLE ORDER DETAILS
====================================================== */
export const getOrderDetails = (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = (req as any).user?.id; // Assuming verifyToken populates req.user

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

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
      o.address AS shipping_address,
      o.phone AS shipping_phone,
      o.payment_method,

      oi.id AS item_id,
      oi.product_id,
      oi.product_name,
      oi.unit_price,
      oi.weight,
      oi.total_price,
      oi.image,
      p.product_type,

      dp.name AS driver_name,
      dp.phone AS driver_phone

    FROM orders o
    LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
    LEFT JOIN \`products\` p ON p.id = oi.product_id
    LEFT JOIN \`users\` dp ON dp.id = o.delivery_partner_id
    WHERE o.id = ? AND o.\`user id\` = ?
  `;

  db.query(sql, [orderId, userId], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ Fetch order details error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }

    const orderData = {
      orderId: rows[0].orderId,
      total_amount: Number(rows[0].total_amount),
      delivery_fee: Number(rows[0].delivery_fee),
      delivery_otp: rows[0].delivery_otp || null,
      status: rows[0].status,
      tracking_status: rows[0].tracking_status,
      delivery_status: rows[0].delivery_status,
      cancel_reason: rows[0].cancel_reason,
      created_at: rows[0].created_at,
      picked_at: rows[0].picked_at,
      out_for_delivery_at: rows[0].out_for_delivery_at,
      delivered_at: rows[0].delivered_at,
      shipping_address: rows[0].shipping_address,
      shipping_phone: rows[0].shipping_phone,
      payment_method: rows[0].payment_method,
      driver_name: rows[0].driver_name,
      driver_phone: rows[0].driver_phone,
      items: [] as any[],
    };

    rows.forEach((row) => {
      if (row.item_id) {
        orderData.items.push({
          id: row.item_id,
          product_id: row.product_id,
          product_name: row.product_name,
          unit_price: Number(row.unit_price),
          weight: Number(row.weight),
          total_price: Number(row.total_price),
          image: row.image,
          product_type: row.product_type || "other",
        });
      }
    });

    res.json(orderData);
  });
};

/* ======================================================
   ✅ ADMIN ORDER LIFECYCLE ACTION
====================================================== */
export const confirmOrder = (req: Request, res: Response) => {
  const orderId = Number(req.params.orderId);
  const action = (req.body.action || "").toUpperCase();

  if (!orderId) return res.status(400).json({ message: "Invalid order id" });
  if (!action) return res.status(400).json({ message: "Action is required" });

  db.query(
    "SELECT `status`, `delivery_status` FROM `orders` WHERE `id` = ?",
    [orderId],
    (statusErr: any, statusRows: any[]) => {
      if (statusErr || statusRows.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      const { status, delivery_status } = statusRows[0];
      
      let updates: string[] = [];
      let params: any[] = [];
      let requireEmailAndNotif = false;

      switch (action) {
        case "CONFIRM":
          if (status !== "PENDING") {
            return res.status(409).json({ message: `Order already processed (${status}). Confirm allowed only once from PENDING.` });
          }
          updates.push("`status` = ?", "`tracking_status` = ?", "`delivery_status` = ?", "`delivery_partner_id` = NULL", "`picked at` = NULL", "`out_for_delivery_at` = NULL", "`delivered at` = NULL");
          params.push("ACCEPTED", "ACCEPTED", "PENDING");
          requireEmailAndNotif = true;
          break;

        case "PACK":
          if (status !== "ACCEPTED") {
            return res.status(409).json({ message: `Order cannot be packed from current state (${status}).` });
          }
          updates.push("`tracking_status` = ?");
          params.push("PACKED");
          break;

        case "PICK":
          if (status !== "ACCEPTED" || delivery_status !== "PENDING") {
            return res.status(409).json({ message: `Order cannot be picked from current state (status: ${status}, delivery: ${delivery_status}).` });
          }
          updates.push("`delivery_status` = ?", "`tracking_status` = ?", "`picked at` = NOW()");
          params.push("PICKED", "PICKED");
          break;

        case "OUT_FOR_DELIVERY":
          if (delivery_status !== "PICKED") {
            return res.status(409).json({ message: `Order cannot be out for delivery from current state (${delivery_status}).` });
          }
          updates.push("`delivery_status` = ?", "`tracking_status` = ?", "`out_for_delivery_at` = NOW()");
          params.push("OUT_FOR_DELIVERY", "OUT_FOR_DELIVERY");
          break;

        case "DELIVERED":
          if (delivery_status !== "OUT_FOR_DELIVERY") {
            return res.status(409).json({ message: `Order cannot be delivered from current state (${delivery_status}).` });
          }
          updates.push("`status` = ?", "`delivery_status` = ?", "`tracking_status` = ?", "`delivered at` = NOW()");
          params.push("DELIVERED", "DELIVERED", "DELIVERED");
          break;

        default:
          return res.status(400).json({ message: "Invalid action" });
      }

      params.push(orderId);

      const sqlUpdate = `UPDATE \`orders\` SET ${updates.join(", ")} WHERE \`id\` = ?`;

      db.query(sqlUpdate, params, async (updateErr) => {
        if (updateErr) {
          console.error("❌ Order lifecycle update error:", updateErr);
          return res.status(500).json({ message: "Database update failed" });
        }

        /* ── Fetch the customer's user id for notification targeting ── */
        const getCustomerSql = "SELECT `user id` AS customerId FROM orders WHERE id = ?";
        db.query(getCustomerSql, [orderId], (custErr, custResult: any) => {
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

            db.query(sqlSelect, [orderId], async (err: any, rows: any[]) => {
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
                  await sendOrderConfirmMail(
                    order.email,
                    order.username,
                    orderId,
                    Number(order.total_amount),
                    Number(order.delivery_fee || 0),
                    items
                  );
                } catch (mailErr) {
                  console.error("❌ Mail failed:", mailErr);
                }

                createAndSendNotification(
                  order.user_id,
                  "CUSTOMER",
                  "✅ Order Confirmed!",
                  `Your order #${orderId} has been confirmed and is being prepared.`,
                  { entityType: "order", type: "ORDER_CONFIRMED", orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders" }
                );
              }
            });
          }

          /* ── PICK / OUT_FOR_DELIVERY / DELIVERED: inject notification ── */
          if (!requireEmailAndNotif && targetCustomerId) {
            let notificationMsg = "";
            let notifTitle = "";
            let type = "";

            switch (action) {
              case "PACK":
                notifTitle = "📦 Order Packed";
                notificationMsg = `Your Order #${orderId} has been packed and is ready for delivery.`;
                type = "PACKED";
                break;
              case "PICK":
                notifTitle = "📦 Order Picked Up";
                notificationMsg = `Your Order #${orderId} has been successfully picked up from the store and is processing for transit!`;
                type = "PICKED";
                break;
              case "OUT_FOR_DELIVERY":
                notifTitle = "🚚 Out for Delivery";
                notificationMsg = `Your Order #${orderId} is OUT FOR DELIVERY!`;
                type = "OUT_FOR_DELIVERY";
                break;
              case "DELIVERED":
                notifTitle = "✅ Order Delivered";
                notificationMsg = `Your Order #${orderId} has been securely delivered via OTP verification! Thank you for shopping with VillageSmart.`;
                type = "DELIVERED";
                break;
              default:
                console.log("ℹ️ No notification generated for lifecycle action:", action);
            }

            if (notificationMsg) {
              createAndSendNotification(targetCustomerId, "CUSTOMER", notifTitle, notificationMsg, { entityType: "order", type, orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders" });
            }

            if (action === "OUT_FOR_DELIVERY") {
              // Generate OTP ONLY if NULL
              db.query("SELECT delivery_otp FROM orders WHERE id = ?", [orderId], (err, otpRows: any[]) => {
                if (!err && otpRows.length > 0) {
                  let otp = otpRows[0].delivery_otp;
                  if (!otp) {
                    otp = String(Math.floor(1000 + Math.random() * 9000));
                    db.query("UPDATE orders SET delivery_otp = ? WHERE id = ?", [otp, orderId]);
                  }
                  const otpNotif = `Your Order #${orderId} is OUT FOR DELIVERY!\nOTP: ${otp}\nShare this OTP with the driver to receive your order.`;
                  createAndSendNotification(targetCustomerId, "CUSTOMER", "🔐 Delivery OTP", otpNotif, { entityType: "order", type: "OTP", orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders", priority: "high" });
                  
                  // Trigger email
                  db.query(
                    `SELECT o.id, o.\`total amount\` AS total_amount, o.delivery_fee, u.email, u.username
                     FROM orders o JOIN users u ON u.id = o.\`user id\` WHERE o.id = ?`,
                    [orderId],
                    async (emailErr, emailRows: any[]) => {
                      if (!emailErr && emailRows.length > 0) {
                        const order = emailRows[0];
                        if (order.email) {
                          try {
                            const { sendOutForDeliveryMail } = require("../utils/mailer");
                            await sendOutForDeliveryMail(
                              order.email,
                              order.username,
                              order.id,
                              Number(order.total_amount),
                              Number(order.delivery_fee || 0),
                              otp,
                              [] // Send empty array or fetch items if needed. Out for delivery template usually doesn't need items, or fetch them if it does.
                            );
                          } catch (e) {
                            console.error("Out for delivery email failed", e);
                          }
                        }
                      }
                    }
                  );
                }
              });
            }
          }

          /* ── Return updated order to sync frontend state ── */
          const selectUpdatedOrderSql = `SELECT id AS orderId, status, delivery_status, \`picked at\` AS picked_at, out_for_delivery_at, \`delivered at\` AS delivered_at FROM orders WHERE id = ?`;
          db.query(selectUpdatedOrderSql, [orderId], (err, rowArray: any[]) => {
            if (err || rowArray.length === 0) {
               return res.json({ success: true, message: `Action ${action} executed successfully` });
            }
            return res.json({ success: true, message: `Action ${action} executed successfully`, order: rowArray[0] });
          });
        });
      });
    }
  );
};

/* ======================================================
   🔄 ADMIN UPDATE STATUS
====================================================== */
export const updateOrderStatus = (req: Request, res: Response) => {
  const orderId = Number(req.params.orderId);
  const requestedStatus = normalizeStatus(req.body?.status);

  if (!orderId || !requestedStatus) {
    return res.status(400).json({ message: "Invalid data" });
  }

  const nextStatusMap: Record<string, string> = {
    CONFIRMED: "PICKED",
    PICKED: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED",
  };

  /* ── STEP 1: Retrieve the actual customer's user id from the order ── */
  const getOrderSql = "SELECT `user id` AS customerId FROM orders WHERE id = ?";
  db.query(getOrderSql, [orderId], (orderErr, orderResult: any) => {
    if (orderErr || !orderResult || orderResult.length === 0) {
      return res.status(404).json({ success: false, message: "Order context not found" });
    }

    const targetCustomerId: number = Number(orderResult[0].customerId);

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
      let timeField: string | undefined;
      if (requestedStatus === "PICKED") timeField = "`picked at`";
      if (requestedStatus === "OUT_FOR_DELIVERY") timeField = "out_for_delivery_at";
      if (requestedStatus === "DELIVERED") timeField = "`delivered at`";

      /* ── Execute the status update ── */
      let sql = `UPDATE orders SET status=?, tracking_status=?`;
      const params: any[] = [requestedStatus, requestedStatus];

      if (timeField) {
        sql += `, ${timeField}=NOW()`;
      }

      sql += ` WHERE id=?`;
      params.push(orderId);

      db.query(sql, params, (updateErr) => {
        if (updateErr) {
          console.error("❌ updateOrderStatus DB error:", updateErr);
          return res.status(500).json({ success: false, message: "Database update failed" });
        }

        /* ── STEP 2: Inject notification using switch on statusKey ── */
        const statusKey = String(requestedStatus).toUpperCase();
        let notificationMsg = "";
        let notifTitle = "";

        switch (statusKey) {
          case "CONFIRMED":
          case "READY":
            notifTitle = "✅ Order Confirmed";
            notificationMsg = `Your Order #${orderId} has been confirmed by admin and is ready for packaging!`;
            break;
          case "PICKED":
            notifTitle = "📦 Order Picked Up";
            notificationMsg = `Your Order #${orderId} has been updated to PICKED and is processing for transit!`;
            break;
          case "OUT_FOR_DELIVERY":
            notifTitle = "🚚 Out for Delivery";
            notificationMsg = `Your Order #${orderId} is OUT FOR DELIVERY and on the way!`;
            break;
          case "DELIVERED":
            notifTitle = "✅ Order Delivered";
            notificationMsg = `Your Order #${orderId} was DELIVERED successfully!`;
            break;
          default:
            console.log("ℹ️ No background message generated for status:", statusKey);
        }

        if (notificationMsg) {
          createAndSendNotification(targetCustomerId, "CUSTOMER", notifTitle, notificationMsg, { entityType: "order", type: statusKey, orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders" });
        }
        
        // Broadcast order real-time update
        fetchAndBroadcastOrder(orderId);

        return res.json({ success: true, message: `Order #${orderId} updated to ${requestedStatus}` });
      });
    });
  });
};

/* ======================================================
   🔄 UNIFIED UPDATE STATUS (ADMIN & DELIVERY)
   PUT /api/orders/:id/status
====================================================== */
export const updateOrderStatusUnified = (req: Request, res: Response) => {
  const orderId = Number(req.params.id);
  if (!orderId) {
    return res.status(400).json({ success: false, message: "Invalid order id" });
  }

  const userRole = (req as any).user?.role;
  const userId = (req as any).user?.id;

  // Fetch current order state
  db.query(
    "SELECT status, delivery_status, delivery_partner_id, delivery_otp, `user id` FROM orders WHERE id = ? LIMIT 1",
    [orderId],
    (err: any, rows: any[]) => {
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
      } else if (req.body.delivery_partner_id !== undefined) {
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
      db.query(updateSql, [requestedStatus, requestedDeliveryStatus, partnerId, orderId], (updateErr) => {
        if (updateErr) {
          console.error("❌ updateOrderStatusUnified error:", updateErr);
          return res.status(500).json({ success: false, message: "Failed to update order status" });
        }

        // Driver-specific status flow rules for timestamps
        let generatedOtp = "";
        if (requestedDeliveryStatus === "PICKED") {
          db.query("UPDATE orders SET `picked at` = NOW() WHERE id = ?", [orderId]);
        } else if (requestedDeliveryStatus === "OUT_FOR_DELIVERY") {
          generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
          db.query("UPDATE orders SET out_for_delivery_at = NOW(), delivery_otp = ? WHERE id = ?", [generatedOtp, orderId]);
        } else if (requestedDeliveryStatus === "DELIVERED") {
          db.query("UPDATE orders SET `delivered at` = NOW(), delivery_otp = NULL WHERE id = ?", [orderId]);
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
          db.query(confirmFetchSql, [orderId], async (fetchErr, rows: any[]) => {
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

              createAndSendNotification(
                order.user_id,
                "CUSTOMER",
                "✅ Order Confirmed!",
                `Your order #${orderId} has been confirmed and is being prepared.`,
                { entityType: "order", type: "ORDER_CONFIRMED", orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders" }
              );

              try {
                await sendOrderConfirmMail(
                  order.email,
                  order.username,
                  orderId,
                  Number(order.total_amount),
                  Number(order.delivery_fee || 0),
                  items
                );
              } catch (mailErr) {
                console.error("❌ Mail failed in unified updater:", mailErr);
              }
            }
          });
        } else {
          // Send normal notifications
          const statusEmoji: Record<string, string> = {
            PICKED: "📦",
            OUT_FOR_DELIVERY: "🚚",
            DELIVERED: "✅",
          };
          const titles: Record<string, string> = {
            PICKED: "Order Picked Up",
            OUT_FOR_DELIVERY: "Out for Delivery",
            DELIVERED: "Order Delivered",
          };
          const notifMsg = `Your Order #${orderId} has been updated to ${requestedDeliveryStatus.replace("_", " ")}.`;
          const title = `${statusEmoji[requestedDeliveryStatus] || "🔔"} ${titles[requestedDeliveryStatus] || "Order Status Update"}`;
          
          createAndSendNotification(customerUserId, "CUSTOMER", title, notifMsg, { entityType: "order", type: requestedDeliveryStatus, orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders" });

          if (requestedDeliveryStatus === "OUT_FOR_DELIVERY" && generatedOtp) {
            createAndSendNotification(
              customerUserId,
              "CUSTOMER",
              "🔐 Delivery OTP",
              `Your delivery OTP for Order #${orderId} is: ${generatedOtp}\nShare this code with the delivery partner to receive your order.`,
              { entityType: "order", type: "OTP", orderId: String(orderId), route: `/?app=consumer/my-orders/${orderId}`, channelId: "villagesmart_orders", priority: "high" }
            );
          }
        }

        // Broadcast order real-time update
        fetchAndBroadcastOrder(orderId);
        
        // 💰 Register COD collection if applicable
        if (requestedStatus === "DELIVERED" || requestedDeliveryStatus === "DELIVERED") {
          import("../utils/cod.utils").then(m => m.processCodCollectionIfApplicable(orderId));
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
    }
  );
};

/* ======================================================
   ❌ ADMIN CANCEL ORDER
====================================================== */
export const adminCancelOrder = (req: Request, res: Response) => {
  if ((req as any).user?.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
  }
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

    db.query("UPDATE orders SET `cancel reason`=? WHERE id=?", [reason, orderId]);

    // Notify customer of cancellation
    getCurrentOrderStatus(orderId, (notifErr, _status, notifUserId) => {
      if (!notifErr && notifUserId) {
        createOrderNotification(notifUserId, `❌ Order #${orderId} cancelled: ${reason}`);
      }
    });

    fetchAndBroadcastOrder(orderId);

    return res.json({ success: true });
  });
};

/* ======================================================
   👤 USER CANCEL → ADMIN EMAIL ALERT
====================================================== */
export const userCancelOrder = (req: Request, res: Response) => {
  const orderId = Number(req.params.orderId);
  const { reason } = req.body;
  const reqUser = (req as any).user;

  if (!orderId || !reason) {
    return res.status(400).json({ message: "Invalid cancel request" });
  }

  // 1. Verify ownership
  const selectSql = `SELECT \`user id\` AS user_id, status FROM orders WHERE id = ? LIMIT 1`;
  db.query(selectSql, [orderId], (selErr: any, selRows: any[]) => {
    if (selErr) {
      console.error("❌ Order check error:", selErr);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
    
    if (!selRows || selRows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (reqUser?.role !== "ADMIN" && Number(reqUser?.id) !== Number(selRows[0].user_id)) {
      return res.status(403).json({ success: false, message: "Forbidden: You don't own this order" });
    }
    
    const currentStatus = selRows[0].status;
    if (currentStatus === 'CANCELLED') {
      return res.json({ success: true, message: "Order is already cancelled" });
    }
    if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(currentStatus)) {
      return res.status(409).json({ message: "Order cannot be cancelled. It may have already been picked up or delivered." });
    }

    // Atomic Update to prevent race conditions
    const sql = `
      UPDATE orders 
      SET 
        status = 'CANCELLED', 
        tracking_status = 'CANCELLED', 
        \`cancel reason\` = ?
      WHERE 
        id = ? 
        AND status NOT IN ('OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')
    `;

  db.query(sql, [reason, orderId], (err: any, result: any) => {
    if (err) {
      console.error("❌ userCancelOrder error:", err);
      return res.status(500).json({ message: "Database error during cancellation" });
    }

    if (result.affectedRows === 0) {
      return res.status(409).json({
        message: "Order cannot be cancelled. It may have already been picked up or delivered.",
      });
    }

    const adminMessage = `⚠ User cancelled order #${orderId}. Reason: ${reason}`;
    createOrderNotification(1, adminMessage);

    transporter.sendMail({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `Order Cancelled (#${orderId})`,
      html: `<p>${adminMessage}</p>`,
    }).catch(console.error);

    // Emit real-time event to delivery partners
    import("../server").then(({ io }) => {
      io.emit("ORDER_CANCELLED", { orderId, status: "CANCELLED" });
    }).catch(console.error);

    return res.json({ success: true });
  });
  });
};



export const fetchAndBroadcastOrder = (orderId: number) => {
  const sql = orderQuery + ` WHERE o.id = ? LIMIT 1`;
  db.query(sql, [orderId], (err: any, rows: any[]) => {
    if (err) {
      console.error(`❌ Error fetching order for broadcast:`, err);
      return;
    }
    const orders = mapOrders(rows);
    if (orders && orders.length > 0) {
      broadcastOrderUpdate(orders[0]);
    }
  });
};

