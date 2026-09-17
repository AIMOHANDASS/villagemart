import { Request, Response } from "express";
import db from "../db";
import { getAbsoluteImageUrl } from "./product.controller";

/* ======================================================
   🤖 CHATBOT CONTROLLER — Live MySQL Product Search
   Accepts keyword queries from the AI chatbot frontend,
   performs fuzzy matching against the products table.
====================================================== */

/**
 * POST /api/chatbot/query
 * Body: { query: string }
 * Returns matching products from the active MySQL schema.
 */
export const queryProducts = (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({
      success: false,
      message: "Query string is required",
      data: [],
    });
  }

  // Split query into individual keywords for broad matching
  const keywords = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((w: string) => w.length > 1);

  if (keywords.length === 0) {
    return res.json({ success: true, data: [], count: 0 });
  }

  // Build dynamic WHERE clause: each keyword matches name, category, or description
  const conditions = keywords.map(
    () =>
      `(LOWER(p.E_name) LIKE ? OR LOWER(p.T_name) LIKE ? OR LOWER(p.category) LIKE ? OR LOWER(COALESCE(p.description, '')) LIKE ?)`
  );
  const whereClause = conditions.join(" OR ");

  // Each keyword gets 4 parameter slots (E_name, T_name, category, description)
  const params: string[] = [];
  keywords.forEach((kw: string) => {
    const likeVal = `%${kw}%`;
    params.push(likeVal, likeVal, likeVal, likeVal);
  });

  const sql = `
    SELECT p.*, GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order ASC) as aggregated_images
    FROM \`products\` p
    LEFT JOIN \`product_images\` pi ON p.id = pi.product_id
    WHERE (${whereClause})
    GROUP BY p.id
    ORDER BY p.id DESC
    LIMIT 20
  `;

  db.query(sql, params, (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ Chatbot query DB error:", err);
      return res.status(500).json({
        success: false,
        message: "Database query failed",
        data: [],
      });
    }

    const parsed = (rows || []).map((row: any) => {
      const images = row.aggregated_images
        ? row.aggregated_images.split(",")
        : [];
      // Fallback to legacy imageurl if images is empty
      if (images.length === 0 && row.imageurl) {
        images.push(row.imageurl);
      }
      const absoluteImages = images.map((img: string) => getAbsoluteImageUrl(req, img));
      return {
        ...row,
        imageurl: getAbsoluteImageUrl(req, row.imageurl),
        images: absoluteImages,
      };
    });

    return res.json({
      success: true,
      data: parsed,
      count: parsed.length,
    });
  });
};
