import { Request, Response } from "express";
import db from "../db";

/* ======================================================
   ⭐ CREATE REVIEW
   POST /api/reviews/add
====================================================== */
export const addReview = (req: Request, res: Response) => {
  const { userId, orderId, rating, comment, items } = req.body;

  if (!userId || !rating) {
    return res.status(400).json({ success: false, message: "UserId and Rating required" });
  }

  const sql = `
    INSERT INTO reviews (\`user id\`, \`order id\`, rating, comment)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [userId, orderId || null, rating, comment || ""], (err, result: any) => {
    if (err) {
      console.error("❌ addReview error:", err);
      return res.status(500).json({ success: false, message: "Failed to add review" });
    }

    res.json({ success: true, message: "Review submitted! Thank you." });
  });
};

/* ======================================================
   📜 GET REVIEWS
   GET /api/reviews
====================================================== */
export const getReviews = (req: Request, res: Response) => {
  const sql = `
    SELECT r.id, r.\`order id\` AS order_id, r.\`user id\` AS user_id, r.rating, r.comment, r.\`created at\` AS created_at, u.username, u.profile_image 
    FROM reviews r
    JOIN users u ON u.id = r.\`user id\`
    ORDER BY r.\`created at\` DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: "Fetch failed" });
    res.json({ success: true, data: rows });
  });
};

export default { addReview, getReviews };
