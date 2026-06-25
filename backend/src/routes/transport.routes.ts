import express from "express";
import {
  createTransportBooking,
  getAllTransportBookings,
  getUserTransportBookings,
  confirmTransportBooking,
  getActiveTransportRides,
  startRideWithOtp
} from "../controllers/transport.controller";

import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/book", createTransportBooking);
router.get("/", getAllTransportBookings);
router.get("/user/:userId", getUserTransportBookings);
router.post("/confirm/:bookingId", verifyToken, confirmTransportBooking);
router.get("/nearby", verifyToken, getActiveTransportRides);
router.post("/start-ride/:id", verifyToken, startRideWithOtp);

export default router;
