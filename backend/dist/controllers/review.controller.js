"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviews = exports.addReview = void 0;
const db_1 = __importDefault(require("../db"));
/* ======================================================
   ⭐ CREATE REVIEW
   POST /api/reviews/add
====================================================== */
const addReview = (req, res) => {
    const { userId, orderId, rating, comment, items } = req.body;
    if (!userId || !rating) {
        return res.status(400).json({ success: false, message: "UserId and Rating required" });
    }
    const sql = `
    INSERT INTO reviews (\`user id\`, \`order id\`, rating, comment)
    VALUES (?, ?, ?, ?)
  `;
    db_1.default.query(sql, [userId, orderId || null, rating, comment || ""], (err, result) => {
        if (err) {
            console.error("❌ addReview error:", err);
            return res.status(500).json({ success: false, message: "Failed to add review" });
        }
        res.json({ success: true, message: "Review submitted! Thank you." });
    });
};
exports.addReview = addReview;
/* ======================================================
   📜 GET REVIEWS
   GET /api/reviews
====================================================== */
const getReviews = (req, res) => {
    const sql = `
    SELECT r.id, r.\`order id\` AS order_id, r.\`user id\` AS user_id, r.rating, r.comment, r.\`created at\` AS created_at, u.username, u.profile_image 
    FROM reviews r
    JOIN users u ON u.id = r.\`user id\`
    ORDER BY r.\`created at\` DESC
  `;
    db_1.default.query(sql, (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Fetch failed" });
        res.json({ success: true, data: rows });
    });
};
exports.getReviews = getReviews;
exports.default = { addReview: exports.addReview, getReviews: exports.getReviews };
