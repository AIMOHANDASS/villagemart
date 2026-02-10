import express from "express";
import {
  createPartyHallBooking,
  getAllPartyHallBookings,
  getPartyHallAvailability,
  getUserPartyHallBookings,
} from "../controllers/partyHall.controller";

const router = express.Router();

router.post("/book", createPartyHallBooking);
router.get("/", getAllPartyHallBookings);
router.get("/availability", getPartyHallAvailability);
router.get("/user/:userId", getUserPartyHallBookings);

export default router;
