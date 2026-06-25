"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/transportDriver.routes.ts
const express_1 = __importDefault(require("express"));
const transportDriver_controller_1 = require("../controllers/transportDriver.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = express_1.default.Router();
// 🔐 Auth routes
router.post("/signup", upload_middleware_1.upload.fields([{ name: 'profile_image', maxCount: 1 }, { name: 'document', maxCount: 1 }]), transportDriver_controller_1.signupTransportPartner);
router.post("/login", transportDriver_controller_1.loginTransportPartner);
router.post("/toggle-online", auth_middleware_1.verifyToken, auth_middleware_1.isTransport, transportDriver_controller_1.toggleTransportOnline);
// 🚗 Get available rides (filter via ?status=)
router.get("/bookings", auth_middleware_1.verifyToken, auth_middleware_1.isTransport, transportDriver_controller_1.getDriverBookings);
// 🚗 Get active ride for this driver
router.get("/my-active-ride", auth_middleware_1.verifyToken, auth_middleware_1.isTransport, transportDriver_controller_1.getMyActiveRide);
// 🚗 Accept a ride (BOOKED -> CONFIRMED)
router.post("/accept/:rideId", auth_middleware_1.verifyToken, auth_middleware_1.isTransport, transportDriver_controller_1.acceptRide);
// 🚗 Update ride status (CONFIRMED -> STARTED -> COMPLETED)
router.put("/status/:rideId", auth_middleware_1.verifyToken, auth_middleware_1.isTransport, transportDriver_controller_1.updateRideStatus);
router.post("/verify-otp", auth_middleware_1.verifyToken, auth_middleware_1.isTransport, transportDriver_controller_1.verifyRideOtp);
// 📍 Update driver live GPS location
router.post("/location", auth_middleware_1.verifyToken, auth_middleware_1.isTransport, transportDriver_controller_1.updateDriverLocation);
// 💰 Transport Driver Earnings — ✅ FIXED: Uses checkRequiredRoles with broadened TRANSPORT + RIDER + DRIVER role array 🎯
router.get("/earnings", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRequiredRoles)(["TRANSPORT", "RIDER", "DRIVER"]), transportDriver_controller_1.getDriverEarnings);
exports.default = router;
