"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const razorpay_controller_1 = require("../controllers/razorpay.controller");
const dueSettlementWebhookController_1 = require("../controllers/dueSettlementWebhookController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/razorpay/product-order", auth_middleware_1.verifyToken, razorpay_controller_1.createProductRazorpayOrder);
router.post("/razorpay/order", auth_middleware_1.verifyToken, razorpay_controller_1.createSettlementOrder);
router.post("/razorpay/verify", auth_middleware_1.verifyToken, razorpay_controller_1.verifySettlementPayment);
router.post("/create-due-order", razorpay_controller_1.createDueOrder);
router.post("/verify-due-payment", razorpay_controller_1.verifyDuePayment);
router.post("/razorpay/webhook", razorpay_controller_1.handleRazorpayWebhook);
router.post("/webhook/due-settlement", dueSettlementWebhookController_1.handleRazorpayWebhookDueSettlement);
exports.default = router;
