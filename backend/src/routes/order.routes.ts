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
} from "../controllers/order.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/", createOrder);
router.get("/", getAllOrders);
router.get("/admin/panel-data", getAdminPanelData);
router.get("/garland", getGarlandOrders);
router.post("/garland/reminder/:orderId", sendGarlandReminder);
router.get("/user/:userId", getUserOrders);

router.put("/update-status/:orderId", verifyToken, confirmOrder);
router.post("/status/:orderId", updateOrderStatus);   // ✅ important
router.put("/:id/status", verifyToken, updateOrderStatusUnified);
router.post("/admin-cancel/:orderId", adminCancelOrder);
router.post("/user-cancel/:orderId", userCancelOrder);

export default router;
