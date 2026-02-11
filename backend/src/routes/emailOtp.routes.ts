import express from "express";
import { sendEmailOtp, verifyEmailOtp } from "../controllers/emailOtpController";

const router = express.Router();

router.post("/send", sendEmailOtp);
router.post("/verify", verifyEmailOtp);

export default router;
