import { Request, Response } from "express";
import db from "../db";
import nodemailer from "nodemailer";

type Coordinates = {
  lat: number;
  lng: number;
};

const TRANSPORT_RATE_PER_KM = 15;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

db.query(
  `
  CREATE TABLE IF NOT EXISTS transport_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(25) NOT NULL,
    from_address TEXT NOT NULL,
    from_lat DOUBLE NOT NULL,
    from_lng DOUBLE NOT NULL,
    to_address TEXT NOT NULL,
    to_lat DOUBLE NOT NULL,
    to_lng DOUBLE NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL,
    charge_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'BOOKED',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transport_user (user_id),
    INDEX idx_transport_created (created_at),
    CONSTRAINT fk_transport_user FOREIGN KEY (user_id) REFERENCES users(id)
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
    return res.status(400).json({ message: "Invalid transport booking data" });
  }

  const from = { lat: toNum(fromLat), lng: toNum(fromLng) };
  const to = { lat: toNum(toLat), lng: toNum(toLng) };

  const distanceKm = haversineKm(from, to);

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return res.status(400).json({ message: "Unable to calculate transport distance" });
  }

  const roundedDistance = Number(distanceKm.toFixed(2));
  const chargeAmount = Number((roundedDistance * TRANSPORT_RATE_PER_KM).toFixed(2));

  const sql = `
    INSERT INTO transport_bookings
      (user_id, customer_name, customer_phone, from_address, from_lat, from_lng, to_address, to_lat, to_lng, distance_km, charge_amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    ],
    (err: any, result: any) => {
      if (err) {
        console.error("❌ createTransportBooking error:", err);
        return res.status(500).json({ message: "Failed to create transport booking" });
      }

      db.query("INSERT INTO notifications (user_id,message) VALUES (?,?)", [
        Number(userId),
        `🚕 Transport booked from ${fromAddress} to ${toAddress}. Charge ₹${chargeAmount}`,
      ]);

      return res.json({
        success: true,
        bookingId: result.insertId,
        distance_km: roundedDistance,
        charge_amount: chargeAmount,
        rate_per_km: TRANSPORT_RATE_PER_KM,
      });
    }
  );
};

export const getAllTransportBookings = (req: Request, res: Response) => {
  const sql = `
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
      user_id,
      customer_name,
      customer_phone,
      from_address,
      to_address,
      distance_km,
      charge_amount,
      status,
      notes,
      created_at
    FROM transport_bookings
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [userId], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getUserTransportBookings error:", err);
      return res.status(500).json([]);
    }

    return res.json(rows || []);
  });
};

export const confirmTransportBooking = (req: Request, res: Response) => {
  const bookingId = Number(req.params.bookingId);
  if (!bookingId) return res.status(400).json({ message: "Invalid booking id" });

  const sql = `
    SELECT tb.*, u.email, u.username
    FROM transport_bookings tb
    JOIN users u ON u.id = tb.user_id
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

    db.query(
      "UPDATE transport_bookings SET status='CONFIRMED' WHERE id=?",
      [bookingId],
      (updateErr: any) => {
        if (updateErr) {
          console.error("❌ confirmTransportBooking update error:", updateErr);
          return res.status(500).json({ message: "Failed to confirm transport booking" });
        }

        db.query("INSERT INTO notifications (user_id,message) VALUES (?,?)", [
          Number(row.user_id),
          `✅ Transport booking #${bookingId} confirmed by admin`,
        ]);

        const userMail = row.email;
        const adminMail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        const mailHtml = `
          <p>Hi ${row.username || row.customer_name},</p>
          <p>Your transport booking <b>#${bookingId}</b> is confirmed.</p>
          <p><b>From:</b> ${row.from_address}<br/><b>To:</b> ${row.to_address}</p>
          <p><b>Distance:</b> ${Number(row.distance_km).toFixed(2)} km<br/><b>Charge:</b> ₹${Number(row.charge_amount).toFixed(2)}</p>
        `;

        Promise.all([
          userMail
            ? transporter.sendMail({
                to: userMail,
                subject: `Transport Booking Confirmed (#${bookingId})`,
                html: mailHtml,
              })
            : Promise.resolve(),
          adminMail
            ? transporter.sendMail({
                to: adminMail,
                subject: `Admin Copy: Transport Confirmed (#${bookingId})`,
                html: `<p>Transport booking #${bookingId} confirmed for ${row.username || row.customer_name}.</p>`,
              })
            : Promise.resolve(),
        ]).catch((mailErr) => console.error("❌ transport confirm mail error:", mailErr));

        return res.json({ success: true });
      }
    );
  });
};
