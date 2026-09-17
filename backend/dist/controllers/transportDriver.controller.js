"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDriverTrips = exports.autoAssignNearestDriver = exports.toggleTransportOnline = exports.getDriverEarnings = exports.updateDriverLocation = exports.verifyRideOtp = exports.markCashCollected = exports.updateRideStatus = exports.acceptRide = exports.getMyActiveRide = exports.getDriverBookings = exports.loginTransportPartner = exports.signupTransportPartner = void 0;
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const mailer_1 = require("../utils/mailer");
const commissionGuard_1 = require("../cron/commissionGuard");
const server_1 = require("../server");
const notification_utils_1 = require("../utils/notification.utils");
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
    const { name, email, phone, password, vehicle_type, vehicle_number, license_number, district, taluk, profile_image, dl_document_url, rc_document_url, aadhaar_document_url } = req.body;
    if (!name || !email || !phone || !password || !vehicle_type || !vehicle_number || !license_number || !district || !taluk) {
        return res.status(400).json({ success: false, message: "All fields are required to complete partner registration." });
    }
    if (!profile_image || !dl_document_url || !rc_document_url || !aadhaar_document_url) {
        return res.status(400).json({ success: false, message: "Required partner documents were not uploaded" });
    }
    try {
        const checkSql = "SELECT id, email, phone FROM transport_partners WHERE email = ? OR phone = ? LIMIT 1";
        db_1.default.query(checkSql, [email, phone], async (checkErr, rows) => {
            if (checkErr)
                return res.status(500).json({ success: false, message: "Database error" });
            if (rows.length > 0) {
                const match = rows[0];
                const conflictField = match.email === email ? 'email address' : 'phone number';
                return res.status(409).json({ success: false, message: `A partner with this ${conflictField} already exists` });
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const sql = `
        INSERT INTO transport_partners 
        (name, phone, email, password, vehicle_type, vehicle_number, license_number, district, taluk, profile_image, dl_document_url, rc_document_url, aadhaar_document_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `;
            db_1.default.query(sql, [name, phone, email, hashedPassword, vehicle_type, vehicle_number, license_number, district, taluk, profile_image, dl_document_url, rc_document_url, aadhaar_document_url], (err, result) => {
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
        // ✅ Enforce approval status - Allow 'pending' to login so they can see the pending dashboard
        if (partner.status === "rejected") {
            return res.status(403).json({
                success: false,
                message: "Your application has been rejected. Please contact support.",
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
    // Parsed coordinates to protect from malformed request parameters
    const rawLat = req.query.lat;
    const rawLng = req.query.lng;
    const driverLat = rawLat !== undefined ? parseFloat(String(rawLat)) : 10.938354;
    const driverLng = rawLng !== undefined ? parseFloat(String(rawLng)) : 78.418579;
    const cleanLat = isNaN(driverLat) ? 10.938354 : driverLat;
    const cleanLng = isNaN(driverLng) ? 78.418579 : driverLng;
    console.log(`📡 [DriverBookings] Driver #${partnerId} requesting bookings around coordinate payload: [${cleanLat}, ${cleanLng}]`);
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
        tb.payment_method,
        tb.payment_status,
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
        else {
            sql += ` WHERE UPPER(tb.status) = 'BOOKED' OR UPPER(tb.status) = 'PENDING'`;
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
        tb.payment_method,
        tb.payment_status,
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
    const driverId = req.user?.id;
    console.log("Accept Ride Request");
    console.log({
        rideId,
        driverId,
        body: req.body
    });
    if (!rideId || !driverId) {
        return res.status(400).json({
            success: false,
            message: "Invalid request parameters. rideId and driverId are required."
        });
    }
    // Scope variables to make them available in rollback callbacks
    let driverName = "Driver";
    let driverPhone = "";
    try {
        db_1.default.getConnection((connErr, connection) => {
            if (connErr) {
                console.error("❌ Failed to obtain database connection for transaction:", connErr);
                return res.status(500).json({
                    success: false,
                    message: "Database connection failed",
                    error: connErr.message
                });
            }
            console.log(`[Tx Started] Starting transaction for Ride ID: ${rideId}, Driver ID: ${driverId}`);
            connection.beginTransaction((txErr) => {
                if (txErr) {
                    connection.release();
                    console.error("❌ Failed to start transaction:", txErr);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to start transaction",
                        error: txErr.message
                    });
                }
                // Helper function to rollback and return error response
                const rollbackAndFail = (message, reason, statusCode = 500) => {
                    console.log(`[Tx Rolled Back] Rolling back transaction. Reason: ${message} (${reason})`);
                    connection.rollback(() => {
                        connection.release();
                        return res.status(statusCode).json({
                            success: false,
                            message,
                            reason
                        });
                    });
                };
                // 1. Validate driver exists, is approved, is not blocked, and is online
                const driverQuery = `
          SELECT id, name, phone, vehicle_type, vehicle_number, status, account_status, \`is active\` AS is_active 
          FROM transport_partners 
          WHERE id = ?
        `;
                console.log(`[SQL Query] ${driverQuery} | Params: [${driverId}]`);
                connection.query(driverQuery, [driverId], (dErr, drivers) => {
                    if (dErr) {
                        console.error("❌ Database query error fetching driver details:", dErr);
                        return rollbackAndFail("Failed to resolve driver credentials", dErr.message);
                    }
                    if (!drivers || drivers.length === 0) {
                        return rollbackAndFail("Driver not found", "No driver profile exists with the logged-in ID", 404);
                    }
                    const driver = drivers[0];
                    driverName = driver.name;
                    driverPhone = driver.phone;
                    // Driver Validation Checks
                    if (driver.status !== "approved") {
                        return rollbackAndFail("Driver account not approved", `Approval status is: ${driver.status}`, 403);
                    }
                    if (driver.account_status === "BLOCKED") {
                        return rollbackAndFail("Driver blocked", "Your account is blocked due to outstanding platform commissions", 403);
                    }
                    if (Number(driver.is_active) !== 1) {
                        return rollbackAndFail("Driver offline", "You must go online to accept rides", 400);
                    }
                    // 2. Lock and validate the ride row
                    const rideQuery = `
            SELECT id, status, ride_status, driver_id, vehicle_type, \`user id\` AS user_id 
            FROM transport_bookings 
            WHERE id = ? 
            FOR UPDATE
          `;
                    console.log(`[SQL Query] ${rideQuery} | Params: [${rideId}]`);
                    connection.query(rideQuery, [rideId], (rErr, bookings) => {
                        if (rErr) {
                            console.error("❌ Database query error locking booking details:", rErr);
                            return rollbackAndFail("Failed to lock booking row", rErr.message);
                        }
                        if (!bookings || bookings.length === 0) {
                            return rollbackAndFail("Ride not found", `No ride booking exists with ID: ${rideId}`, 404);
                        }
                        const ride = bookings[0];
                        // Ride Validation Checks
                        if (ride.ride_status !== "BOOKED") {
                            return rollbackAndFail("Ride already accepted", `Ride is already in '${ride.ride_status}' status`, 400);
                        }
                        if (ride.driver_id !== null && ride.driver_id !== undefined) {
                            return rollbackAndFail("Ride already has an assigned driver", `Assigned driver ID is: ${ride.driver_id}`, 400);
                        }
                        // Case-insensitive Vehicle matching validation
                        const driverVehicle = String(driver.vehicle_type || "").toLowerCase().trim();
                        const rideVehicle = String(ride.vehicle_type || "").toLowerCase().trim();
                        if (driverVehicle !== rideVehicle) {
                            return rollbackAndFail("Mismatched vehicle type", `You drive a ${driver.vehicle_type.toUpperCase()}, but this is a ${ride.vehicle_type.toUpperCase()} booking.`, 403);
                        }
                        // 3. Atomically assign the driver and advance status states cleanly
                        const updateQuery = `
              UPDATE transport_bookings 
              SET driver_id = ?, ride_status = 'ACCEPTED', status = 'ACCEPTED', driver_accepted_at = NOW() 
              WHERE id = ?
            `;
                        console.log(`[SQL Query] ${updateQuery} | Params: [${driverId}, ${rideId}]`);
                        connection.query(updateQuery, [driverId, rideId], (uErr, updateResult) => {
                            if (uErr) {
                                console.error("❌ Database update error assigning driver to booking:", uErr);
                                return rollbackAndFail("Failed to update booking status", uErr.message);
                            }
                            console.log(`[SQL Success] Affected rows: ${updateResult.affectedRows}`);
                            // 4. Commit the transaction
                            connection.commit((cErr) => {
                                if (cErr) {
                                    console.error("❌ Transaction commit error:", cErr);
                                    return rollbackAndFail("Transaction commit failed", cErr.message);
                                }
                                console.log(`[Tx Committed] Ride #${rideId} successfully accepted by Driver #${driverId}`);
                                connection.release();
                                // 5. Post-Commit Actions (Notifications, Emails)
                                // Any failures here must NOT fail the HTTP response or rollback the ride acceptance!
                                triggerPostCommitActions(rideId, driverId, driver, ride);
                                // Return success response to the client
                                return res.status(200).json({
                                    success: true,
                                    message: "Ride accepted",
                                    ride: {
                                        id: rideId,
                                        driver_id: driverId,
                                        ride_status: "ACCEPTED",
                                        status: "ACCEPTED"
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    }
    catch (err) {
        console.error("❌ Unhandled acceptRide exception:", err);
        return res.status(500).json({
            success: false,
            message: "Ride acceptance failed",
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
};
exports.acceptRide = acceptRide;
// Post-Commit Hooks (Email, Push, Notifications) executed asynchronously to prevent blocking response
function triggerPostCommitActions(rideId, driverId, driver, ride) {
    const customerId = ride.user_id;
    db_1.default.query("SELECT email FROM users WHERE id = ?", [customerId], (uErr, users) => {
        if (uErr) {
            console.error("❌ Notification lookup error - Failed to fetch customer email:", uErr);
            return;
        }
        const customerEmail = users && users.length > 0 ? users[0].email : null;
        const driverName = driver.name;
        const driverPhone = driver.phone;
        const dispatchAlertText = `🚖 Your VillageSmart ride #${rideId} is confirmed! Driver Name: ${driverName}, Driver Mobile No: ${driverPhone}. Your driver is currently heading to your pickup location.`;
        // A. Send email notification (failsafe with idempotency)
        if (customerEmail) {
            db_1.default.query("INSERT IGNORE INTO transport_email_logs (ride_id, email_type) VALUES (?, ?)", [rideId, 'RIDE_ACCEPTED'], (iErr, iRes) => {
                if (!iErr && iRes && iRes.affectedRows > 0) {
                    (0, mailer_1.sendTransportDriverAssignedMail)({
                        to: customerEmail,
                        bookingId: rideId,
                        driverName: driverName,
                        driverMobile: driverPhone,
                        vehicleType: ride.vehicle_type || driver.vehicle_type || "N/A",
                        vehicleNumber: driver.vehicle_number || "N/A",
                        eta: "Arriving shortly",
                    }).then(() => {
                        console.log(`📧 Ride Accepted email successfully sent to ${customerEmail}`);
                    }).catch((mErr) => {
                        console.error("❌ Email failed:", mErr.message || mErr);
                    });
                }
            });
        }
        else {
            console.log(`⚠️ No email address found for customer #${customerId}, skipping email dispatch.`);
        }
        // B. Inject user notification database entry (failsafe)
        (0, notification_utils_1.createAndSendNotification)(customerId, "CUSTOMER", "🚖 Ride Accepted", dispatchAlertText, { type: "TRANSPORT_ACCEPTED", entityType: "transport", bookingId: String(rideId),
            route: "/?app=consumer/transport", channelId: "villagesmart_rides", priority: "high" });
        // C. Socket Emit for real-time notification (failsafe)
        try {
            server_1.io.to(`user_${customerId}`).emit("ride_accepted", {
                bookingId: rideId,
                driverName,
                driverMobile: driverPhone,
                vehicleNumber: driver.vehicle_number || "N/A",
                vehicleType: ride.vehicle_type,
                message: "Your ride booking has been accepted by a partner!"
            });
            console.log(`📡 Emitted ride_accepted socket notification to user_${customerId}`);
        }
        catch (sockErr) {
            console.error("❌ Socket emit failed:", sockErr.message || sockErr);
        }
    });
}
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
    db_1.default.query("SELECT tb.status, tb.ride_status, tb.`user id`, tb.customer_name, tb.driver_id, tb.charge_amount, tb.from_address, tb.`to address` as to_address, tb.vehicle_type, tb.`distance km` as distance_km, u.email FROM transport_bookings tb JOIN users u ON u.id = tb.`user id` WHERE tb.id = ? LIMIT 1", [rideId], (err, rows) => {
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
        db_1.default.query("UPDATE transport_bookings SET status = 'COMPLETED', ride_status = 'COMPLETED', ride_completed_at = NOW() WHERE id = ?", [rideId], (updateErr) => {
            if (updateErr) {
                console.error("❌ updateRideStatus error:", updateErr);
                return res.status(500).json({ success: false, message: "Failed to update status" });
            }
            // 🔔 Notify customer: ride completed
            (0, notification_utils_1.createAndSendNotification)(rows[0]["user id"], "CUSTOMER", "🏁 Ride Completed", `Your ride #${rideId} is complete. Thank you for riding with VillageSmart!`, { type: "TRANSPORT_COMPLETED", entityType: "transport", bookingId: String(rideId),
                route: "/?app=consumer/transport", channelId: "villagesmart_rides" });
            const driverId = rows[0].driver_id;
            const chargeAmount = parseFloat(rows[0].charge_amount || 0);
            const commissionOwed = chargeAmount * 0.10;
            if (driverId && commissionOwed > 0) {
                (0, commissionGuard_1.triggerCommissionWindow)(driverId, 'transport', commissionOwed);
            }
            if (rows[0].email) {
                // Need driver name for invoice
                db_1.default.query("SELECT name FROM transport_partners WHERE id = ?", [rows[0].driver_id], (dErr, dRows) => {
                    const dName = (dRows && dRows.length > 0) ? dRows[0].name : "Driver";
                    db_1.default.query("INSERT IGNORE INTO transport_email_logs (ride_id, email_type) VALUES (?, ?)", [rideId, 'RIDE_COMPLETED'], (iErr, iRes) => {
                        if (!iErr && iRes && iRes.affectedRows > 0) {
                            (0, mailer_1.sendRideBookingInvoiceMail)({
                                to: rows[0].email,
                                customerName: rows[0].customer_name,
                                bookingId: rideId,
                                fromAddress: rows[0].from_address || "N/A",
                                toAddress: rows[0].to_address || "N/A",
                                distanceKm: rows[0].distance_km || 0,
                                vehicleType: rows[0].vehicle_type || "N/A",
                                driverName: dName,
                                chargeAmount: parseFloat(rows[0].charge_amount || 0),
                                paymentMethod: rows[0].payment_method || "Cash / Online"
                            }).then(() => {
                                console.log(`📧 Ride Completed invoice sent to ${rows[0].email}`);
                            }).catch(e => console.error("❌ Failed to send ride complete email:", e));
                        }
                    });
                });
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
   💵 MARK CASH COLLECTED
   POST /api/transport-driver/rides/:rideId/cash-collected
====================================================== */
const markCashCollected = (req, res) => {
    const driverId = req.user?.id;
    const { rideId } = req.params;
    if (!rideId) {
        return res.status(400).json({ success: false, message: "Ride ID is required" });
    }
    // Verify the ride belongs to this driver and is a pending cash ride
    db_1.default.query("SELECT payment_method, payment_status, ride_status FROM transport_bookings WHERE id = ? AND driver_id = ?", [rideId, driverId], (err, rows) => {
        if (err) {
            console.error("❌ SQL Error verifying cash ride:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Ride not found or unauthorized." });
        }
        const ride = rows[0];
        if (ride.payment_method !== "CASH") {
            return res.status(400).json({ success: false, message: "This ride is not marked for cash collection." });
        }
        if (ride.payment_status === "PAID") {
            return res.status(400).json({ success: false, message: "Cash has already been collected." });
        }
        // Atomically update the payment status
        db_1.default.query("UPDATE transport_bookings SET payment_status = 'PAID', cash_collected_at = NOW(), cash_collected_by = ? WHERE id = ?", [driverId, rideId], (updateErr) => {
            if (updateErr) {
                console.error("❌ SQL Error updating cash status:", updateErr);
                return res.status(500).json({ success: false, message: "Failed to update cash status." });
            }
            return res.json({
                success: true,
                message: "Cash payment confirmed successfully.",
            });
        });
    });
};
exports.markCashCollected = markCashCollected;
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
    db_1.default.query("SELECT tb.ride_otp, tb.ride_status, tb.status, tb.`user id`, u.email FROM transport_bookings tb JOIN users u ON u.id = tb.`user id` WHERE tb.id = ? LIMIT 1", [Number(rideId)], (err, rows) => {
        if (err || !rows?.length) {
            return res.status(404).json({ success: false, message: "Ride not found" });
        }
        const ride = rows[0];
        const currentStatus = (ride.status || "").toUpperCase();
        // Ensure ride is in ACCEPTED or CONFIRMED state (accepted by driver, not yet started)
        if (currentStatus !== "CONFIRMED" && currentStatus !== "ACCEPTED") {
            return res.status(409).json({
                success: false,
                message: `Ride is in ${currentStatus} state. OTP verification only allowed for ACCEPTED/CONFIRMED rides.`,
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
        db_1.default.query("UPDATE transport_bookings SET status = 'STARTED', ride_status = 'STARTED', ride_started_at = NOW() WHERE id = ?", [Number(rideId)], (updateErr) => {
            if (updateErr) {
                console.error("❌ verifyRideOtp update error:", updateErr);
                return res.status(500).json({ success: false, message: "Failed to start ride" });
            }
            // 🔔 Notify customer: ride has started
            (0, notification_utils_1.createAndSendNotification)(ride["user id"], "CUSTOMER", "🚗 Ride Started", `Your ride #${rideId} has started! OTP verified successfully.`, { type: "TRANSPORT_STARTED", entityType: "transport", bookingId: String(rideId),
                route: "/?app=consumer/transport", channelId: "villagesmart_rides" });
            // Removed sendTransportRideStartedMail as per new business rule
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
    // Retrieve transport partner wallet and commission data
    db_1.default.query("SELECT wallet_balance, pending_commission, commission_deadline, commission_due_since FROM transport_partners WHERE id = ?", [driverId], (profileErr, profileRows) => {
        if (profileErr) {
            console.error("❌ getDriverEarnings profile fetch error:", profileErr);
            return res.status(500).json({ success: false, message: "Failed to fetch driver profile data", data: [] });
        }
        const profile = profileRows && profileRows.length > 0
            ? profileRows[0]
            : { wallet_balance: 0.00, pending_commission: 0.00, commission_deadline: null, commission_due_since: null };
        // Filter by driver_id to only show this driver's rides
        const sql = `
      SELECT id, \`distance km\` AS distance_km, charge_amount, status, \`created at\` AS created_at
      FROM transport_bookings
      WHERE driver_id = ? AND status IN ('CONFIRMED', 'STARTED', 'COMPLETED')
      ORDER BY \`created at\` DESC
    `;
        db_1.default.query(sql, [driverId], (err, rows) => {
            if (err) {
                console.error("❌ getDriverEarnings bookings error:", err);
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
            // Eliminate dynamic calculations on fetch. Return true database column values directly.
            const responseData = {
                totalEarnings: Number(totalEarnings.toFixed(2)),
                totalRides,
                totalDistance: Number(totalDistance.toFixed(2)),
                todayEarnings: Number(todayEarnings.toFixed(2)),
                todayRides: todayRides.length,
                rides: all,
                wallet_balance: profile.wallet_balance,
                pending_commission: parseFloat(profile.pending_commission),
                commission_deadline: profile.commission_deadline,
                commission_due_since: profile.commission_due_since,
                // Direct DB column mapping equivalents
                netEarnings: Number(totalEarnings.toFixed(2)),
                grossFare: all.reduce((s, r) => s + Number(r.charge_amount || 0), 0),
                pendingCommission: parseFloat(profile.pending_commission),
                walletBalance: profile.wallet_balance,
                totalDeliveries: totalRides
            };
            return res.json({
                success: true,
                data: responseData,
            });
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
    if (is_online) {
        db_1.default.query("SELECT status FROM transport_partners WHERE id = ?", [driverId], (err, rows) => {
            if (err)
                return res.status(500).json({ success: false, message: "Database error" });
            if (rows.length === 0 || rows[0].status !== 'approved') {
                return res.status(403).json({ success: false, message: "You must be approved to go online" });
            }
            db_1.default.query("UPDATE transport_partners SET `is active` = 1 WHERE id = ?", [driverId], (updateErr) => {
                if (updateErr)
                    return res.status(500).json({ success: false, message: "Status update failed" });
                res.json({ success: true, message: "Status updated to online" });
            });
        });
    }
    else {
        db_1.default.query("UPDATE transport_partners SET `is active` = 0 WHERE id = ?", [driverId], (err) => {
            if (err)
                return res.status(500).json({ success: false, message: "Status update failed" });
            res.json({ success: true, message: "Status updated to offline" });
        });
    }
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
                db_1.default.query("INSERT INTO notifications (`user id`, message) VALUES (?, ?)", [driverId, `🚖 New Ride Request #${bookingId} has been assigned to you!`]);
            }
        });
    });
};
exports.autoAssignNearestDriver = autoAssignNearestDriver;
/* ======================================================
   🚗 GET DRIVER TRIPS
   GET /api/transport-driver/trips
====================================================== */
const getDriverTrips = (req, res) => {
    const driverId = req.user?.id;
    if (!driverId) {
        return res.status(401).json({ success: false, message: "Driver not authenticated" });
    }
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
    WHERE tb.driver_id = ? AND (
      UPPER(tb.status) IN ('CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'ARRIVED', 'COMPLETED', 'STARTED', 'CANCELLED')
      OR UPPER(tb.ride_status) IN ('ACCEPTED', 'STARTED', 'COMPLETED')
    )
    ORDER BY tb.\`created at\` DESC
  `;
    db_1.default.query(sql, [driverId], (err, rows) => {
        if (err) {
            console.error("❌ getDriverTrips error:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch driver trips" });
        }
        return res.json({ success: true, data: rows || [] });
    });
};
exports.getDriverTrips = getDriverTrips;
