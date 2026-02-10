"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const forgotPasswordController_1 = require("../controllers/forgotPasswordController");
const router = express_1.default.Router();
router.post("/forgot-password", forgotPasswordController_1.sendResetOtp);
router.post("/verify-reset-otp", forgotPasswordController_1.verifyResetOtp);
router.post("/reset-password", forgotPasswordController_1.resetPassword);
exports.default = router;
