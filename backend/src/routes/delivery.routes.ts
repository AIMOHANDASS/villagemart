// src/routes/delivery.routes.ts
import express from "express";
import {
  getDeliveryOrders,
  acceptOrder,
  updatePartnerDeliveryStatus,
  updateDeliveryLocation,
  signupDeliveryPartner,
  loginDeliveryPartner,
  toggleDeliveryOnline,
  getActiveDeliveryOrders,
  getDeliveryEarnings,
  verifyDeliveryOtp
} from "../controllers/delivery.controller";
import { verifyToken, isDelivery, checkRequiredRoles } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

// 🔐 Auth routes
router.post(
  "/signup",
  upload.fields([{ name: 'profile_image', maxCount: 1 }, { name: 'dl_document', maxCount: 1 }, { name: 'rc_document', maxCount: 1 }, { name: 'aadhaar_document', maxCount: 1 }]),
  signupDeliveryPartner
);
router.post("/login", loginDeliveryPartner);
router.post("/toggle-online", verifyToken, isDelivery, toggleDeliveryOnline);

// 📦 Get actionable orders for delivery (filter via ?status=)
router.get("/orders", verifyToken, isDelivery, getDeliveryOrders);

// 📍 Get nearby grocery orders (20 km radius)
router.get("/nearby", verifyToken, isDelivery, getActiveDeliveryOrders);

// 📦 Accept an order (CONFIRMED -> PICKED)
router.post("/accept/:orderId", verifyToken, isDelivery, acceptOrder);

// 📦 Update order status (PENDING -> PICKED -> OUT_FOR_DELIVERY -> DELIVERED)
router.put("/status-update/:orderId", verifyToken, isDelivery, updatePartnerDeliveryStatus);

// 🔐 Verify OTP to complete online delivery
router.post("/verify-otp", verifyToken, isDelivery, verifyDeliveryOtp);

// 📍 Update partner live GPS location
router.post("/location", verifyToken, isDelivery, updateDeliveryLocation);

// 💰 Delivery Earnings — ✅ FIXED: Uses checkRequiredRoles with broadened DELIVERY + DRIVER role array 🎯
router.get("/earnings", verifyToken, checkRequiredRoles(["DELIVERY", "DRIVER"]), getDeliveryEarnings);

export default router;

