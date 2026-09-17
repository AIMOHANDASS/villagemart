import express from "express";
import {
  requestRecoveryOtp,
  verifyOtpAndResetPassword,
} from "../controllers/recoveryController";

const router = express.Router();

/* ======================================================
   🔐 IDENTITY UPGRADE & PASSWORD RECOVERY ROUTES
   Base path: /api/auth/recovery

   POST /api/auth/recovery/request      — Send OTP to email
   POST /api/auth/recovery/verify-reset  — Verify OTP + set new password
====================================================== */

router.post("/request", requestRecoveryOtp);
router.post("/verify-reset", verifyOtpAndResetPassword);

export default router;
