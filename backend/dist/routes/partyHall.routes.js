"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const partyHall_controller_1 = require("../controllers/partyHall.controller");
const router = express_1.default.Router();
router.post("/book", partyHall_controller_1.createPartyHallBooking);
router.get("/", partyHall_controller_1.getAllPartyHallBookings);
router.get("/availability", partyHall_controller_1.getPartyHallAvailability);
router.get("/user/:userId", partyHall_controller_1.getUserPartyHallBookings);
exports.default = router;
