import { Request, Response } from "express";
import db from "../db";
import bcrypt from "bcryptjs";
import { sendEmailOtpMail } from "../utils/mailer";

/* =========================
   SEND RESET OTP
   POST /api/auth/forgot-password
========================= */
export const sendResetOtp = (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const sql =
    "UPDATE users SET reset_otp = ?, reset_otp_expiry = ? WHERE email = ?";

  db.query(sql, [otp, expiry, email], async (err: any, result: any) => {
    if (err) {
      console.error("Forgot password error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Email not found" });
    }

    await sendEmailOtpMail(email, otp);

    return res.json({ message: "Password reset OTP sent to email" });
  });
};

/* =========================
   VERIFY RESET OTP
   POST /api/auth/verify-reset-otp
========================= */
export const verifyResetOtp = (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const sql = `
    SELECT id FROM users
    WHERE email = ?
    AND reset_otp = ?
    AND reset_otp_expiry > NOW()
  `;

  db.query(sql, [email, otp], (err: any, rows: any[]) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    return res.json({ message: "OTP verified" });
  });
};

/* =========================
   RESET PASSWORD
   POST /api/auth/reset-password
========================= */
export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: "New password required" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const sql = `
    UPDATE users
    SET password = ?, reset_otp = NULL, reset_otp_expiry = NULL
    WHERE email = ?
    AND reset_otp = ?
    AND reset_otp_expiry > NOW()
  `;

  db.query(
    sql,
    [hashedPassword, email, otp],
    (err: any, result: any) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({ message: "OTP expired or invalid" });
      }

      return res.json({ message: "Password reset successful" });
    }
  );
};
