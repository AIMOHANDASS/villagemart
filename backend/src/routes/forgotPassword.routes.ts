import express from "express";
import {
  sendResetOtp,
  verifyResetOtp,
  resetPassword,
} from "../controllers/forgotPasswordController";

const router = express.Router();

router.post("/forgot-password", sendResetOtp);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

export default router;
