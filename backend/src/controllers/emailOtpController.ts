import { Request, Response } from "express";
import { sendEmailOtpMail } from "../utils/mailer";

const emailOtpStore = new Map<string, string>();

export const sendEmailOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  emailOtpStore.set(email, otp);

  try {
    await sendEmailOtpMail(email, otp);
    return res.json({ message: "Email OTP sent" });
  } catch (error) {
    console.error("Email OTP error:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

export const verifyEmailOtp = (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const savedOtp = emailOtpStore.get(email);

  if (!savedOtp) {
    return res.status(400).json({ message: "OTP expired" });
  }

  if (savedOtp !== otp) {
    return res.status(401).json({ message: "Invalid OTP" });
  }

  emailOtpStore.delete(email);
  return res.json({ message: "Email verified" });
};
