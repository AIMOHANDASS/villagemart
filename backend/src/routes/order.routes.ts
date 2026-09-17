import express from "express";
import {
  createOrder,
  getAllOrders,
  getGarlandOrders,
  sendGarlandReminder,
  getUserOrders,
  confirmOrder,
  updateOrderStatus,
  updateOrderStatusUnified,
  adminCancelOrder,
  userCancelOrder,
  getAdminPanelData,
  getOrderDetails,
} from "../controllers/order.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { orderLimiter, orderFetchLimiter } from "../middleware/rateLimiter";

const router = express.Router();

router.post("/", orderLimiter, createOrder);
router.get("/", orderLimiter, verifyToken, getAllOrders);
router.get("/admin/panel-data", orderLimiter, verifyToken, getAdminPanelData);
router.get("/garland", orderLimiter, verifyToken, getGarlandOrders);
router.post("/garland/reminder/:orderId", orderLimiter, verifyToken, sendGarlandReminder);
router.get("/user/:userId", orderFetchLimiter, verifyToken, getUserOrders);
router.get("/details/:orderId", orderFetchLimiter, verifyToken, getOrderDetails);

router.put("/update-status/:orderId", orderLimiter, verifyToken, confirmOrder);
router.post("/status/:orderId", orderLimiter, updateOrderStatus);   // ✅ important
router.put("/:id/status", orderLimiter, verifyToken, updateOrderStatusUnified);
router.post("/admin-cancel/:orderId", orderLimiter, verifyToken, adminCancelOrder);
router.post("/user-cancel/:orderId", orderLimiter, verifyToken, userCancelOrder);

export default router;
