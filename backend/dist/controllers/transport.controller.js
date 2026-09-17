"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRide = exports.submitRideSupport = exports.rateRide = exports.getRideDetails = exports.getRideHistory = exports.createRazorpayOrder = exports.calculateTransportFare = exports.startRideWithOtp = exports.getActiveTransportRides = exports.confirmTransportBooking = exports.getUserTransportBookings = exports.getAllTransportBookings = exports.createTransportBooking = void 0;
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const db_1 = __importDefault(require("../db"));
const notification_utils_1 = require("../utils/notification.utils");
const mailer_1 = require("../utils/mailer");
const server_1 = require("../server");
const TRANSPORT_RATE_PER_KM = 15;
db_1.default.query(`
  CREATE TABLE IF NOT EXISTS transport_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    \`user id\` INT NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(25) NOT NULL,
    from_address TEXT NOT NULL,
    \`from lat\` DOUBLE NOT NULL,
    from_Ing DOUBLE NOT NULL,
    \`to address\` TEXT NOT NULL,
    \`to lat\` DOUBLE NOT NULL,
    \`to Ing\` DOUBLE NOT NULL,
    \`distance km\` DECIMAL(10,2) NOT NULL,
    charge_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'BOOKED',
    notes TEXT NULL,
    \`created at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    driver_id INT,
    ride_status ENUM('BOOKED', 'ACCEPTED', 'STARTED', 'COMPLETED') DEFAULT 'BOOKED',
    INDEX idx_transport_user (\`user id\`),
    INDEX idx_transport_created (\`created at\`)
  )
  `, (err) => {
    if (err) {
        console.error("❌ Could not ensure transport_bookings table:", err);
    }
});
const toNum = (value) => Number(value);
const isFiniteNum = (value) => Number.isFinite(toNum(value));
const haversineKm = (from, to) => {
    const earthRadiusKm = 6371;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((from.lat * Math.PI) / 180) *
            Math.cos((to.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
};
const createTransportBooking = async (req, res) => {
    try {
        const { userId, customerName, customerPhone, fromAddress, fromLat, fromLng, toAddress, toLat, toLng, notes, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const paymentMethodRaw = String(req.body.paymentMethod || req.body.payment_method || 'CASH').toUpperCase();
        const isOnline = paymentMethodRaw === 'ONLINE' || paymentMethodRaw === 'UPI' || paymentMethodRaw === 'CARD' || razorpay_payment_id;
        const finalPaymentMethod = isOnline ? 'ONLINE' : 'CASH';
        const promiseDb = db_1.default.promise();
        // ---------------------------------------------------------
        // ONLINE FINALIZATION FLOW
        // ---------------------------------------------------------
        if (isOnline) {
            if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
                return res.status(400).json({ success: false, code: "MISSING_PAYMENT_FIELD", message: "razorpay_payment_id, order_id, and signature are required for ONLINE payment" });
            }
            const secret = process.env.RAZORPAY_KEY_SECRET;
            if (!secret)
                return res.status(500).json({ success: false, message: "SERVER_ERROR: Razorpay secret is not configured" });
            const generatedSignature = crypto_1.default.createHmac("sha256", secret).update(razorpay_order_id + "|" + razorpay_payment_id).digest("hex");
            if (generatedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, code: "SIGNATURE_MISMATCH", message: "PAYMENT_VERIFICATION_FAILED: Signature mismatch" });
            }
            // Check if intent exists
            const [existingIntent] = await promiseDb.query("SELECT * FROM transport_bookings WHERE razorpay_order_id = ?", [razorpay_order_id]);
            if (existingIntent.length === 0) {
                return res.status(404).json({ success: false, message: "INTENT_NOT_FOUND: No booking intent found for this order ID." });
            }
            // Idempotency: if already PAID, return success
            if (existingIntent[0].payment_status === 'PAID') {
                return res.json({ success: true, duplicate: true, alreadyExists: true, bookingId: existingIntent[0].id, otp: existingIntent[0].ride_otp });
            }
            // Finalize it
            const paymentPaidAt = new Date();
            await promiseDb.query(`
        UPDATE transport_bookings SET 
          payment_status = 'PAID',
          ride_status = 'BOOKED',
          razorpay_payment_id = ?,
          razorpay_signature = ?,
          payment_paid_at = ?,
          payment_method = 'ONLINE'
        WHERE razorpay_order_id = ?
      `, [razorpay_payment_id, razorpay_signature, paymentPaidAt, razorpay_order_id]);
            const bookingId = existingIntent[0].id;
            const rideOtp = existingIntent[0].ride_otp;
            const chargeAmount = existingIntent[0].charge_amount;
            const validatedVehicleType = existingIntent[0].vehicle_type;
            // Async Notifications
            (0, notification_utils_1.createAndSendNotification)(Number(userId), "CUSTOMER", "🛵 Transport Booked", `Transport (${validatedVehicleType}) booked. Charge ₹${chargeAmount}`, { type: "TRANSPORT_BOOKED", entityType: "transport", bookingId: String(bookingId), route: "/?app=consumer/transport", channelId: "villagesmart_rides" });
            (0, notification_utils_1.createAndSendNotification)(Number(userId), "CUSTOMER", "🔐 Ride OTP", `Your ride OTP is: ${rideOtp}\nShare this OTP with the driver to start your ride.`, { type: "TRANSPORT_OTP", entityType: "transport", bookingId: String(bookingId), route: "/?app=consumer/transport", channelId: "villagesmart_rides", priority: "high" });
            server_1.io.to(`user_${userId}`).emit("new_otp", { type: "TRANSPORT_OTP", bookingId, otp: rideOtp });
            console.log(`✅ Finalized Online Booking: ${bookingId}`);
            return res.status(200).json({ success: true, bookingId, rideOtp, otp: rideOtp, message: "Your ride is booked! Here is your OTP." });
        }
        // ---------------------------------------------------------
        // CASH FLOW
        // ---------------------------------------------------------
        if (!userId || !customerName || !customerPhone || !fromAddress || !toAddress || !isFiniteNum(fromLat) || !isFiniteNum(fromLng) || !isFiniteNum(toLat) || !isFiniteNum(toLng)) {
            return res.status(400).json({ success: false, code: "MISSING_BOOKING_FIELD", message: "VALIDATION_ERROR: Invalid transport booking data" });
        }
        const from = { lat: toNum(fromLat), lng: toNum(fromLng) };
        const to = { lat: toNum(toLat), lng: toNum(toLng) };
        const distanceKm = Number(req.body.distanceKm) || Number(req.body.distance) || haversineKm(from, to);
        if (!Number.isFinite(distanceKm) || distanceKm <= 0)
            return res.status(400).json({ success: false, code: "INVALID_DISTANCE", message: "VALIDATION_ERROR: Unable to calculate transport distance" });
        const roundedDistance = Number(distanceKm.toFixed(2));
        const rawVehicleType = req.body.vehicle_type || req.body.vehicleType || "auto";
        let validatedVehicleType = String(rawVehicleType).toLowerCase().trim();
        if (validatedVehicleType === "scooter/bike" || validatedVehicleType === "scooter")
            validatedVehicleType = "bike";
        else if (!["bike", "auto", "car"].includes(validatedVehicleType))
            validatedVehicleType = "auto";
        let baseRate = 25;
        let perKmRate = 12;
        if (validatedVehicleType === "bike") {
            baseRate = 10;
            perKmRate = 8;
        }
        else if (validatedVehicleType === "car") {
            baseRate = 40;
            perKmRate = 18;
        }
        let chargeAmount = Number(req.body.chargeAmount) || Number(req.body.charge);
        if (!chargeAmount)
            chargeAmount = Number((baseRate + roundedDistance * perKmRate).toFixed(2));
        const rideOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const paymentIdempotencyKey = `CASH:${userId}:${Date.now()}`;
        // For idempotency across multiple clicks on CASH checkout
        const [dupCheck] = await promiseDb.query("SELECT * FROM transport_bookings WHERE payment_idempotency_key = ?", [paymentIdempotencyKey]);
        if (dupCheck.length > 0) {
            return res.json({ success: true, duplicate: true, alreadyExists: true, bookingId: dupCheck[0].id, otp: dupCheck[0].ride_otp });
        }
        const bookingNumber = "TRN-" + Math.floor(100000 + Math.random() * 900000).toString();
        const sql = `INSERT INTO transport_bookings (
      \`user id\`, customer_name, customer_phone, from_address, \`from lat\`, from_Ing, \`to address\`, \`to lat\`, \`to Ing\`, \`distance km\`, charge_amount, notes, vehicle_type, ride_otp, status, ride_status, 
      payment_method, payment_status, payment_idempotency_key, booking_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED', 'BOOKED', ?, 'PENDING', ?, ?)`;
        const [result] = await promiseDb.query(sql, [
            Number(userId), customerName, customerPhone, fromAddress, from.lat, from.lng, toAddress, to.lat, to.lng, roundedDistance, chargeAmount, notes || null,
            validatedVehicleType, rideOtp, finalPaymentMethod, paymentIdempotencyKey, bookingNumber
        ]);
        const newBookingId = result.insertId;
        (0, notification_utils_1.createAndSendNotification)(Number(userId), "CUSTOMER", "🛵 Transport Booked", `Transport (${validatedVehicleType}) booked. Charge ₹${chargeAmount}`, { type: "TRANSPORT_BOOKED", entityType: "transport", bookingId: String(newBookingId), route: "/?app=consumer/transport", channelId: "villagesmart_rides" });
        (0, notification_utils_1.createAndSendNotification)(Number(userId), "CUSTOMER", "🔐 Ride OTP", `Your ride OTP is: ${rideOtp}\nShare this OTP with the driver to start your ride.`, { type: "TRANSPORT_OTP", entityType: "transport", bookingId: String(newBookingId), route: "/?app=consumer/transport", channelId: "villagesmart_rides", priority: "high" });
        server_1.io.to(`user_${userId}`).emit("new_otp", { type: "TRANSPORT_OTP", bookingId: newBookingId, otp: rideOtp });
        db_1.default.query("SELECT email, name FROM users WHERE id = ?", [Number(userId)], (uErr, uRows) => {
            if (!uErr && uRows && uRows.length > 0) {
                // @ts-ignore
                (0, mailer_1.sendTransportBookingConfirmMail)({ to: uRows[0].email, username: uRows[0].name || customerName, bookingId: newBookingId, fromAddress, toAddress, vehicleType: validatedVehicleType, chargeAmount }).catch(() => { });
            }
        });
        console.log(`✅ Created Cash Booking: ${newBookingId}`);
        return res.status(200).json({ success: true, bookingId: newBookingId, rideOtp, otp: rideOtp, message: "Your ride is booked! Here is your OTP." });
    }
    catch (err) {
        console.error("❌ Transport booking error:", err);
        return res.status(500).json({ success: false, message: "BOOKING_CREATION_ERROR: Unexpected error occurred", error: err.message });
    }
};
exports.createTransportBooking = createTransportBooking;
const getAllTransportBookings = (req, res) => {
    const sql = `
    SELECT
      tb.id,
      tb.\`user id\` AS user_id,
      tb.customer_name,
      tb.customer_phone,
      tb.from_address,
      tb.\`from lat\` AS from_lat,
      tb.from_Ing AS from_lng,
      tb.\`to address\` AS to_address,
      tb.\`to lat\` AS to_lat,
      tb.\`to Ing\` AS to_lng,
      tb.\`distance km\` AS distance_km,
      tb.charge_amount,
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
      tb.vehicle_type,
      u.username,
      u.email,
      tp.name AS driver_name,
      tp.phone AS driver_phone,
      tp.vehicle_number
    FROM transport_bookings tb
    JOIN users u ON u.id = tb.\`user id\`
    LEFT JOIN transport_partners tp ON tp.id = tb.driver_id
    ORDER BY tb.\`created at\` DESC
  `;
    db_1.default.query(sql, (err, rows) => {
        if (err) {
            console.error("❌ getAllTransportBookings error:", err);
            return res.status(500).json([]);
        }
        return res.json(rows || []);
    });
};
exports.getAllTransportBookings = getAllTransportBookings;
const getUserTransportBookings = (req, res) => {
    const userId = Number(req.params.userId);
    if (!userId)
        return res.status(400).json({ message: "Invalid user id" });
    const reqUser = req.user;
    if (reqUser?.role !== "ADMIN" && reqUser?.id !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
    }
    const sql = `
    SELECT
      id,
      \`user id\` AS user_id,
      customer_name,
      customer_phone,
      from_address,
      \`to address\` AS to_address,
      \`distance km\` AS distance_km,
      charge_amount,
      status,
      notes,
      \`created at\` AS created_at,
      vehicle_type
    FROM transport_bookings
    WHERE \`user id\` = ?
    ORDER BY \`created at\` DESC
  `;
    db_1.default.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error("❌ getUserTransportBookings error:", err);
            return res.status(500).json([]);
        }
        return res.json(rows || []);
    });
};
exports.getUserTransportBookings = getUserTransportBookings;
const confirmTransportBooking = (req, res) => {
    const bookingId = Number(req.params.bookingId);
    const driverId = req.user?.id || null;
    if (!bookingId)
        return res.status(400).json({ message: "Invalid booking id" });
    const sql = `
    SELECT tb.*, u.email, u.username
    FROM transport_bookings tb
    JOIN users u ON u.id = tb.\`user id\`
    WHERE tb.id = ?
    LIMIT 1
  `;
    db_1.default.query(sql, [bookingId], (err, rows) => {
        if (err || !rows?.length) {
            console.error("❌ confirmTransportBooking fetch error:", err);
            return res.status(404).json({ message: "Transport booking not found" });
        }
        const row = rows[0];
        if (String(row.status).toUpperCase() === "CONFIRMED") {
            return res.status(409).json({ message: "Transport booking already confirmed" });
        }
        // 🎯 FIXED: Sync both status and ride_status columns, and assign the driver
        db_1.default.query("UPDATE transport_bookings SET status='CONFIRMED', ride_status='ACCEPTED', `driver_id`=?, `driver id`=? WHERE id=?", [driverId, driverId, bookingId], (updateErr) => {
            if (updateErr) {
                console.error("❌ confirmTransportBooking update error:", updateErr);
                return res.status(500).json({ message: "Failed to confirm transport booking" });
            }
            // 🔔 Notify customer
            (0, notification_utils_1.createAndSendNotification)(Number(row["user id"]), "CUSTOMER", "✅ Transport Confirmed", `Transport booking #${bookingId} confirmed by admin`, { type: "TRANSPORT_CONFIRMED", entityType: "transport", bookingId: String(bookingId), route: "/?app=consumer/transport", channelId: "villagesmart_rides" });
            const userMail = String(row.email || "").trim();
            const adminMail = (process.env.ADMIN_EMAIL || process.env.EMAIL_USER || "").trim();
            Promise.all([
                userMail
                    ? (0, mailer_1.sendTransportBookingConfirmMail)({
                        to: userMail,
                        username: row.username || row.customer_name,
                        bookingId,
                        fromAddress: row.from_address,
                        toAddress: row["to address"],
                        chargeAmount: Number(row.charge_amount),
                    })
                    : Promise.resolve(),
                adminMail
                    ? mailer_1.transporter.sendMail({
                        to: adminMail,
                        subject: `Admin Copy: Transport Confirmed (#${bookingId})`,
                        html: `<p>Transport booking #${bookingId} confirmed for ${row.username || row.customer_name}.</p>`,
                    })
                    : Promise.resolve(),
            ]).catch((mailErr) => {
                console.warn(`⚠️ Warning: Could not send confirmation email (Network/SMTP issue). The ride is still confirmed. (${mailErr.message})`);
            });
            // ✅ FIXED: Return response to client (was missing — caused client to hang)
            return res.json({
                success: true,
                message: `Transport booking #${bookingId} confirmed`,
                data: { bookingId, status: "CONFIRMED" },
            });
        });
    });
};
exports.confirmTransportBooking = confirmTransportBooking;
/* ======================================================
   📍 GET NEARBY RIDES (20 KM RADIUS)
====================================================== */
const getActiveTransportRides = (req, res) => {
    const driverLat = Number(req.query.lat || 10.938354);
    const driverLng = Number(req.query.lng || 78.418579);
    const partnerId = req.user?.id;
    const checkLockoutSql = `SELECT wallet_balance, commission_due_since, vehicle_type FROM transport_partners WHERE id = ?`;
    db_1.default.query(checkLockoutSql, [partnerId], (lockErr, partnerResults) => {
        if (lockErr)
            return res.status(500).json({ success: false, error: lockErr.message });
        if (partnerResults.length === 0) {
            return res.status(404).json({ success: false, message: "Driver profile not found." });
        }
        const { wallet_balance, commission_due_since, vehicle_type } = partnerResults[0];
        if (wallet_balance < 0 && commission_due_since) {
            const hoursElapsed = (new Date().getTime() - new Date(commission_due_since).getTime()) / (1000 * 60 * 60);
            if (hoursElapsed >= 30) {
                return res.status(402).json({
                    success: false,
                    isLockedOut: true,
                    message: "Ride Stream Locked: Settle outstanding commission balances to clear your application dashboard.",
                    walletBalance: wallet_balance,
                    hoursElapsed: Math.floor(hoursElapsed)
                });
            }
        }
        const driverVehicleType = vehicle_type || "bike";
        console.log(`🏍️ Driver #${partnerId} requesting feed for vehicle type: ${driverVehicleType}`);
        const sql = `
      SELECT *, \`distance km\` AS distance_km, (
        6371 * acos(
          cos(radians(?)) * cos(radians(\`from lat\`)) * cos(radians(\`from_Ing\`) - radians(?)) + 
          sin(radians(?)) * sin(radians(\`from lat\`))
        )
      ) AS driver_distance 
      FROM \`transport_bookings\` 
      WHERE \`ride_status\` = 'BOOKED' 
        AND \`status\` = 'BOOKED'
        AND LOWER(vehicle_type) = LOWER(?)
      HAVING driver_distance <= 150 
      ORDER BY id DESC
    `;
        db_1.default.query(sql, [driverLat, driverLng, driverLat, driverVehicleType], (err, results) => {
            if (err) {
                console.error("❌ Database query execution crash inside transport controller:", err.message);
                return res.status(500).json({ success: false, error: err.message });
            }
            return res.status(200).json({ success: true, data: results });
        });
    });
};
exports.getActiveTransportRides = getActiveTransportRides;
/* ======================================================
   🔐 START RIDE WITH OTP
====================================================== */
const startRideWithOtp = (req, res) => {
    const { id } = req.params;
    const { otp } = req.body;
    db_1.default.query("SELECT `ride_otp` FROM transport_bookings WHERE id = ?", [id], (err, result) => {
        if (err || !result.length)
            return res.status(404).json({ message: "Ride not found" });
        if (String(result[0].ride_otp) !== String(otp)) {
            return res.status(400).json({ success: false, message: "Invalid verification token OTP" });
        }
        db_1.default.query("UPDATE transport_bookings SET `ride_status` = 'STARTED' WHERE id = ?", [id], (upErr) => {
            if (upErr)
                return res.status(500).json({ error: upErr.message });
            res.status(200).json({ success: true, message: "Ride verified and started successfully!" });
        });
    });
};
exports.startRideWithOtp = startRideWithOtp;
const calculateTransportFare = (distanceKm, vehicleTypeRaw) => {
    let validatedVehicleType = String(vehicleTypeRaw).toLowerCase().trim();
    if (validatedVehicleType === "scooter/bike") {
        validatedVehicleType = "bike"; // Legacy fallback
    }
    else if (!["scooter", "bike", "auto", "car"].includes(validatedVehicleType)) {
        validatedVehicleType = "auto";
    }
    let total = 0;
    if (validatedVehicleType === "scooter") {
        total = 10 + distanceKm * 8;
    }
    else if (validatedVehicleType === "bike") {
        total = 12 + distanceKm * 10;
    }
    else if (validatedVehicleType === "car") {
        total = 25 + distanceKm * 15;
    }
    else {
        total = 18 + distanceKm * 12; // auto default
    }
    return Math.round(total);
};
exports.calculateTransportFare = calculateTransportFare;
const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, currency = "INR", distanceKm, vehicleType, userId, customerName, customerPhone, fromAddress, fromLat, fromLng, toAddress, toLat, toLng, notes } = req.body;
        let finalAmount = amount;
        if (distanceKm && vehicleType && typeof exports.calculateTransportFare === 'function') {
            finalAmount = (0, exports.calculateTransportFare)(Number(distanceKm), vehicleType);
        }
        if (!finalAmount)
            return res.status(400).json({ success: false, message: "Amount is required" });
        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ success: false, message: "SERVER_CONFIG_ERROR: Razorpay secret is missing. Cannot process online payment." });
        }
        const razorpay = new razorpay_1.default({
            key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_TOLYiM4RjeLYDR",
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const options = { amount: Math.round(Number(finalAmount) * 100), currency, receipt: "rcpt_transport_" + Date.now() };
        const order = await razorpay.orders.create(options);
        if (userId && fromLat && fromLng) {
            const promiseDb = db_1.default.promise();
            const from = { lat: Number(fromLat), lng: Number(fromLng) };
            const to = { lat: Number(toLat), lng: Number(toLng) };
            const rideOtp = Math.floor(1000 + Math.random() * 9000).toString();
            const paymentIdempotencyKey = `ONLINE_INTENT:${order.id}`;
            let validatedVehicleType = String(vehicleType || "auto").toLowerCase().trim();
            if (validatedVehicleType === "scooter/bike" || validatedVehicleType === "scooter")
                validatedVehicleType = "bike";
            const sql = `INSERT INTO transport_bookings (
        \`user id\`, customer_name, customer_phone, from_address, \`from lat\`, from_Ing, \`to address\`, \`to lat\`, \`to Ing\`, \`distance km\`, charge_amount, notes, vehicle_type, ride_otp, status, ride_status, 
        payment_method, payment_status, razorpay_order_id, payment_idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED', 'BOOKED', 'ONLINE', 'PENDING', ?, ?)`;
            await promiseDb.query(sql, [
                Number(userId), customerName || "Guest", customerPhone || "", fromAddress || "", from.lat, from.lng, toAddress || "", to.lat, to.lng, Number(distanceKm || 0), finalAmount, notes || null,
                validatedVehicleType, rideOtp, order.id, paymentIdempotencyKey
            ]);
            console.log(`✅ Created Razorpay intent: ${order.id} for User: ${userId}`);
        }
        return res.status(200).json({ success: true, razorpay_order_id: order.id, amount: order.amount, currency: order.currency });
    }
    catch (error) {
        console.error("Razorpay Order Creation Failed:", error);
        return res.status(502).json({ success: false, code: "RAZORPAY_ORDER_CREATE_FAILED", message: "Unable to initialize online payment.", error: error?.error?.description || error.message });
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
const getRideHistory = (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const sql = `
    SELECT
      tb.id,
      tb.id AS booking_number,
      tb.\`user id\` AS user_id,
      tb.customer_name,
      tb.customer_phone,
      tb.from_address,
      tb.\`from lat\` AS from_lat,
      tb.from_Ing AS from_lng,
      tb.\`to address\`, 
      tb.\`to lat\` AS to_lat,
      tb.\`to Ing\` AS to_lng,
      tb.\`distance km\` AS distance_km,
      tb.charge_amount,
      tb.status,
      tb.ride_status,
      tb.notes,
      tb.\`created at\`,
      tb.ride_completed_at,
      tb.payment_method,
      tb.payment_status,
      tb.vehicle_type,
      tb.ride_otp,
      tp.name AS driver_name,
      tp.vehicle_number,
      tp.profile_image
    FROM transport_bookings tb
    LEFT JOIN transport_partners tp ON tp.id = tb.driver_id
    WHERE tb.\`user id\` = ?
    ORDER BY tb.\`created at\` DESC, tb.id DESC
  `;
    db_1.default.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error("❌ getRideHistory error:", err);
            return res.status(500).json({ success: false, message: "Failed to load ride history" });
        }
        return res.json({ success: true, rides: rows || [] });
    });
};
exports.getRideHistory = getRideHistory;
const getRideDetails = (req, res) => {
    const userId = req.user?.id;
    const rideId = req.params.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const sql = `
    SELECT
      tb.id,
      tb.id AS booking_number,
      tb.\`user id\` AS user_id,
      tb.customer_name,
      tb.customer_phone,
      tb.from_address,
      tb.\`from lat\` AS from_lat,
      tb.from_Ing AS from_lng,
      tb.\`to address\`, 
      tb.\`to lat\` AS to_lat,
      tb.\`to Ing\` AS to_lng,
      tb.\`distance km\` AS distance_km,
      tb.charge_amount,
      tb.status,
      tb.ride_status,
      tb.notes,
      tb.\`created at\`,
      tb.ride_completed_at,
      tb.payment_method,
      tb.payment_status,
      tb.vehicle_type,
      tb.ride_otp,
      tp.name AS driver_name,
      tp.vehicle_number,
      tp.profile_image
    FROM transport_bookings tb
    LEFT JOIN transport_partners tp ON tp.id = tb.driver_id
    WHERE tb.id = ? AND tb.\`user id\` = ?
  `;
    db_1.default.query(sql, [rideId, userId], (err, rows) => {
        if (err) {
            console.error("❌ getRideDetails error:", err);
            return res.status(500).json({ success: false, message: "Failed to load ride details" });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Ride not found" });
        }
        return res.json({ success: true, ride: rows[0] });
    });
};
exports.getRideDetails = getRideDetails;
const rateRide = (req, res) => res.json({ success: true });
exports.rateRide = rateRide;
const submitRideSupport = (req, res) => {
    const rideId = req.params.id;
    const issue = req.body.issue;
    const userId = req.user?.id; // from verifyToken
    if (!userId || !rideId || !issue) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    // 1. Verify ride ownership
    const rideQuery = `SELECT id FROM transport_bookings WHERE id = ? AND \`user id\` = ?`;
    db_1.default.query(rideQuery, [rideId, userId], (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Database error" });
        if (!rows || rows.length === 0)
            return res.status(403).json({ success: false, message: "Unauthorized access to ride" });
        // 2. Insert Support Ticket
        const insertSql = `
      INSERT INTO support_tickets (user_id, ride_id, issue, status, priority, created_at)
      VALUES (?, ?, ?, 'OPEN', 'HIGH', NOW())
    `;
        db_1.default.query(insertSql, [userId, rideId, issue], (insErr, result) => {
            if (insErr) {
                console.error("❌ Failed to create support ticket:", insErr);
                return res.status(500).json({ success: false, message: "Failed to create support ticket" });
            }
            const ticketId = result.insertId;
            // 3. Update transport_bookings with support ticket ref
            db_1.default.query("UPDATE transport_bookings SET support_ticket = ? WHERE id = ?", [ticketId, rideId], (uErr) => {
                if (uErr)
                    console.error("❌ Failed to update support_ticket in transport_bookings:", uErr);
            });
            // 4. Create Admin Notification
            const adminNotifText = `🚨 URGENT: New Support Ticket (#${ticketId}) for Ride #${rideId}. Issue: ${issue.substring(0, 50)}...`;
            const insertNotifSql = "INSERT INTO notifications (`user id`, message, `is read`) VALUES (1, ?, 0)";
            db_1.default.query(insertNotifSql, [adminNotifText], (nErr) => {
                if (nErr)
                    console.error("❌ Failed to insert admin support notification:", nErr);
            });
            // 5. Emit Real-time Admin Socket Event
            try {
                server_1.io.to(`user_1`).emit("new_notification", {
                    message: adminNotifText,
                    timestamp: new Date()
                });
            }
            catch (e) {
                console.error("❌ Socket emit failed for support ticket:", e);
            }
            return res.json({ success: true, message: "Support ticket created. We'll contact you soon." });
        });
    });
};
exports.submitRideSupport = submitRideSupport;
/* ======================================================
   ❌ CANCEL RIDE (Customer — only before driver accepts)
====================================================== */
const cancelRide = (req, res) => {
    const userId = req.user?.id;
    const rideId = req.params.id;
    if (!userId || !rideId) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    // 1. Verify ownership and current status
    db_1.default.query("SELECT id, `user id`, ride_status, driver_id FROM transport_bookings WHERE id = ? AND `user id` = ? LIMIT 1", [rideId, userId], (err, rows) => {
        if (err) {
            console.error("❌ cancelRide DB error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Ride not found or you don't have permission to cancel it." });
        }
        const ride = rows[0];
        const currentStatus = (ride.ride_status || "").toUpperCase();
        // 2. Only allow cancellation if ride is still BOOKED (no driver accepted yet)
        if (currentStatus !== "BOOKED") {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel ride. Current status is ${currentStatus}. Cancellation is only allowed before a driver accepts.`,
            });
        }
        // 3. Update to CANCELLED
        const updateSql = `
        UPDATE transport_bookings
        SET ride_status = 'CANCELLED',
            status = 'CANCELLED',
            ride_cancelled_at = NOW()
        WHERE id = ?
      `;
        db_1.default.query(updateSql, [rideId], (updateErr) => {
            if (updateErr) {
                console.error("❌ cancelRide update error:", updateErr);
                return res.status(500).json({ success: false, message: "Failed to cancel ride" });
            }
            // 4. Notify the customer
            (0, notification_utils_1.createAndSendNotification)(Number(userId), "CUSTOMER", "❌ Ride Cancelled", `Your ride #${rideId} has been cancelled.`, { type: "TRANSPORT_CANCELLED", entityType: "transport", bookingId: String(rideId), route: "/?app=consumer/transport", channelId: "villagesmart_rides" });
            // 5. Emit socket event so any listening driver dashboards remove this ride
            server_1.io.emit("ride_cancelled", { rideId: Number(rideId) });
            console.log(`✅ Ride #${rideId} cancelled by customer #${userId}`);
            return res.json({ success: true, message: "Ride cancelled successfully." });
        });
    });
};
exports.cancelRide = cancelRide;
