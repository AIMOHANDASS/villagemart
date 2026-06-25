import { Request, Response } from "express";
import db from "../db";

/* ======================================================
   🛠️ GLOBAL VEHICLE SERVICE AVAILABILITY CONTROLLER
   
   Manages system-wide toggle states for the four fleet
   tiers (Scooter, Bike, Auto, Car) via a centralised
   `system_settings` config table.
====================================================== */

/**
 * GET  /api/settings/global-vehicles
 * Returns the current on/off status for every vehicle tier.
 * Public — consumed by both Admin and Customer apps.
 */
export const getGlobalVehicleStatus = (_req: Request, res: Response) => {
  const sql = "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'service_active_%'";

  db.query(sql, (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getGlobalVehicleStatus error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    // Build a clean key→boolean map: { scooter: true, bike: true, auto: false, car: true }
    const services: Record<string, boolean> = {};
    (rows || []).forEach((row: any) => {
      const vehicleKey = row.setting_key.replace("service_active_", "");
      services[vehicleKey] = row.setting_value === "true" || row.setting_value === "1";
    });

    return res.json({ success: true, services });
  });
};

/**
 * PUT  /api/settings/update-vehicle-service
 * Body: { vehicleType: "auto", isActive: false }
 * Admin-only — protected by verifyToken + isAdmin middleware.
 */
export const updateGlobalVehicleStatus = (req: any, res: Response) => {
  try {
    const { vehicleType, isActive } = req.body;

    if (!vehicleType || typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "vehicleType (string) and isActive (boolean) are required." });
    }

    const allowedTypes = ["scooter", "bike", "auto", "car"];
    const normalised = String(vehicleType).toLowerCase().trim();

    if (!allowedTypes.includes(normalised)) {
      return res.status(400).json({ success: false, message: `Invalid vehicle type: ${vehicleType}. Allowed: ${allowedTypes.join(", ")}` });
    }

    const targetKey = `service_active_${normalised}`;
    const targetValue = isActive ? "true" : "false";

    const sql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?";
    db.query(sql, [targetValue, targetKey], (err: any, result: any) => {
      if (err) {
        console.error("❌ updateGlobalVehicleStatus error:", err);
        return res.status(500).json({ success: false, error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: `Setting key '${targetKey}' not found in system_settings.` });
      }

      console.log(`✅ System setting updated: ${normalised.toUpperCase()} → ${isActive ? "ENABLED" : "DISABLED"}`);
      return res.json({
        success: true,
        message: `${normalised.charAt(0).toUpperCase() + normalised.slice(1)} service ${isActive ? "enabled" : "disabled"} successfully.`,
      });
    });
  } catch (error: any) {
    console.error("❌ updateGlobalVehicleStatus exception:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
