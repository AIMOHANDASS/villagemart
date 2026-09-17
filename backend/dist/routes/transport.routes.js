"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transport_controller_1 = require("../controllers/transport.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/razorpay-order", auth_middleware_1.verifyToken, transport_controller_1.createRazorpayOrder);
router.post("/book", auth_middleware_1.verifyToken, transport_controller_1.createTransportBooking);
router.get("/", auth_middleware_1.verifyToken, transport_controller_1.getAllTransportBookings);
router.get("/user/:userId", auth_middleware_1.verifyToken, transport_controller_1.getUserTransportBookings); // legacy route
router.post("/confirm/:bookingId", auth_middleware_1.verifyToken, transport_controller_1.confirmTransportBooking);
router.get("/nearby", auth_middleware_1.verifyToken, transport_controller_1.getActiveTransportRides);
router.post("/start-ride/:id", auth_middleware_1.verifyToken, transport_controller_1.startRideWithOtp);
// Ride History & Ride Details Endpoints
router.get("/history", auth_middleware_1.verifyToken, transport_controller_1.getRideHistory);
router.get("/:id", auth_middleware_1.verifyToken, transport_controller_1.getRideDetails);
router.post("/:id/rating", auth_middleware_1.verifyToken, transport_controller_1.rateRide);
router.post("/:id/support", auth_middleware_1.verifyToken, transport_controller_1.submitRideSupport);
router.put("/:id/cancel", auth_middleware_1.verifyToken, transport_controller_1.cancelRide);
exports.default = router;
