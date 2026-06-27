import { Request, Response } from "express";
import db from "../db";
import bcrypt from "bcryptjs";

/* =========================
   GET PROFILE
========================= */
export const getProfile = (req: Request, res: Response) => {
  const { id } = req.params;

  db.query(
    `SELECT id, name, username, email, phone, address,
            latitude, longitude, profile_image,
            \`dark mode\` AS dark_mode, is_private, hide_phone, \`hide address\` AS hide_address
     FROM users WHERE id = ?`,
    [id],
    (err, rows: any[]) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (rows.length === 0)
        return res.status(404).json({ message: "User not found" });
      const userRecord = rows[0];
      const profilePayload = {
        ...userRecord,
        phone: userRecord.phone ? String(userRecord.phone).trim() : ""
      };
      res.json(profilePayload);
    }
  );
};

/* =========================
   UPDATE PROFILE
========================= */
export const updateProfile = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, username, phone, address, latitude, longitude, profile_image } =
    req.body;

  db.query(
    `UPDATE users
     SET name=?, username=?, phone=?, address=?,
         latitude=?, longitude=?, profile_image=?
     WHERE id=?`,
    [
      name,
      username,
      phone,
      address,
      latitude,
      longitude,
      profile_image,
      id,
    ],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Update failed" });
      }
      res.json({ message: "Profile updated successfully" });
    }
  );
};

/* =========================
   CHANGE PASSWORD
========================= */
export const changePassword = async (req: Request, res: Response) => {
  const { userId, currentPassword, newPassword } = req.body;

  db.query(
    "SELECT password FROM users WHERE id=?",
    [userId],
    async (err, rows: any[]) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (rows.length === 0)
        return res.status(404).json({ message: "User not found" });

      const stored = rows[0].password;

      if (stored !== "GOOGLE_AUTH") {
        const ok = await bcrypt.compare(currentPassword, stored);
        if (!ok)
          return res
            .status(401)
            .json({ message: "Current password incorrect" });
      }

      const hashed = await bcrypt.hash(newPassword, 10);

      db.query(
        "UPDATE users SET password=? WHERE id=?",
        [hashed, userId],
        () => res.json({ message: "Password updated successfully" })
      );
    }
  );
};
/* =========================
   UPDATE SETTINGS
========================= */

export const updateSettings = (req: Request, res: Response) => {
  const { id } = req.params;
  const { dark_mode, is_private, hide_phone, hide_address } = req.body;

  db.query(
    `UPDATE users SET
      \`dark mode\`=?,
      is_private=?,
      hide_phone=?,
      \`hide address\`=?
     WHERE id=?`,
    [dark_mode, is_private, hide_phone, hide_address, id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Settings updated" });
    }
  );
};
