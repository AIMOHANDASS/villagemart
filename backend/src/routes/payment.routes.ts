import express from "express";
import { createSettlementOrder, verifySettlementPayment, handleRazorpayWebhook, createDueOrder, verifyDuePayment, createProductRazorpayOrder } from "../controllers/razorpay.controller";
import { handleRazorpayWebhookDueSettlement } from "../controllers/dueSettlementWebhookController";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/razorpay/product-order", verifyToken, createProductRazorpayOrder);
router.post("/razorpay/order", verifyToken, createSettlementOrder);
router.post("/razorpay/verify", verifyToken, verifySettlementPayment);
router.post("/create-due-order", createDueOrder);
router.post("/verify-due-payment", verifyDuePayment);
router.post("/razorpay/webhook", handleRazorpayWebhook);
router.post("/webhook/due-settlement", handleRazorpayWebhookDueSettlement);

export default router;
