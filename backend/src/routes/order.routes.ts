import express from "express";
import {
  createOrder,
  getAllOrders,
  getUserOrders,
  confirmOrder,
  updateOrderStatus,
  adminCancelOrder,
  userCancelOrder,
} from "../controllers/order.controller";

const router = express.Router();

router.post("/", createOrder);
router.get("/", getAllOrders);
router.get("/user/:userId", getUserOrders);

router.post("/confirm/:orderId", confirmOrder);
router.post("/status/:orderId", updateOrderStatus);   // ✅ important
router.post("/admin-cancel/:orderId", adminCancelOrder);
router.post("/user-cancel/:orderId", userCancelOrder);

export default router;
