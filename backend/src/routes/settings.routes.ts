import express from "express";
import {
  getGlobalVehicleStatus,
  updateGlobalVehicleStatus,
} from "../controllers/settings.controller";
import { verifyToken, isAdmin } from "../middleware/auth.middleware";

const router = express.Router();

// Public — consumed by both Admin toggles and Customer booking page
router.get("/global-vehicles", getGlobalVehicleStatus);

// Admin-only — toggle a vehicle tier on or off
router.put("/update-vehicle-service", verifyToken, isAdmin, updateGlobalVehicleStatus);

export default router;
