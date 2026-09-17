"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const recoveryController_1 = require("../controllers/recoveryController");
const router = express_1.default.Router();
/* ======================================================
   🔐 IDENTITY UPGRADE & PASSWORD RECOVERY ROUTES
   Base path: /api/auth/recovery

   POST /api/auth/recovery/request      — Send OTP to email
   POST /api/auth/recovery/verify-reset  — Verify OTP + set new password
====================================================== */
router.post("/request", recoveryController_1.requestRecoveryOtp);
router.post("/verify-reset", recoveryController_1.verifyOtpAndResetPassword);
exports.default = router;
