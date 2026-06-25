import express from "express";
import { searchLocation, getDistance } from "../controllers/search.controller";

const router = express.Router();

// 🌍 Smart Location Search
router.get("/search", searchLocation);

// 📏 Distance calculation
router.get("/distance", getDistance);

// 📍 Nearby drivers/partners
import { getNearbyDrivers } from "../controllers/location.controller";
router.get("/nearby", getNearbyDrivers);

export default router;
