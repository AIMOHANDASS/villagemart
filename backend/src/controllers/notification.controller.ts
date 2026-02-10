import { Request, Response } from "express";
import db from "../db";

export const getUserNotifications = (req: Request, res: Response) => {
  const { userId } = req.params;

  db.query(
    "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC",
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    }
  );
};

export const markRead = (req: Request, res: Response) => {
  db.query(
    "UPDATE notifications SET is_read=true WHERE id=?",
    [req.params.id],
    () => res.json({ success: true })
  );
};
