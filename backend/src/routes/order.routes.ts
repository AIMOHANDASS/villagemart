import express from "express";
import {
  createOrder,
  getAllOrders,
  getGarlandOrders,
  sendGarlandReminder,
  getUserOrders,
  confirmOrder,
  updateOrderStatus,
  adminCancelOrder,
  userCancelOrder,
  getAdminPanelData,
} from "../controllers/order.controller";

const router = express.Router();

router.post("/", createOrder);
router.get("/", getAllOrders);
router.get("/admin/panel-data", getAdminPanelData);
router.get("/garland", getGarlandOrders);
router.post("/garland/reminder/:orderId", sendGarlandReminder);
router.get("/user/:userId", getUserOrders);

router.post("/confirm/:orderId", confirmOrder);
router.post("/status/:orderId", updateOrderStatus);   // ✅ important
router.post("/admin-cancel/:orderId", adminCancelOrder);
router.post("/user-cancel/:orderId", userCancelOrder);

export default router;
