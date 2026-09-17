// src/routes/transportDriver.routes.ts
import express from "express";
import {
  getDriverBookings,
  acceptRide,
  updateRideStatus,
  updateDriverLocation,
  getDriverEarnings,
  signupTransportPartner,
  loginTransportPartner,
  toggleTransportOnline,
  verifyRideOtp,
  getMyActiveRide,
  getDriverTrips,
  markCashCollected
} from "../controllers/transportDriver.controller";
import { verifyToken, isTransport, checkRequiredRoles } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.post("/signup", signupTransportPartner);
router.post("/login", loginTransportPartner);
router.post("/toggle-online", verifyToken, isTransport, toggleTransportOnline);

// 🚗 Get available rides (filter via ?status=)
router.get("/bookings", verifyToken, isTransport, getDriverBookings);

// 🚗 Get all trips assigned to this driver (active + history)
router.get("/trips", verifyToken, isTransport, getDriverTrips);

// 🚗 Get active ride for this driver
router.get("/my-active-ride", verifyToken, isTransport, getMyActiveRide);

// 🚗 Accept a ride (BOOKED -> CONFIRMED)
router.post("/accept/:rideId", verifyToken, isTransport, acceptRide);

// 🚗 Update ride status (CONFIRMED -> STARTED -> COMPLETED)
router.put("/status/:rideId", verifyToken, isTransport, updateRideStatus);
router.post("/verify-otp", verifyToken, isTransport, verifyRideOtp);

// 💵 Mark cash collected
router.post("/rides/:rideId/cash-collected", verifyToken, isTransport, markCashCollected);

// 📍 Update driver live GPS location
router.post("/location", verifyToken, isTransport, updateDriverLocation);

// 💰 Transport Driver Earnings — ✅ FIXED: Uses checkRequiredRoles with broadened TRANSPORT + RIDER + DRIVER role array 🎯
router.get("/earnings", verifyToken, checkRequiredRoles(["TRANSPORT", "RIDER", "DRIVER"]), getDriverEarnings);

export default router;

