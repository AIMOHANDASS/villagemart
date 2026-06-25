// src/controllers/location.controller.ts
// Location tracking for delivery partners and transport drivers
import db from "../db";

/* ======================================================
   🗂 ENSURE PARTNER_LOCATIONS TABLE EXISTS
====================================================== */
db.query(
  `
  CREATE TABLE IF NOT EXISTS partner_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partner_type ENUM('delivery','transport') NOT NULL,
    partner_id INT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_partner (partner_id, partner_type),
    INDEX idx_partner_type (partner_type),
    INDEX idx_updated (updated_at)
  )
  `,
  (err) => {
    if (err) {
      console.error("❌ Could not ensure partner_locations table:", err);
    } else {
      console.log("✅ partner_locations table ready");
    }
  }
);

/* ======================================================
   🗂 TRY TO ADD driver_id AND delivery_partner_id COLUMNS
   (safe — won't break if they already exist)
====================================================== */
const safeAddColumn = (table: string, column: string, definition: string) => {
  db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,
    [table, column],
    (err: any, rows: any[]) => {
      if (!err && (!rows || rows.length === 0)) {
        db.query(`ALTER TABLE ${table} ADD COLUMN \`${column}\` ${definition}`, (addErr) => {
          if (addErr) {
            console.error(`❌ Could not add ${column} to ${table}:`, addErr);
          } else {
            console.log(`✅ Added '${column}' to ${table}`);
          }
        });
      }
    }
  );
};

// Add delivery_partner_id to orders table
safeAddColumn("orders", "delivery_partner_id", "INT NULL");

// Add driver_id to transport_bookings table
safeAddColumn("transport_bookings", "driver_id", "INT NULL");

/* ======================================================
   📍 GET NEARBY DRIVERS (For users to see on map)
   GET /api/location/nearby?lat=...&lng=...&type=transport
====================================================== */
export const getNearbyDrivers = (req: any, res: any) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const type = (req.query.type || 'transport').toLowerCase();

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: "Latitude and Longitude are required" });
  }

  const sql = `
    SELECT 
      pl.*,
      (6371 * acos(
        cos(radians(?)) *
        cos(radians(latitude)) *
        cos(radians(longitude) - radians(?)) +
        sin(radians(?)) *
        sin(radians(latitude))
      )) AS distance
    FROM partner_locations pl
    WHERE pl.partner_type = ?
    HAVING distance < 5
    ORDER BY distance;
  `;

  db.query(sql, [lat, lng, lat, type], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getNearbyDrivers error:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch nearby drivers" });
    }

    return res.json({
      success: true,
      data: rows || []
    });
  });
};

export default { getNearbyDrivers };
