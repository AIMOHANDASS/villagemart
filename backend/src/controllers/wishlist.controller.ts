import { Request, Response } from "express";
import db from "../db";

/* ======================================================
   ❤️ 1. TOGGLE WISHLIST ITEM (POST /api/wishlist/toggle)
====================================================== */
export const toggleWishlist = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.body;
    const authUserId = (req as any).user?.id || userId;
    const targetUserId = Number(authUserId || userId);
    const targetProductId = Number(productId);

    if (!targetUserId || !targetProductId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId and productId",
      });
    }

    // 1. Check if item exists in user's wishlist
    db.query(
      "SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?",
      [targetUserId, targetProductId],
      (err, rows: any[]) => {
        if (err) {
          console.error("❌ Wishlist toggle check error:", err);
          return res.status(500).json({ success: false, message: "Database error" });
        }

        if (rows && rows.length > 0) {
          // If exists -> Remove from wishlist
          db.query(
            "DELETE FROM wishlist WHERE user_id = ? AND product_id = ?",
            [targetUserId, targetProductId],
            (deleteErr) => {
              if (deleteErr) {
                console.error("❌ Wishlist delete error:", deleteErr);
                return res.status(500).json({ success: false, message: "Failed to remove item" });
              }
              return res.json({
                success: true,
                isWishlisted: false,
                productId: targetProductId,
                message: "Removed from wishlist 💔",
              });
            }
          );
        } else {
          // If does not exist -> Insert into wishlist
          db.query(
            "INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)",
            [targetUserId, targetProductId],
            (insertErr) => {
              if (insertErr) {
                console.error("❌ Wishlist insert error:", insertErr);
                return res.status(500).json({ success: false, message: "Failed to add item" });
              }
              return res.json({
                success: true,
                isWishlisted: true,
                productId: targetProductId,
                message: "Added to wishlist ❤️",
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("❌ Wishlist toggle error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* ======================================================
   ❤️ 2. GET USER WISHLIST (GET /api/wishlist/:userId)
====================================================== */
export const getUserWishlist = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const reqUser = (req as any).user;
    if (reqUser?.role !== "ADMIN" && reqUser?.id !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only view your own wishlist" });
    }

    const query = `
      SELECT 
        w.id AS wishlist_id,
        p.id,
        p.E_name,
        p.T_name,
        p.MRP,
        p.s_price,
        p.imageurl AS image,
        p.inStock,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS averageRating,
        COUNT(DISTINCT r.id) AS reviewCount
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE w.user_id = ?
      GROUP BY w.id, p.id
      ORDER BY w.created_at DESC;
    `;

    db.query(query, [userId], (err, rows: any[]) => {
      if (err) {
        console.error("❌ Get wishlist error:", err);
        return res.status(500).json({ success: false, message: "Database query error" });
      }

      const formatted = (rows || []).map((r: any) => ({
        wishlist_id: r.wishlist_id,
        id: String(r.id),
        name: r.E_name || "",
        T_name: r.T_name || "",
        price: Number(r.s_price) || 0,
        originalPrice: Number(r.MRP) || undefined,
        image: r.image || "",
        inStock: Number(r.inStock) > 0,
        stock: Number(r.inStock) || 0,
        rating: Number(r.averageRating) || 0,
        reviews: Number(r.reviewCount) || 0,
      }));

      return res.json({
        success: true,
        data: formatted,
        count: formatted.length,
      });
    });
  } catch (error) {
    console.error("❌ Get wishlist error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* ======================================================
   ❤️ 3. GET WISHLIST COUNT (GET /api/wishlist/count/:userId)
====================================================== */
export const getWishlistCount = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId) {
      return res.json({ success: true, count: 0 });
    }

    db.query(
      "SELECT COUNT(*) AS count FROM wishlist WHERE user_id = ?",
      [userId],
      (err, rows: any[]) => {
        if (err) {
          console.error("❌ Get wishlist count error:", err);
          return res.status(500).json({ success: false, message: "Database error" });
        }
        const count = rows && rows[0] ? Number(rows[0].count) : 0;
        return res.json({ success: true, count });
      }
    );
  } catch (error) {
    console.error("❌ Get wishlist count error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
