import express from "express";
import { createSettlementOrder, verifySettlementPayment } from "../controllers/razorpay.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/razorpay/order", verifyToken, createSettlementOrder);
router.post("/razorpay/verify", verifyToken, verifySettlementPayment);

export default router;
