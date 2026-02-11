import express from "express";
import {
  createTransportBooking,
  getAllTransportBookings,
  getUserTransportBookings,
} from "../controllers/transport.controller";

const router = express.Router();

router.post("/book", createTransportBooking);
router.get("/", getAllTransportBookings);
router.get("/user/:userId", getUserTransportBookings);

export default router;