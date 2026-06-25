import { Request, Response } from "express";
import db from "../db";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/auth.middleware";

/* ======================================================
   🔔 REUSABLE NOTIFICATION BUILDER HELPER
   Safely writes alert messages into our verified
   notifications table schema using backtick-escaped columns.
====================================================== */
export const triggerOrderNotification = (userId: number, textMessage: string) => {
  const sql = "INSERT INTO notifications (`user id`, message, `is read`) VALUES (?, ?, 0)";
  db.query(sql, [userId, textMessage], (err) => {
    if (err) console.error("❌ Failed to log automated background notification row:", err);
  });
};

/* ======================================================
   🗂 ENSURE DELIVERY PARTNERS TABLE EXISTS
====================================================== */
db.query(
  `CREATE TABLE IF NOT EXISTS delivery_partners (
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
  )`,
  (err) => {
    if (err) console.error("❌ Could not ensure delivery_partners table:", err);
  }
);

/* ======================================================
   🔐 SIGNUP DELIVERY PARTNER
   POST /api/delivery/signup
====================================================== */
export const signupDeliveryPartner = async (req: Request, res: Response) => {
  const { name, email, phone, password, vehicle_type, vehicle_number, license_number } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: "Name, email, phone, and password are required" });
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const profile_image = files?.['profile_image']?.[0]?.filename || null;
  const dl_document_url = files?.['dl_document']?.[0]?.filename || null;
  const rc_document_url = files?.['rc_document']?.[0]?.filename || null;
  const aadhaar_document_url = files?.['aadhaar_document']?.[0]?.filename || null;

  try {
    const checkSql = "SELECT id FROM delivery_partners WHERE email = ? LIMIT 1";
    db.query(checkSql, [email], async (checkErr: any, rows: any[]) => {
      if (checkErr) return res.status(500).json({ success: false, message: "Database error" });
      if (rows.length > 0) return res.status(409).json({ success: false, message: "Email already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = `
        INSERT INTO delivery_partners 
        (name, phone, email, password, vehicle_type, vehicle_number, \`license number\`, profile_image, dl_document_url, rc_document_url, aadhaar_document_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `;
      
      db.query(sql, [name, phone, email, hashedPassword, vehicle_type || null, vehicle_number || null, license_number || null, profile_image, dl_document_url, rc_document_url, aadhaar_document_url], (err: any, result: any) => {
        if (err) {
          console.error("❌ Delivery Partner Signup DB Error:", err);
          return res.status(500).json({ success: false, message: `Signup failed: ${err.message}` });
        }
        return res.status(201).json({ success: true, message: "Delivery partner registered successfully" });
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   🔐 LOGIN DELIVERY PARTNER
   POST /api/delivery/login
====================================================== */
export const loginDeliveryPartner = (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  db.query("SELECT * FROM delivery_partners WHERE email = ? LIMIT 1", [email], async (err: any, rows: any[]) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (rows.length === 0) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const partner = rows[0];
    const isMatch = await bcrypt.compare(password, partner.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    // ✅ Enforce approval status
    if (partner.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Waiting for admin approval",
        status: partner.status
      });
    }

    const token = generateToken({ id: partner.id, username: partner.name, role: "DELIVERY" });
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

/* ======================================================
   📦 GET PENDING/ACTIONABLE ORDERS FOR DELIVERY PARTNER
   GET /api/delivery/orders
====================================================== */
export const getDeliveryOrders = (req: Request, res: Response) => {
  const partnerId = (req as any).user?.id;

  let sql = `
    SELECT 
      o.id AS orderId,
      o.\`user id\` AS user_id,
      u.username,
      u.phone AS customer_phone,
      u.address AS customer_address,
      u.latitude AS customer_lat,
      u.longitude AS customer_lng,
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
      oi.image

    FROM orders o
    JOIN users u ON u.id = o.\`user id\`
    LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
    WHERE (o.delivery_status = 'PENDING_PICKUP' OR (o.delivery_partner_id = ? AND o.delivery_status != 'DELIVERED'))
      AND NOT EXISTS (
        SELECT 1 FROM \`order_items\` oi2 
        WHERE oi2.order_id = o.id 
          AND (LOWER(oi2.category) = 'garlands' OR LOWER(oi2.product_name) LIKE '%garland%')
      )
    ORDER BY o.\`created at\` DESC
  `;

  db.query(sql, [partnerId || 0], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getDeliveryOrders error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        data: [],
      });
    }

    // Group rows into orders with items
    const map = new Map<number, any>();
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
        });
      }
    });

    return res.json({
      success: true,
      data: [...map.values()],
    });
  });
};

/* ======================================================
   📦 ACCEPT ORDER (Delivery Partner)
   POST /api/delivery/accept/:orderId
====================================================== */
export const acceptOrder = (req: Request, res: Response) => {
  const orderId = Number(req.params.orderId);
  const partnerId = (req as any).user?.id;

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Invalid order id" });
  }

  // Check current status must be CONFIRMED
  db.query(
    "SELECT tracking_status, `user id` FROM orders WHERE id = ? LIMIT 1",
    [orderId],
    (err: any, rows: any[]) => {
      if (err || !rows?.length) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const current = (rows[0].tracking_status || rows[0].delivery_status || "PENDING").toUpperCase();
      if (current !== "PENDING" && current !== "PENDING_PICKUP" && current !== "CONFIRMED") {
        return res.status(409).json({
          success: false,
          message: `Cannot accept order in ${current} status. Must be PENDING or PENDING_PICKUP.`,
        });
      }

      const sql = `
        UPDATE orders 
        SET tracking_status = 'CONFIRMED', status = 'CONFIRMED', delivery_status = 'CONFIRMED',
            delivery_partner_id = ?
        WHERE id = ?
      `;

      db.query(sql, [partnerId || null, orderId], (updateErr: any) => {
        if (updateErr) {
          console.error("❌ acceptOrder update error:", updateErr);
          return res.status(500).json({ success: false, message: "Failed to accept order" });
        }

        // Notify customer
        triggerOrderNotification(rows[0]["user id"], `🚚 Order #${orderId} accepted by delivery partner`);

        return res.json({
          success: true,
          message: `Order #${orderId} accepted successfully`,
          data: { orderId, status: "CONFIRMED" },
        });
      });
    }
  );
};

import { sendDeliveryPartnerAssignedMail } from "../utils/mailer";

/* ======================================================
   📦 UPDATE PARTNER DELIVERY STATUS
   PUT /api/delivery/status-update/:orderId
   Body: { status: "CONFIRMED" | "PICKED" | "OUT_FOR_DELIVERY" | "DELIVERED" }
====================================================== */
export const updatePartnerDeliveryStatus = (req: any, res: any) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const partnerId = req.user?.id; // Logged-in delivery partner ID from verifyToken middleware

  // 1. FIRST check the current status to prevent duplicate triggers on double-clicks
  db.query("SELECT delivery_status, payment_method FROM `orders` WHERE id = ?", [orderId], (err: any, rows: any[]) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Order not found" });

    const currentStatus = (rows[0].delivery_status || "").toUpperCase();
    const paymentMethod = (rows[0].payment_method || "cod").toLowerCase();

    if (currentStatus === status.toUpperCase()) {
      return res.status(400).json({ success: false, message: "Order is already in this status." });
    }

    let statusField = "";
    let timestampColumn = "";
    let logMessage = "";
    let assignPartner = false;

    switch (status.toUpperCase()) {
      case "CONFIRMED":
        statusField = "CONFIRMED";
        assignPartner = true;
        logMessage = `✅ Your order #${orderId} has been accepted by the delivery partner and is preparing for pickup!`;
        break;
      case "PICKED":
        statusField = "PICKED";
        timestampColumn = "`picked at` = NOW()";
        logMessage = `📦 Order #${orderId} has been successfully picked up from the store layout and is processing for transit!`;
        break;
      case "OUT_FOR_DELIVERY":
        statusField = "OUT_FOR_DELIVERY";
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        timestampColumn = `\`out_for_delivery_at\` = NOW(), delivery_otp = '${generatedOtp}'`;
        logMessage = `🛵 Order #${orderId} is OUT_FOR_DELIVERY! Share this OTP: ${generatedOtp} with the driver to receive your order.`;
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

    db.query(updateQuery, [statusField, orderId], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      // Instantly fetch user id row to route the automated background notification query 🎯
      db.query("SELECT o.`user id`, u.email, u.username FROM `orders` o JOIN `users` u ON o.`user id` = u.id WHERE o.id = ?", [orderId], (uErr, uRes: any) => {
        if (!uErr && uRes.length > 0) {
          const customerId = uRes[0]['user id'];
          const customerEmail = uRes[0].email;
          const customerName = uRes[0].username;
          
          const notifySql = "INSERT INTO `notifications` (`user id`, message, `is read`) VALUES (?, ?, 0)";
          db.query(notifySql, [customerId, logMessage], (nErr) => {
            if (nErr) console.error("❌ Notification layer failure:", nErr);
          });

          // Send email if order is confirmed (accepted by delivery partner)
          if (assignPartner && customerEmail) {
            const fetchOrderDetailsSql = `
              SELECT 
                o.\`total amount\` AS total_amount,
                o.delivery_fee,
                oi.id AS item_id,
                oi.product_name,
                oi.unit_price,
                oi.weight,
                oi.total_price,
                oi.image,
                dp.name AS partner_name,
                dp.phone AS partner_phone
              FROM orders o
              LEFT JOIN \`order_items\` oi ON oi.order_id = o.id
              LEFT JOIN delivery_partners dp ON dp.id = ?
              WHERE o.id = ?
            `;
            db.query(fetchOrderDetailsSql, [partnerId, orderId], (detailsErr, detailsRows: any[]) => {
               if (!detailsErr && detailsRows.length > 0) {
                 const order = detailsRows[0];
                 const partnerName = order.partner_name || "Assigned Partner";
                 const partnerPhone = order.partner_phone || "N/A";
                 const totalAmount = Number(order.total_amount || 0);
                 const deliveryFee = Number(order.delivery_fee || 0);
                 const items = detailsRows
                   .filter(r => r.item_id)
                   .map(r => ({
                      product_name: r.product_name,
                      unit_price: Number(r.unit_price),
                      weight: Number(r.weight),
                      total_price: Number(r.total_price),
                      image: r.image
                   }));
                 
                 sendDeliveryPartnerAssignedMail(
                   customerEmail,
                   customerName,
                   orderId,
                   totalAmount,
                   deliveryFee,
                   items,
                   partnerName,
                   partnerPhone
                 );
               }
            });
          }
        }
      });

      res.status(200).json({ success: true, message: `Order advanced to state: ${statusField} successfully!` });
    });
  });
};

/* ======================================================
   📍 UPDATE DELIVERY PARTNER LOCATION
   POST /api/delivery/location
   Body: { lat, lng }
====================================================== */
export const updateDeliveryLocation = (req: Request, res: Response) => {
  const partnerId = (req as any).user?.id;
  const { lat, lng } = req.body;

  if (!partnerId || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return res.status(400).json({ success: false, message: "Invalid location data" });
  }

  const sql = `
    INSERT INTO partner_locations (partner_id, partner_type, latitude, longitude)
    VALUES (?, 'delivery', ?, ?)
    ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), updated_at = NOW()
  `;

  db.query(sql, [partnerId, Number(lat), Number(lng)], (err: any) => {
    if (err) {
      console.error("❌ updateDeliveryLocation error:", err);
      return res.status(500).json({ success: false, message: "Failed to update location" });
    }

    return res.json({ success: true, message: "Location updated" });
  });
};

/* ======================================================
   💰 GET DELIVERY EARNINGS
   GET /api/delivery/earnings
====================================================== */
export const getDeliveryEarnings = (req: Request, res: Response) => {
  const partnerId = (req as any).user?.id;

  const sql = `
    SELECT id, \`total amount\` AS total_amount, delivery_fee, tracking_status, \`created at\` AS created_at
    FROM orders
    WHERE delivery_partner_id = ? AND tracking_status = 'DELIVERED'
    ORDER BY \`created at\` DESC
  `;

  db.query(sql, [partnerId], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getDeliveryEarnings error:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch earnings", data: [] });
    }

    const all = rows || [];
    // 🚩 BUSINESS LOGIC: 10% Platform Commission
    // Partner gets 90% of the delivery_fee
    const COMMISSION_RATE = 0.9; 
    
    const totalEarnings = all.reduce((s: number, r: any) => s + (Number(r.delivery_fee || 20) * COMMISSION_RATE), 0);
    const totalDeliveries = all.length;

    const today = new Date().toDateString();
    const todayOrders = all.filter((r: any) => new Date(r.created_at).toDateString() === today);
    const todayEarnings = todayOrders.reduce((s: number, r: any) => s + (Number(r.delivery_fee || 20) * COMMISSION_RATE), 0);

    return res.json({
      success: true,
      data: {
        totalEarnings: Number(totalEarnings.toFixed(2)),
        totalDeliveries,
        todayEarnings: Number(todayEarnings.toFixed(2)),
        todayDeliveries: todayOrders.length,
        history: all,
      },
    });
  });
};

/* ======================================================
   🟢 TOGGLE ONLINE STATUS
   POST /api/delivery/toggle-online
====================================================== */
export const toggleDeliveryOnline = (req: Request, res: Response) => {
  const partnerId = (req as any).user?.id;
  const { is_online } = req.body;

  if (typeof is_online !== 'boolean') {
    return res.status(400).json({ success: false, message: "is_online (boolean) required" });
  }

  db.query(
    "UPDATE delivery_partners SET `is active` = ? WHERE id = ?",
    [is_online ? 1 : 0, partnerId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: "Status update failed" });
      res.json({ success: true, message: `Status updated to ${is_online ? 'online' : 'offline'}` });
    }
  );
};

/* ======================================================
   🤖 AUTO-ASSIGN NEAREST PARTNER
   Helper function (called during order confirmation)
====================================================== */
export const autoAssignNearestPartner = (orderId: number, userLat: number, userLng: number) => {
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

  db.query(sql, [userLat, userLng, userLat], (err, rows: any[]) => {
    if (err || !rows?.length) {
      console.log(`⚠️ No online partners found for Order #${orderId}`);
      return;
    }

    const partnerId = rows[0].id;
    const updateSql = "UPDATE orders SET delivery_partner_id = ?, tracking_status = 'ACCEPTED' WHERE id = ?";
    
    db.query(updateSql, [partnerId, orderId], (updateErr) => {
      if (!updateErr) {
        console.log(`✅ Order #${orderId} auto-assigned to Partner #${partnerId}`);
        // Notify partner
        triggerOrderNotification(partnerId, `🚚 New Order #${orderId} assigned to you!`);
      }
    });
  });
};

/* ======================================================
   📍 GET NEARBY GROCERY ORDERS (20 KM RADIUS)
====================================================== */
export const getActiveDeliveryOrders = (req: any, res: any) => {
  const partnerId = req.user?.id;
  const courierLat = Number(req.query.lat) && !isNaN(Number(req.query.lat)) ? Number(req.query.lat) : 10.938354;
  const courierLng = Number(req.query.lng) && !isNaN(Number(req.query.lng)) ? Number(req.query.lng) : 78.418579;

  // 1. Verify debt metrics directly out of the delivery_partners table ⏱️
  const checkLockoutSql = `SELECT wallet_balance, commission_due_since FROM delivery_partners WHERE id = ?`;
  
  db.query(checkLockoutSql, [partnerId], (lockErr, partnerResults: any) => {
    if (lockErr) return res.status(500).json({ success: false, error: lockErr.message });
    
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
        o.\`address\`, 
        o.\`phone\`, 
        o.\`payment_method\`,
        o.\`created at\`,
        u.latitude AS customer_lat,
        u.longitude AS customer_lng,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'product_name', COALESCE(oi.product_name, ''),
            'unit_price', COALESCE(oi.unit_price, 0.00),
            'weight', COALESCE(oi.weight, 0.00),
            'total_price', COALESCE(oi.total_price, 0.00),
            'image', COALESCE(oi.image, '')
          )
        ) AS items,
        (
          6371 * acos(
            cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(u.latitude))
          )
        ) AS distance
      FROM \`orders\` o
      JOIN \`users\` u ON o.\`user id\` = u.id
      LEFT JOIN \`order_items\` oi ON o.id = oi.order_id
      WHERE o.\`delivery_status\` != 'DELIVERED' 
        AND o.\`status\` != 'CANCELLED'
        AND NOT EXISTS (
          SELECT 1 FROM \`order_items\` oi2 
          WHERE oi2.order_id = o.id 
            AND (LOWER(oi2.category) = 'garlands' OR LOWER(oi2.product_name) LIKE '%garland%')
        )
      GROUP BY o.id
      HAVING distance <= 20
      ORDER BY o.id DESC
    `;

    db.query(fetchOrdersSql, [courierLat, courierLng, courierLat], (err, results: any) => {
      if (err) {
        console.error("❌ Database query execution crash inside delivery controller:", err.message);
        return res.status(500).json({ success: false, error: err.message });
      }

      const formattedData = results.map((row: any) => {
        let parsedItems = [];
        try {
          parsedItems = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
        } catch (parseError) {
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

/* ======================================================
   🔐 VERIFY DELIVERY OTP (For Online Orders)
   POST /api/delivery/verify-otp
   Body: { orderId, otp }
====================================================== */
export const verifyDeliveryOtp = (req: Request, res: Response) => {
  const { orderId, otp } = req.body;
  const partnerId = (req as any).user?.id;

  if (!orderId || !otp) {
    return res.status(400).json({ success: false, message: "Order ID and OTP are required" });
  }

  if (String(otp).length !== 4) {
    return res.status(400).json({ success: false, message: "OTP must be exactly 4 digits" });
  }

  db.query(
    "SELECT delivery_otp, delivery_status, payment_method, `user id` FROM orders WHERE id = ? AND delivery_partner_id = ? LIMIT 1",
    [orderId, partnerId],
    (err: any, rows: any[]) => {
      if (err) return res.status(500).json({ success: false, message: "Database error" });
      if (rows.length === 0) return res.status(404).json({ success: false, message: "Order not found or assigned to another partner." });

      const order = rows[0];
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

      db.query(updateSql, [orderId], (updateErr) => {
        if (updateErr) {
          console.error("❌ Failed to finalize order via OTP:", updateErr);
          return res.status(500).json({ success: false, message: "Failed to verify OTP and complete order" });
        }

        const logMessage = `🎉 Order #${orderId} has been securely delivered via OTP verification! Thank you for shopping with VillageMart.`;
        
        const notifySql = "INSERT INTO `notifications` (`user id`, message, `is read`) VALUES (?, ?, 0)";
        db.query(notifySql, [order["user id"], logMessage], (nErr) => {
          if (nErr) console.error("❌ Notification layer failure:", nErr);
        });

        return res.json({
          success: true,
          message: `OTP Verified! Order #${orderId} marked as DELIVERED.`,
          data: { status: "DELIVERED" },
        });
      });
    }
  );
};

