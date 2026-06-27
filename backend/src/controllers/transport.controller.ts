import { Request, Response } from "express";
import db from "../db";
import { sendTransportBookingConfirmMail, transporter } from "../utils/mailer";
import { autoAssignNearestDriver } from "./transportDriver.controller";
import { io } from "../server";

type Coordinates = {
  lat: number;
  lng: number;
};

const TRANSPORT_RATE_PER_KM = 15;

db.query(
  `
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
  `,
  (err) => {
    if (err) {
      console.error("❌ Could not ensure transport_bookings table:", err);
    }
  }
);

const toNum = (value: any) => Number(value);
const isFiniteNum = (value: any) => Number.isFinite(toNum(value));

const haversineKm = (from: Coordinates, to: Coordinates) => {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const createTransportBooking = (req: Request, res: Response) => {
  try {
    const {
      userId,
      customerName,
      customerPhone,
      fromAddress,
      fromLat,
      fromLng,
      toAddress,
      toLat,
      toLng,
      notes,
    } = req.body;

    if (
      !userId ||
      !customerName ||
      !customerPhone ||
      !fromAddress ||
      !toAddress ||
      !isFiniteNum(fromLat) ||
      !isFiniteNum(fromLng) ||
      !isFiniteNum(toLat) ||
      !isFiniteNum(toLng)
    ) {
      return res.status(400).json({ success: false, message: "Invalid transport booking data" });
    }

    const from = { lat: toNum(fromLat), lng: toNum(fromLng) };
    const to = { lat: toNum(toLat), lng: toNum(toLng) };

    // Use provided distance from the client's routing API, otherwise fallback to straight-line Haversine
    const distanceKm = Number(req.body.distanceKm) || Number(req.body.distance) || haversineKm(from, to);

    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      return res.status(400).json({ success: false, message: "Unable to calculate transport distance" });
    }

    const roundedDistance = Number(distanceKm.toFixed(2));
    
    // Calculate based on vehicle type
    const rawVehicleType = req.body.vehicle_type || req.body.vehicleType || "auto";
    const vehicle = String(rawVehicleType).toLowerCase();
    const validatedVehicleType = String(rawVehicleType).toLowerCase().trim();
    let baseRate = 25;
    let perKmRate = 12;
    
    if (vehicle === "scooter" || vehicle === "bike" || vehicle === "scooter/bike") {
      baseRate = 10;
      perKmRate = 8;
    } else if (vehicle === "car") {
      baseRate = 40;
      perKmRate = 18;
    } else {
      // Default is auto
      baseRate = 25;
      perKmRate = 12;
    }

    let chargeAmount = Number(req.body.chargeAmount) || Number(req.body.charge);
    if (!chargeAmount) {
      chargeAmount = Number((baseRate + roundedDistance * perKmRate).toFixed(2));
    }
    
    const rideOtp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

    const sql = `
      INSERT INTO transport_bookings
        (\`user id\`, customer_name, customer_phone, from_address, \`from lat\`, from_Ing, \`to address\`, \`to lat\`, \`to Ing\`, \`distance km\`, charge_amount, notes, vehicle_type, ride_otp, status, ride_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED', 'BOOKED')
    `;

    db.query(
      sql,
      [
        Number(userId),
        customerName,
        customerPhone,
        fromAddress,
        from.lat,
        from.lng,
        toAddress,
        to.lat,
        to.lng,
        roundedDistance,
        chargeAmount,
        notes || null,
        validatedVehicleType,
        rideOtp
      ],
      (err: any, result: any) => {
        if (err) {
          console.error("❌ createTransportBooking error:", err);
          return res.status(500).json({ success: false, message: "Failed to create transport booking" });
        }

        // Initial booking notification
        db.query("INSERT INTO notifications (`user id`, message) VALUES (?,?)", [
          Number(userId),
          `🚕 Transport (${validatedVehicleType}) booked from ${fromAddress} to ${toAddress}. Charge ₹${chargeAmount}`,
        ]);

        // 🔐 Send OTP Notification to customer
        db.query("INSERT INTO notifications (`user id`, message) VALUES (?, ?)", [
          Number(userId),
          `🔐 Your ride OTP is ${rideOtp}.`
        ]);

        // 📡 Emit Real-time Socket Event (Swiggy-style)
        io.to(`user_${userId}`).emit("new_otp", {
          otp: rideOtp,
          bookingId: result.insertId,
          message: "Your ride is booked! Here is your OTP."
        });

        // ✅ MANUAL ACCEPTANCE WORKFLOW ENFORCED
        // autoAssignNearestDriver(result.insertId, from.lat, from.lng);

        return res.json({
          success: true,
          bookingId: result.insertId,
          distance_km: roundedDistance,
          charge_amount: chargeAmount,
          rate_per_km: perKmRate,
          vehicle_type: validatedVehicleType,
          otp: rideOtp, // Return OTP to user
        });
      }
    );
  } catch (error: any) {
    console.error("❌ createTransportBooking unhandled exception:", error);
    return res.status(400).json({ success: false, message: error.message || "Booking request failed" });
  }
};

export const getAllTransportBookings = (req: Request, res: Response) => {
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
      tb.notes,
      tb.\`created at\` AS created_at,
      tb.vehicle_type,
      u.username,
      u.email
    FROM transport_bookings tb
    JOIN users u ON u.id = tb.\`user id\`
    ORDER BY tb.\`created at\` DESC
  `;

  db.query(sql, (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getAllTransportBookings error:", err);
      return res.status(500).json([]);
    }

    return res.json(rows || []);
  });
};

export const getUserTransportBookings = (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ message: "Invalid user id" });

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

  db.query(sql, [userId], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getUserTransportBookings error:", err);
      return res.status(500).json([]);
    }

    return res.json(rows || []);
  });
};

export const confirmTransportBooking = (req: any, res: any) => {
  const bookingId = Number(req.params.bookingId);
  const driverId = req.user?.id || null;

  if (!bookingId) return res.status(400).json({ message: "Invalid booking id" });

  const sql = `
    SELECT tb.*, u.email, u.username
    FROM transport_bookings tb
    JOIN users u ON u.id = tb.\`user id\`
    WHERE tb.id = ?
    LIMIT 1
  `;

  db.query(sql, [bookingId], (err: any, rows: any[]) => {
    if (err || !rows?.length) {
      console.error("❌ confirmTransportBooking fetch error:", err);
      return res.status(404).json({ message: "Transport booking not found" });
    }

    const row = rows[0];
    if (String(row.status).toUpperCase() === "CONFIRMED") {
      return res.status(409).json({ message: "Transport booking already confirmed" });
    }

    // 🎯 FIXED: Sync both status and ride_status columns, and assign the driver
    db.query(
      "UPDATE transport_bookings SET status='CONFIRMED', ride_status='ACCEPTED', `driver_id`=?, `driver id`=? WHERE id=?",
      [driverId, driverId, bookingId],
      (updateErr: any) => {
        if (updateErr) {
          console.error("❌ confirmTransportBooking update error:", updateErr);
          return res.status(500).json({ message: "Failed to confirm transport booking" });
        }

        // 🔔 Notify customer
        db.query("INSERT INTO notifications (`user id`, message, `is read`) VALUES (?,?,0)", [
          Number(row["user id"]),
          `✅ Transport booking #${bookingId} confirmed by admin`,
        ]);

        const userMail = String(row.email || "").trim();
        const adminMail = (process.env.ADMIN_EMAIL || process.env.EMAIL_USER || "").trim();

        Promise.all([
          userMail
            ? sendTransportBookingConfirmMail({
                to: userMail,
                username: row.username || row.customer_name,
                bookingId,
                fromAddress: row.from_address,
                toAddress: row["to address"],
                distanceKm: Number(row["distance km"]),
                chargeAmount: Number(row.charge_amount),
              })
            : Promise.resolve(),
          adminMail
            ? transporter.sendMail({
                to: adminMail,
                subject: `Admin Copy: Transport Confirmed (#${bookingId})`,
                html: `<p>Transport booking #${bookingId} confirmed for ${row.username || row.customer_name}.</p>`,
              })
            : Promise.resolve(),
        ]).catch((mailErr: any) => {
          console.warn(`⚠️ Warning: Could not send confirmation email (Network/SMTP issue). The ride is still confirmed. (${mailErr.message})`);
        });

        // ✅ FIXED: Return response to client (was missing — caused client to hang)
        return res.json({
          success: true,
          message: `Transport booking #${bookingId} confirmed`,
          data: { bookingId, status: "CONFIRMED" },
        });
      }
    );
  });
};

/* ======================================================
   📍 GET NEARBY RIDES (20 KM RADIUS)
====================================================== */
export const getActiveTransportRides = (req: any, res: any) => {
  const driverLat = Number(req.query.lat || 10.938354);
  const driverLng = Number(req.query.lng || 78.418579);
  const partnerId = req.user?.id;

  const checkLockoutSql = `SELECT wallet_balance, commission_due_since, vehicle_type FROM transport_partners WHERE id = ?`;
  db.query(checkLockoutSql, [partnerId], (lockErr, partnerResults: any) => {
    if (lockErr) return res.status(500).json({ success: false, error: lockErr.message });

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

    db.query(sql, [driverLat, driverLng, driverLat, driverVehicleType], (err, results) => {
      if (err) {
        console.error("❌ Database query execution crash inside transport controller:", err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      return res.status(200).json({ success: true, data: results });
    });
  });
};

/* ======================================================
   🔐 START RIDE WITH OTP
====================================================== */
export const startRideWithOtp = (req: any, res: any) => {
  const { id } = req.params;
  const { otp } = req.body;

  db.query("SELECT `ride_otp` FROM transport_bookings WHERE id = ?", [id], (err, result: any) => {
    if (err || !result.length) return res.status(404).json({ message: "Ride not found" });
    
    if (String(result[0].ride_otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid verification token OTP" });
    }

    db.query("UPDATE transport_bookings SET `ride_status` = 'STARTED' WHERE id = ?", [id], (upErr) => {
      if (upErr) return res.status(500).json({ error: upErr.message });
      res.status(200).json({ success: true, message: "Ride verified and started successfully!" });
    });
  });
};
