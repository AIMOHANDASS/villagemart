"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const razorpay_controller_1 = require("../controllers/razorpay.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/razorpay/order", auth_middleware_1.verifyToken, razorpay_controller_1.createSettlementOrder);
router.post("/razorpay/verify", auth_middleware_1.verifyToken, razorpay_controller_1.verifySettlementPayment);
exports.default = router;
