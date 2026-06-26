"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/delivery.routes.ts
const express_1 = __importDefault(require("express"));
const delivery_controller_1 = require("../controllers/delivery.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = express_1.default.Router();
// 🔐 Auth routes
router.post("/signup", upload_middleware_1.upload.fields([{ name: 'profile_image', maxCount: 1 }, { name: 'dl_document', maxCount: 1 }, { name: 'rc_document', maxCount: 1 }, { name: 'aadhaar_document', maxCount: 1 }]), delivery_controller_1.signupDeliveryPartner);
router.post("/login", delivery_controller_1.loginDeliveryPartner);
router.post("/toggle-online", auth_middleware_1.verifyToken, auth_middleware_1.isDelivery, delivery_controller_1.toggleDeliveryOnline);
// 📦 Get actionable orders for delivery (filter via ?status=)
router.get("/orders", auth_middleware_1.verifyToken, auth_middleware_1.isDelivery, delivery_controller_1.getDeliveryOrders);
// 📍 Get nearby grocery orders (20 km radius)
router.get("/nearby", auth_middleware_1.verifyToken, auth_middleware_1.isDelivery, delivery_controller_1.getActiveDeliveryOrders);
// 📦 Accept an order (CONFIRMED -> PICKED)
router.post("/accept/:orderId", auth_middleware_1.verifyToken, auth_middleware_1.isDelivery, delivery_controller_1.acceptOrder);
// 📦 Update order status (PENDING -> PICKED -> OUT_FOR_DELIVERY -> DELIVERED)
router.put("/status-update/:orderId", auth_middleware_1.verifyToken, auth_middleware_1.isDelivery, delivery_controller_1.updatePartnerDeliveryStatus);
// 🔐 Verify OTP to complete online delivery
router.post("/verify-otp", auth_middleware_1.verifyToken, auth_middleware_1.isDelivery, delivery_controller_1.verifyDeliveryOtp);
// 📍 Update partner live GPS location
router.post("/location", auth_middleware_1.verifyToken, auth_middleware_1.isDelivery, delivery_controller_1.updateDeliveryLocation);
// 💰 Delivery Earnings — ✅ FIXED: Uses checkRequiredRoles with broadened DELIVERY + DRIVER role array 🎯
router.get("/earnings", auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRequiredRoles)(["DELIVERY", "DRIVER"]), delivery_controller_1.getDeliveryEarnings);
exports.default = router;
