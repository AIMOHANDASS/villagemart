import { Request, Response } from "express";
import db from "../db";

const PARTY_HALL_BASE_CHARGE = 700;
const PARTY_HALL_DURATION_HOURS = 3;
const SUPPORT_NUMBER = "+91 8903003808";

const addOnPriceMap: Record<string, number> = {
  water: 5,
  snacks: 30,
  cake: 450,
  decoration: 350,
  tea: 15,
};

db.query(
  `
  CREATE TABLE IF NOT EXISTS party_hall_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(25) NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    person_count INT NOT NULL,
    snacks_count INT NOT NULL DEFAULT 0,
    water_count INT NOT NULL DEFAULT 0,
    cake_count INT NOT NULL DEFAULT 0,
    add_ons_json JSON NULL,
    notes TEXT NULL,
    base_charge DECIMAL(10,2) NOT NULL,
    add_on_charge DECIMAL(10,2) NOT NULL,
    total_charge DECIMAL(10,2) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'BOOKED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_partyhall_user (user_id),
    INDEX idx_partyhall_date (event_date),
    CONSTRAINT fk_partyhall_user FOREIGN KEY (user_id) REFERENCES users(id)
  )
  `,
  (err) => {
    if (err) {
      console.error("❌ Could not ensure party_hall_bookings table:", err);
    }
  }
);

const toDateTime = (date: string, time: string) => new Date(`${date}T${time}:00`);

const formatTime = (value: Date) => value.toTimeString().slice(0, 8);

const computeAddOnCharge = (
  personCount: number,
  snacksCount: number,
  waterCount: number,
  cakeCount: number,
  selectedAddOns: string[]
) => {
  const addOnSet = new Set(selectedAddOns.map((a) => a.toLowerCase()));
  let total = 0;

  if (addOnSet.has("snacks")) total += snacksCount * addOnPriceMap.snacks;
  if (addOnSet.has("water")) total += waterCount * addOnPriceMap.water;
  if (addOnSet.has("cake")) total += cakeCount * addOnPriceMap.cake;
  if (addOnSet.has("decoration")) total += addOnPriceMap.decoration;
  if (addOnSet.has("tea")) total += personCount * addOnPriceMap.tea;

  return Number(total.toFixed(2));
};

const hasSlotOverlap = (
  eventDate: string,
  startTime: string,
  endTime: string,
  cb: (overlap: boolean, err?: any) => void
) => {
  const sql = `
    SELECT id FROM party_hall_bookings
    WHERE event_date = ?
      AND status <> 'CANCELLED'
      AND NOT (end_time <= ? OR start_time >= ?)
    LIMIT 1
  `;

  db.query(sql, [eventDate, startTime, endTime], (err: any, rows: any[]) => {
    if (err) return cb(false, err);
    return cb((rows || []).length > 0);
  });
};

export const createPartyHallBooking = (req: Request, res: Response) => {
  const {
    userId,
    customerName,
    customerPhone,
    eventDate,
    startTime,
    personCount,
    snacksCount,
    waterCount,
    cakeCount,
    addOns,
    notes,
  } = req.body;

  if (!userId || !customerName || !customerPhone || !eventDate || !startTime) {
    return res.status(400).json({ message: "Invalid party hall booking data" });
  }

  const totalPersons = Number(personCount || 0);
  if (!Number.isFinite(totalPersons) || totalPersons <= 0) {
    return res.status(400).json({ message: "Person count must be greater than 0" });
  }

  const start = toDateTime(eventDate, startTime);
  if (Number.isNaN(start.getTime())) {
    return res.status(400).json({ message: "Invalid start time" });
  }

  const end = new Date(start.getTime() + PARTY_HALL_DURATION_HOURS * 60 * 60 * 1000);
  const endTime = formatTime(end);

  const safeSnacks = Math.max(0, Number(snacksCount || 0));
  const safeWater = Math.max(0, Number(waterCount || 0));
  const safeCake = Math.max(0, Number(cakeCount || 0));
  const selectedAddOns = Array.isArray(addOns)
    ? addOns.map((a) => String(a).toLowerCase())
    : [];

  hasSlotOverlap(eventDate, startTime, endTime, (overlap, overlapErr) => {
    if (overlapErr) {
      console.error("❌ party hall overlap check error:", overlapErr);
      return res.status(500).json({ message: "Failed to validate slot" });
    }

    if (overlap) {
      return res.status(409).json({
        message: "This time slot is already booked. Please choose another slot.",
      });
    }

    const addOnCharge = computeAddOnCharge(
      totalPersons,
      safeSnacks,
      safeWater,
      safeCake,
      selectedAddOns
    );

    const totalCharge = Number((PARTY_HALL_BASE_CHARGE + addOnCharge).toFixed(2));

    const sql = `
      INSERT INTO party_hall_bookings
      (user_id, customer_name, customer_phone, event_date, start_time, end_time, person_count, snacks_count, water_count, cake_count, add_ons_json, notes, base_charge, add_on_charge, total_charge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        Number(userId),
        customerName,
        customerPhone,
        eventDate,
        startTime,
        endTime,
        totalPersons,
        safeSnacks,
        safeWater,
        safeCake,
        JSON.stringify(selectedAddOns),
        notes || null,
        PARTY_HALL_BASE_CHARGE,
        addOnCharge,
        totalCharge,
      ],
      (err: any, result: any) => {
        if (err) {
          console.error("❌ createPartyHallBooking error:", err);
          return res.status(500).json({ message: "Failed to create party hall booking" });
        }

        db.query("INSERT INTO notifications (user_id,message) VALUES (?,?)", [
          Number(userId),
          `🏛 Party hall booked on ${eventDate} ${startTime}-${endTime}. Clarification: ${SUPPORT_NUMBER}`,
        ]);

        return res.json({
          success: true,
          bookingId: result.insertId,
          start_time: startTime,
          end_time: endTime,
          duration_hours: PARTY_HALL_DURATION_HOURS,
          base_charge: PARTY_HALL_BASE_CHARGE,
          add_on_charge: addOnCharge,
          total_charge: totalCharge,
          support_number: SUPPORT_NUMBER,
        });
      }
    );
  });
};

export const getPartyHallAvailability = (req: Request, res: Response) => {
  const eventDate = String(req.query.date || "");
  if (!eventDate) {
    return res.status(400).json({ message: "date query param is required" });
  }

  const sql = `
    SELECT id, start_time, end_time, status
    FROM party_hall_bookings
    WHERE event_date = ?
      AND status <> 'CANCELLED'
    ORDER BY start_time ASC
  `;

  db.query(sql, [eventDate], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getPartyHallAvailability error:", err);
      return res.status(500).json([]);
    }

    return res.json(rows || []);
  });
};

export const getAllPartyHallBookings = (req: Request, res: Response) => {
  const sql = `
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

  db.query(sql, (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getAllPartyHallBookings error:", err);
      return res.status(500).json([]);
    }

    return res.json(rows || []);
  });
};

export const getUserPartyHallBookings = (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ message: "Invalid user id" });

  const sql = `
    SELECT
      id,
      user_id,
      customer_name,
      customer_phone,
      event_date,
      start_time,
      end_time,
      person_count,
      snacks_count,
      water_count,
      cake_count,
      add_ons_json,
      notes,
      base_charge,
      add_on_charge,
      total_charge,
      status,
      created_at
    FROM party_hall_bookings
    WHERE user_id = ?
    ORDER BY event_date DESC, start_time DESC
  `;

  db.query(sql, [userId], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getUserPartyHallBookings error:", err);
      return res.status(500).json([]);
    }

    return res.json(rows || []);
  });
};
