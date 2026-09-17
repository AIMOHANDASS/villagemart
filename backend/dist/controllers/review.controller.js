"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviews = exports.getProductReviews = exports.addReview = void 0;
const db_1 = __importDefault(require("../db"));
/* ======================================================
   ⭐ CREATE REVIEW (7-Step Express Validation Pipeline)
   POST /api/reviews/add
   Payload: { productId, orderId, userId, rating, comment }
====================================================== */
const addReview = (req, res) => {
    const productId = req.body.productId ?? req.body.product_id;
    const orderId = req.body.orderId ?? req.body.order_id;
    // Use authenticated user ID instead of trusting frontend payload
    const userId = req.user?.id || req.body.userId || req.body.user_id;
    const rating = Number(req.body.rating);
    const comment = req.body.comment || "";
    console.log("📥 [Review Submission] Received payload:", { productId, orderId, userId, rating, comment });
    // STEP 1: Body Parsing & Field Validation
    if (!productId || !orderId || !userId || req.body.rating === undefined) {
        console.warn("⚠️ [STEP 1 Fail] Missing required review fields.");
        return res.status(400).json({
            success: false,
            message: "Missing required fields: productId, orderId, userId, and rating are required.",
        });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        console.warn("⚠️ [STEP 1 Fail] Invalid rating range:", rating);
        return res.status(400).json({
            success: false,
            message: "Rating must be an integer between 1 and 5.",
        });
    }
    // STEP 2: Order Existence
    const checkOrderSql = `SELECT id, \`user id\` AS user_id, status FROM orders WHERE id = ?`;
    db_1.default.query(checkOrderSql, [orderId], (err, orderRows) => {
        if (err) {
            console.error("❌ [STEP 2 Error] Order query error:", err);
            return res.status(500).json({ success: false, message: "Database error checking order existence." });
        }
        if (!orderRows || orderRows.length === 0) {
            console.warn(`⚠️ [STEP 2 Fail] Order #${orderId} not found.`);
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        const order = orderRows[0];
        // Ensure order is eligible for review (only DELIVERED)
        if ((order.status || "").toUpperCase() !== 'DELIVERED') {
            console.warn(`⚠️ [STEP 2 Fail] Order #${orderId} is not delivered. Status: ${order.status}`);
            return res.status(400).json({ success: false, message: "Only delivered orders can be reviewed." });
        }
        // STEP 3: User Ownership
        const dbUserId = order.user_id !== undefined ? order.user_id : order["user id"];
        if (Number(dbUserId) !== Number(userId)) {
            console.warn(`⚠️ [STEP 3 Fail] User #${userId} attempted to review order #${orderId} owned by #${dbUserId}.`);
            return res.status(403).json({ success: false, message: "Unauthorized order access" });
        }
        // STEP 4: Purchased Product Verification
        const checkProductSql = `SELECT product_id FROM order_items WHERE order_id = ?`;
        db_1.default.query(checkProductSql, [orderId], (err, itemRows) => {
            if (err) {
                console.error("❌ [STEP 4 Error] Order items query error:", err);
                return res.status(500).json({ success: false, message: "Database error verifying purchased product." });
            }
            if (!itemRows || itemRows.length === 0) {
                console.warn(`⚠️ [STEP 4 Fail] No items found in order_items for order #${orderId}.`);
                return res.status(400).json({ success: false, message: "You can only review purchased products." });
            }
            // Check if provided productId is in the order items, else fallback to first item's product_id
            const matchedItem = itemRows.find((r) => Number(r.product_id) === Number(productId));
            const targetProductId = matchedItem ? Number(matchedItem.product_id) : (Number(itemRows[0].product_id) || Number(productId));
            // STEP 5: Duplicate Review Prevention
            const checkDupSql = `SELECT id FROM reviews WHERE order_id = ? AND product_id = ? AND user_id = ?`;
            db_1.default.query(checkDupSql, [orderId, targetProductId, userId], (err, dupRows) => {
                if (err) {
                    console.error("❌ [STEP 5 Error] Duplicate check query error:", err);
                    return res.status(500).json({ success: false, message: "Database error checking duplicate reviews." });
                }
                if (dupRows && dupRows.length > 0) {
                    console.warn(`⚠️ [STEP 5 Fail] Duplicate review detected for product #${targetProductId} on order #${orderId}.`);
                    return res.status(400).json({ success: false, message: "You have already reviewed this product." });
                }
                // STEP 6: Insert Review
                const insertSql = `
          INSERT INTO reviews (product_id, order_id, user_id, rating, comment, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `;
                db_1.default.query(insertSql, [targetProductId, orderId, userId, rating, comment], (err, result) => {
                    if (err) {
                        console.error("❌ [STEP 6 Error] Review insertion failed:", err);
                        return res.status(500).json({ success: false, message: "Failed to insert review into database." });
                    }
                    console.log(`✅ [STEP 6 Success] Review #${result.insertId} inserted for product #${targetProductId}.`);
                    // STEP 7: Recalculate & Return Updated Product Aggregates
                    const aggregateSql = `
            SELECT 
              COALESCE(ROUND(AVG(rating), 1), 0) AS averageRating, 
              COUNT(*) AS totalReviews 
            FROM reviews 
            WHERE product_id = ?
          `;
                    db_1.default.query(aggregateSql, [targetProductId], (err, aggRows) => {
                        const agg = aggRows && aggRows.length > 0 ? aggRows[0] : { averageRating: rating, totalReviews: 1 };
                        const averageRating = Number(agg.averageRating) || rating;
                        const totalReviews = Number(agg.totalReviews) || 1;
                        console.log(`✅ [STEP 7 Success] Aggregates for product #${productId}: avg=${averageRating}, count=${totalReviews}`);
                        return res.status(201).json({
                            success: true,
                            message: "Review added successfully",
                            averageRating,
                            totalReviews,
                            reviewCount: totalReviews,
                            reviewId: result.insertId,
                        });
                    });
                });
            });
        });
    });
};
exports.addReview = addReview;
/* ======================================================
   ⭐ GET PRODUCT RATING & REVIEWS SUMMARY
   GET /api/products/:id/reviews
   Response: { "averageRating": 4.8, "totalReviews": 126 }
====================================================== */
const getProductReviews = (req, res) => {
    const productId = req.params.id;
    const sql = `
    SELECT 
      COALESCE(ROUND(AVG(rating), 1), 0) AS averageRating, 
      COUNT(*) AS totalReviews 
    FROM reviews 
    WHERE product_id = ?
  `;
    db_1.default.query(sql, [productId], (err, rows) => {
        if (err) {
            console.error("❌ getProductReviews DB error:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch review summary" });
        }
        const row = rows && rows.length > 0 ? rows[0] : { averageRating: 0, totalReviews: 0 };
        return res.json({
            averageRating: Number(row.averageRating) || 0,
            totalReviews: Number(row.totalReviews) || 0,
        });
    });
};
exports.getProductReviews = getProductReviews;
/* ======================================================
   📜 GET ALL REVIEWS
   GET /api/reviews
====================================================== */
const getReviews = (req, res) => {
    const sql = `
    SELECT r.id, r.order_id, r.product_id, r.user_id, r.rating, r.comment, r.created_at, u.username, u.profile_image 
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
  `;
    db_1.default.query(sql, (err, rows) => {
        if (err)
            return res.status(500).json({ success: false, message: "Fetch failed" });
        res.json({ success: true, data: rows });
    });
};
exports.getReviews = getReviews;
exports.default = { addReview: exports.addReview, getProductReviews: exports.getProductReviews, getReviews: exports.getReviews };
