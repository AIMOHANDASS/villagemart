import express from "express";
import {
  createRazorpayOrder,
  createTransportBooking,
  getAllTransportBookings,
  getUserTransportBookings,
  confirmTransportBooking,
  getActiveTransportRides,
  startRideWithOtp,
  getRideHistory,
  getRideDetails,
  rateRide,
  submitRideSupport,
  cancelRide
} from "../controllers/transport.controller";

import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/razorpay-order", verifyToken, createRazorpayOrder);
router.post("/book", verifyToken, createTransportBooking);
router.get("/", verifyToken, getAllTransportBookings);
router.get("/user/:userId", verifyToken, getUserTransportBookings); // legacy route
router.post("/confirm/:bookingId", verifyToken, confirmTransportBooking);
router.get("/nearby", verifyToken, getActiveTransportRides);
router.post("/start-ride/:id", verifyToken, startRideWithOtp);

// Ride History & Ride Details Endpoints
router.get("/history", verifyToken, getRideHistory);
router.get("/:id", verifyToken, getRideDetails);
router.post("/:id/rating", verifyToken, rateRide);
router.post("/:id/support", verifyToken, submitRideSupport);
router.put("/:id/cancel", verifyToken, cancelRide);

export default router;
