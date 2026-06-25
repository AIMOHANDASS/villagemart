"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoAssignNearestDriver = exports.toggleTransportOnline = exports.getDriverEarnings = exports.updateDriverLocation = exports.verifyRideOtp = exports.updateRideStatus = exports.acceptRide = exports.getMyActiveRide = exports.getDriverBookings = exports.loginTransportPartner = exports.signupTransportPartner = exports.triggerOrderNotification = void 0;
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const mailer_1 = require("../utils/mailer");
const triggerOrderNotification = (userId, textMessage) => {
    const sql = "INSERT INTO notifications (`user id`, message, `is read`) VALUES (?, ?, 0)";
    db_1.default.query(sql, [userId, textMessage], (err) => {
        if (err)
            console.error("❌ Failed to log automated background notification row:", err);
    });
};
exports.triggerOrderNotification = triggerOrderNotification;
/* ======================================================
   🗂 ENSURE TRANSPORT PARTNERS TABLE EXISTS
====================================================== */
db_1.default.query(`CREATE TABLE IF NOT EXISTS transport_partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(20),
    license_number VARCHAR(50),
    \`is active\` TINYINT(1) DEFAULT 1,
    \`is verified\` TINYINT(1) DEFAULT 0,
    \`created at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_image TEXT,
    \`document url\` TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
  )`, (err) => {
    if (err)
        console.error("❌ Could not ensure transport_partners table:", err);
});
/* ======================================================
   🔐 SIGNUP TRANSPORT PARTNER
   POST /api/transport-driver/signup
====================================================== */
const signupTransportPartner = async (req, res) => {
    const { name, email, phone, password, vehicle_type, vehicle_number, license_number } = req.body;
    if (!name || !email || !phone || !password) {
        return res.status(400).json({ success: false, message: "Name, email, phone, and password are required" });
    }
    const files = req.files;
    const profile_image = files?.['profile_image']?.[0]?.filename || null;
    const document_url = files?.['document']?.[0]?.filename || null;
    try {
        const checkSql = "SELECT id FROM transport_partners WHERE email = ? LIMIT 1";
        db_1.default.query(checkSql, [email], async (checkErr, rows) => {
            if (checkErr)
                return res.status(500).json({ success: false, message: "Database error" });
            if (rows.length > 0)
                return res.status(409).json({ success: false, message: "Email already exists" });
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const sql = `
        INSERT INTO transport_partners 
        (name, phone, email, password, vehicle_type, vehicle_number, license_number, profile_image, \`document url\`, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `;
            db_1.default.query(sql, [name, phone, email, hashedPassword, vehicle_type || null, vehicle_number || null, license_number || null, profile_image, document_url], (err, result) => {
                if (err) {
                    console.error("❌ Transport Partner Signup DB Error:", err);
                    return res.status(500).json({ success: false, message: `Signup failed: ${err.message}` });
                }
                return res.status(201).json({ success: true, message: "Transport partner registered successfully" });
            });
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.signupTransportPartner = signupTransportPartner;
/* ======================================================
   🔐 LOGIN TRANSPORT PARTNER
   POST /api/transport-driver/login
====================================================== */
const loginTransportPartner = (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    db_1.default.query("SELECT * FROM transport_partners WHERE email = ? LIMIT 1", [email], async (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Database error" });
        if (rows.length === 0)
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        const partner = rows[0];
        const isMatch = await bcryptjs_1.default.compare(password, partner.password);
        if (!isMatch)
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        // ✅ Enforce approval status
        if (partner.status !== "approved") {
            return res.status(403).json({
                success: false,
                message: "Waiting for admin approval",
                status: partner.status
            });
        }
        const token = (0, auth_middleware_1.generateToken)({ id: partner.id, username: partner.name, role: "TRANSPORT" });
        delete partner.password;
        return res.json({
            success: true,
            message: "Login successful",
            token,
            role: "TRANSPORT",
            user_id: partner.id,
            status: partner.status,
            data: partner,
        });
    });
};
exports.loginTransportPartner = loginTransportPartner;
/* ======================================================
   🚗 GET AVAILABLE RIDE BOOKINGS FOR DRIVER
   GET /api/transport-driver/bookings
====================================================== */
const getDriverBookings = (req, res) => {
    const partnerId = req.user?.id;
    const statusFilter = req.query.status
        ? String(req.query.status).toUpperCase()
        : null;
    const checkLockoutSql = `SELECT wallet_balance, commission_due_since FROM transport_partners WHERE id = ?`;
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
                        message: "Ride Stream Locked: Settle outstanding commission balances to clear your application dashboard.",
                        walletBalance: wallet_balance,
                        hoursElapsed: Math.floor(hoursElapsed)
                    });
                }
            }
        }
        let sql = `
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
        tb.notes,
        tb.\`created at\` AS created_at,
        tb.vehicle_type,
        u.username,
        u.email
      FROM transport_bookings tb
      JOIN users u ON u.id = tb.\`user id\`
    `;
        const params = [];
        if (statusFilter) {
            sql += ` WHERE UPPER(tb.status) = ?`;
            params.push(statusFilter);
        }
        sql += ` ORDER BY tb.\`created at\` DESC`;
        db_1.default.query(sql, params, (err, rows) => {
            if (err) {
                console.error("❌ getDriverBookings error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to fetch bookings",
                    data: [],
                });
            }
            return res.json({
                success: true,
                data: rows || [],
            });
        });
    });
};
exports.getDriverBookings = getDriverBookings;
/* ======================================================
   🚗 GET MY ACTIVE RIDE
   GET /api/transport-driver/my-active-ride
====================================================== */
const getMyActiveRide = (req, res) => {
    const driverId = req.user?.id;
    if (!driverId)
        return res.status(401).json({ success: false, message: "Driver not authenticated" });
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
      tb.notes,
      tb.\`created at\` AS created_at,
      tb.vehicle_type
    FROM transport_bookings tb
    WHERE tb.driver_id = ? AND tb.ride_status IN ('ACCEPTED', 'STARTED') AND tb.status != 'COMPLETED'
    ORDER BY tb.id DESC LIMIT 1
  `;
    db_1.default.query(sql, [driverId], (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Database error" });
        return res.json({ success: true, data: rows.length ? rows[0] : null });
    });
};
exports.getMyActiveRide = getMyActiveRide;
/* ======================================================
   🚗 ACCEPT RIDE
   POST /api/transport-driver/accept/:rideId
====================================================== */
const acceptRide = (req, res) => {
    const rideId = Number(req.params.rideId);
    const driverId = req.user?.id; // Logged-in driver ID from verified token payload
    if (!rideId || !driverId) {
        return res.status(400).json({ success: false, message: "Invalid request parameters" });
    }
    // 1. Ensure the ride is still unassigned ('BOOKED') to prevent double booking race-conditions
    const selectBookingSql = "SELECT * FROM `transport_bookings` WHERE id = ? AND `ride_status` = 'BOOKED'";
    db_1.default.query(selectBookingSql, [rideId], (err, bookings) => {
        if (err)
            return res.status(500).json({ success: false, error: err.message });
        if (bookings.length === 0) {
            return res.status(400).json({ success: false, message: "Ride has already been accepted or is unavailable." });
        }
        const activeBooking = bookings[0];
        // 2. Query the transport_partners table to fetch this specific driver's Name and Phone Number 🎯
        const selectDriverSql = "SELECT name, phone FROM `transport_partners` WHERE id = ?";
        db_1.default.query(selectDriverSql, [driverId], (dErr, drivers) => {
            if (dErr || drivers.length === 0) {
                return res.status(500).json({ success: false, message: "Failed to resolve driver credentials." });
            }
            const driverProfile = drivers[0];
            const driverName = driverProfile.name;
            const driverPhone = driverProfile.phone;
            // 3. Atomically assign the driver and advance status states cleanly
            // Note: we set both driver_id and `driver id` because previous columns might be named ambiguously
            const updateBookingSql = `
        UPDATE \`transport_bookings\` 
        SET \`ride_status\` = 'ACCEPTED', \`status\` = 'CONFIRMED', driver_id = ?, \`driver id\` = ? 
        WHERE id = ?
      `;
            db_1.default.query(updateBookingSql, [driverId, driverId, rideId], (upErr) => {
                if (upErr) {
                    // Fallback if `driver id` column doesn't exist (some databases have just driver_id)
                    const fallbackSql = `UPDATE \`transport_bookings\` SET \`ride_status\` = 'ACCEPTED', \`status\` = 'CONFIRMED', driver_id = ? WHERE id = ?`;
                    db_1.default.query(fallbackSql, [driverId, rideId], (retryErr) => {
                        if (retryErr)
                            return res.status(500).json({ success: false, error: retryErr.message });
                        finalizeAcceptance();
                    });
                }
                else {
                    finalizeAcceptance();
                }
                function finalizeAcceptance() {
                    // 4. Look up the destination customer email to send out the localized confirmation alert
                    db_1.default.query("SELECT email FROM `users` WHERE id = ?", [activeBooking["user id"]], (uErr, users) => {
                        if (!uErr && users.length > 0) {
                            const customerEmail = users[0].email;
                            // Build the clean custom message body containing the driver data points 🎯
                            const dispatchAlertText = `🚖 Your VillageMart ride #${rideId} is confirmed! Driver Name: ${driverName}, Driver Mobile No: ${driverPhone}. Your driver is currently heading to your pickup location.`;
                            // A. Trigger backend Nodemailer mailer instance
                            const mailOptions = {
                                from: process.env.EMAIL_USER || "noreply@villagemart.com",
                                to: customerEmail,
                                subject: `VillageMart Ride Confirmed - Booking #${rideId}`,
                                text: dispatchAlertText
                            };
                            mailer_1.transporter.sendMail(mailOptions).catch((mErr) => {
                                console.error("❌ Failed to dispatch booking email:", mErr.message);
                            });
                            // B. Inject a live tracking data row inside the user notification logs table
                            const insertNotificationSql = "INSERT INTO `notifications` (`user id`, message, `is read`) VALUES (?, ?, 0)";
                            db_1.default.query(insertNotificationSql, [activeBooking["user id"], dispatchAlertText], (nErr) => {
                                if (nErr)
                                    console.error("❌ Notification table sync failure:", nErr.message);
                            });
                        }
                    });
                    return res.status(200).json({
                        success: true,
                        message: "Ride manual assignment and matching system updated successfully!",
                        driver: { name: driverName, phone: driverPhone }
                    });
                }
            });
        });
    });
};
exports.acceptRide = acceptRide;
/* ======================================================
   🚗 UPDATE RIDE STATUS
   PUT /api/transport-driver/status/:rideId
   Body: { status: "COMPLETED" }
   
   NOTE: CONFIRMED → STARTED is BLOCKED here.
   Drivers MUST use POST /verify-otp to start a ride.
   This endpoint only allows STARTED → COMPLETED.
====================================================== */
const updateRideStatus = (req, res) => {
    const rideId = Number(req.params.rideId);
    const requestedStatus = (req.body?.status || "").toUpperCase();
    if (!rideId || !requestedStatus) {
        return res.status(400).json({ success: false, message: "Invalid data" });
    }
    // 🔐 SECURITY: STARTED transition is only allowed through OTP verification
    if (requestedStatus === "STARTED") {
        return res.status(403).json({
            success: false,
            message: "Cannot start ride via status update. Use OTP verification endpoint.",
        });
    }
    const validStatuses = ["COMPLETED"];
    if (!validStatuses.includes(requestedStatus)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
    }
    db_1.default.query("SELECT tb.status, tb.ride_status, tb.`user id`, tb.customer_name, u.email FROM transport_bookings tb JOIN users u ON u.id = tb.`user id` WHERE tb.id = ? LIMIT 1", [rideId], (err, rows) => {
        if (err || !rows?.length) {
            return res.status(404).json({ success: false, message: "Ride not found" });
        }
        const current = (rows[0].status || "").toUpperCase();
        // Only allow STARTED → COMPLETED
        if (current !== "STARTED") {
            return res.status(409).json({
                success: false,
                message: `Invalid transition from ${current}. Ride must be STARTED to complete.`,
            });
        }
        db_1.default.query("UPDATE transport_bookings SET status = 'COMPLETED', ride_status = 'COMPLETED' WHERE id = ?", [rideId], (updateErr) => {
            if (updateErr) {
                console.error("❌ updateRideStatus error:", updateErr);
                return res.status(500).json({ success: false, message: "Failed to update status" });
            }
            // 🔔 Notify customer: ride completed
            (0, exports.triggerOrderNotification)(rows[0]["user id"], `🏁 Transport ride #${rideId} → COMPLETED. Thanks for riding with VillageMart!`);
            if (rows[0].email) {
                mailer_1.transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: rows[0].email,
                    subject: "Thank You for Riding with VillageMart!",
                    text: `Hello ${rows[0].customer_name},\n\nYour journey is complete. Thank you for using VillageMart Ride! We look forward to traveling with you again soon.`
                }).catch(e => console.error("Email error:", e));
            }
            return res.json({
                success: true,
                message: `Ride #${rideId} completed successfully`,
                data: { rideId, status: "COMPLETED" },
            });
        });
    });
};
exports.updateRideStatus = updateRideStatus;
/* ======================================================
   🚗 VERIFY RIDE OTP & START RIDE
   POST /api/transport-driver/verify-otp
   Body: { rideId, otp }
   
   🔐 SECURITY: This is the ONLY path to move a ride
   from CONFIRMED → STARTED. The 4-digit ride_otp must
   match the pre-saved code from transport_bookings.
====================================================== */
const verifyRideOtp = (req, res) => {
    const { rideId, otp } = req.body;
    if (!rideId || !otp) {
        return res.status(400).json({ success: false, message: "Ride ID and OTP are required" });
    }
    if (String(otp).length !== 4) {
        return res.status(400).json({ success: false, message: "OTP must be exactly 4 digits" });
    }
    db_1.default.query("SELECT ride_otp, ride_status, status, `user id` FROM transport_bookings WHERE id = ? LIMIT 1", [Number(rideId)], (err, rows) => {
        if (err || !rows?.length) {
            return res.status(404).json({ success: false, message: "Ride not found" });
        }
        const ride = rows[0];
        const currentStatus = (ride.status || "").toUpperCase();
        // Ensure ride is in CONFIRMED state (accepted by driver, not yet started)
        if (currentStatus !== "CONFIRMED") {
            return res.status(409).json({
                success: false,
                message: `Ride is in ${currentStatus} state. OTP verification only allowed for CONFIRMED rides.`,
            });
        }
        // 🔐 CRITICAL: Validate the 4-digit OTP against the stored ride_otp
        const storedOtp = String(ride.ride_otp || "").trim();
        const submittedOtp = String(otp).trim();
        if (!storedOtp) {
            return res.status(400).json({
                success: false,
                message: "No OTP found for this ride. The booking may be incomplete.",
            });
        }
        if (submittedOtp !== storedOtp) {
            return res.status(403).json({
                success: false,
                message: "Invalid OTP. Please ask the passenger for the correct 4-digit code.",
            });
        }
        // ✅ OTP matches — transition CONFIRMED → STARTED (sync both status columns)
        db_1.default.query("UPDATE transport_bookings SET status = 'STARTED', ride_status = 'STARTED' WHERE id = ?", [Number(rideId)], (updateErr) => {
            if (updateErr) {
                console.error("❌ verifyRideOtp update error:", updateErr);
                return res.status(500).json({ success: false, message: "Failed to start ride" });
            }
            // 🔔 Notify customer: ride has started
            db_1.default.query("INSERT INTO notifications (`user id`, message, `is read`) VALUES (?, ?, 0)", [ride["user id"], `🚗 Your ride #${rideId} has started! OTP verified successfully.`]);
            return res.json({ success: true, message: "OTP Verified! Ride started." });
        });
    });
};
exports.verifyRideOtp = verifyRideOtp;
/* ======================================================
   📍 UPDATE DRIVER LOCATION
   POST /api/transport-driver/location
   Body: { lat, lng }
====================================================== */
const updateDriverLocation = (req, res) => {
    const driverId = req.user?.id;
    const { lat, lng } = req.body;
    if (!driverId || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return res.status(400).json({ success: false, message: "Invalid location data" });
    }
    const sql = `
    INSERT INTO partner_locations (partner_id, partner_type, latitude, longitude)
    VALUES (?, 'transport', ?, ?)
    ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), updated_at = NOW()
  `;
    db_1.default.query(sql, [driverId, Number(lat), Number(lng)], (err) => {
        if (err) {
            console.error("❌ updateDriverLocation error:", err);
            return res.status(500).json({ success: false, message: "Failed to update location" });
        }
        return res.json({ success: true, message: "Location updated" });
    });
};
exports.updateDriverLocation = updateDriverLocation;
/* ======================================================
   💰 GET DRIVER EARNINGS
   GET /api/transport-driver/earnings
====================================================== */
const getDriverEarnings = (req, res) => {
    const driverId = req.user?.id;
    if (!driverId) {
        return res.status(401).json({ success: false, message: "Driver not authenticated", data: [] });
    }
    // ✅ FIXED: Filter by driver_id to only show this driver's rides
    const sql = `
    SELECT id, \`distance km\` AS distance_km, charge_amount, status, \`created at\` AS created_at
    FROM transport_bookings
    WHERE driver_id = ? AND status IN ('CONFIRMED', 'STARTED', 'COMPLETED')
    ORDER BY \`created at\` DESC
  `;
    db_1.default.query(sql, [driverId], (err, rows) => {
        if (err) {
            console.error("❌ getDriverEarnings error:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch earnings", data: [] });
        }
        const all = (rows || []);
        // 🚩 BUSINESS LOGIC: 10% Platform Commission
        // Driver gets 90%
        const COMMISSION_RATE = 0.9;
        const totalEarnings = all.reduce((s, r) => s + (Number(r.charge_amount || 0) * COMMISSION_RATE), 0);
        const totalRides = all.length;
        const totalDistance = all.reduce((s, r) => s + Number(r.distance_km || 0), 0);
        const today = new Date().toDateString();
        const todayRides = all.filter((r) => new Date(r.created_at).toDateString() === today);
        const todayEarnings = todayRides.reduce((s, r) => s + (Number(r.charge_amount || 0) * COMMISSION_RATE), 0);
        return res.json({
            success: true,
            data: {
                totalEarnings: Number(totalEarnings.toFixed(2)),
                totalRides,
                totalDistance: Number(totalDistance.toFixed(2)),
                todayEarnings: Number(todayEarnings.toFixed(2)),
                todayRides: todayRides.length,
                rides: all,
            },
        });
    });
};
exports.getDriverEarnings = getDriverEarnings;
/* ======================================================
   🟢 TOGGLE ONLINE STATUS
   POST /api/transport/toggle-online
====================================================== */
const toggleTransportOnline = (req, res) => {
    const driverId = req.user?.id;
    const { is_online } = req.body;
    if (typeof is_online !== 'boolean') {
        return res.status(400).json({ success: false, message: "is_online (boolean) required" });
    }
    db_1.default.query("UPDATE transport_partners SET `is active` = ? WHERE id = ?", [is_online ? 1 : 0, driverId], (err) => {
        if (err)
            return res.status(500).json({ success: false, message: "Status update failed" });
        res.json({ success: true, message: `Status updated to ${is_online ? 'online' : 'offline'}` });
    });
};
exports.toggleTransportOnline = toggleTransportOnline;
/* ======================================================
   🤖 AUTO-ASSIGN NEAREST DRIVER
   Helper function (called during ride booking)
====================================================== */
const autoAssignNearestDriver = (bookingId, fromLat, fromLng) => {
    const sql = `
    SELECT 
      tp.id,
      (6371 * acos(
        cos(radians(?)) *
        cos(radians(pl.latitude)) *
        cos(radians(pl.longitude) - radians(?)) +
        sin(radians(?)) *
        sin(radians(pl.latitude))
      )) AS distance
    FROM transport_partners tp
    JOIN partner_locations pl ON pl.partner_id = tp.id AND pl.partner_type = 'transport'
    WHERE tp.status = 'approved' AND tp.\`is active\` = 1
    HAVING distance < 10
    ORDER BY distance ASC
    LIMIT 1
  `;
    db_1.default.query(sql, [fromLat, fromLng, fromLat], (err, rows) => {
        if (err || !rows?.length) {
            console.log(`⚠️ No online drivers found for Ride #${bookingId}`);
            return;
        }
        const driverId = rows[0].id;
        const updateSql = "UPDATE transport_bookings SET driver_id = ?, status = 'CONFIRMED', ride_status = 'ACCEPTED' WHERE id = ?";
        db_1.default.query(updateSql, [driverId, bookingId], (updateErr) => {
            if (!updateErr) {
                console.log(`✅ Ride #${bookingId} auto-assigned to Driver #${driverId}`);
                // Notify driver
                db_1.default.query("INSERT INTO notifications (`user id`, message) VALUES (?, ?)", [driverId, `🚖 New Ride Request #${bookingId} assigned to you!`]);
            }
        });
    });
};
exports.autoAssignNearestDriver = autoAssignNearestDriver;
