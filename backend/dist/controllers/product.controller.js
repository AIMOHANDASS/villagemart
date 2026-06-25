"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getInventoryProducts = exports.getAllProducts = void 0;
const db_1 = __importDefault(require("../db"));
/* ======================================================
   📦 PRODUCT CONTROLLER — MySQL CRUD Engine
   All catalog queries are driven exclusively from the
   database connection pool. No CSV/file-based fallbacks.
====================================================== */
/* ──────────────────────────────────────────────────────
   A. GET ALL PRODUCTS (Consumer Storefront)
   GET /api/products
────────────────────────────────────────────────────── */
const getAllProducts = (req, res) => {
    const sql = "SELECT * FROM `products` ORDER BY `id` DESC";
    db_1.default.query(sql, (err, rows) => {
        if (err) {
            console.error("❌ getAllProducts DB error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch products from database",
            });
        }
        return res.json({
            success: true,
            data: rows || [],
            count: (rows || []).length,
        });
    });
};
exports.getAllProducts = getAllProducts;
/* ──────────────────────────────────────────────────────
   A2. GET INVENTORY PRODUCTS (Admin Dashboard)
   GET /api/products/inventory
   🎯 Enforce zero CSV file fallback. Direct MySQL streaming only.
────────────────────────────────────────────────────── */
const getInventoryProducts = (req, res) => {
    const querySql = "SELECT * FROM `products` ORDER BY `id` DESC";
    db_1.default.query(querySql, (err, results) => {
        if (err) {
            console.error("❌ Database catalog fetch failure:", err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
        return res.status(200).json(results);
    });
};
exports.getInventoryProducts = getInventoryProducts;
/* ──────────────────────────────────────────────────────
   B. GET SINGLE PRODUCT BY ID
   GET /api/products/:id
────────────────────────────────────────────────────── */
const getProductById = (req, res) => {
    const productId = Number(req.params.id);
    if (!productId || isNaN(productId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID",
        });
    }
    const sql = `
    SELECT
      \`id\`,
      \`E_name\`,
      \`T_name\`,
      \`MRP\`,
      \`s_price\`,
      \`GST\`,
      \`imageurl\`,
      \`category\`,
      \`product_type\`,
      \`inStock\`,
      \`outStock\`,
      \`isOrganic\`
    FROM \`products\`
    WHERE \`id\` = ?
    LIMIT 1
  `;
    db_1.default.query(sql, [productId], (err, rows) => {
        if (err) {
            console.error("❌ getProductById DB error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error fetching product",
            });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.json({
            success: true,
            data: rows[0],
        });
    });
};
exports.getProductById = getProductById;
/* ──────────────────────────────────────────────────────
   C. CREATE PRODUCT
   POST /api/products/add
────────────────────────────────────────────────────── */
const createProduct = (req, res) => {
    const { E_name, T_name, MRP, s_price, GST, imageurl, category, product_type, inStock, isOrganic, } = req.body;
    // ✅ Validate required fields
    if (!E_name || !category || !product_type) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields: E_name, category, product_type",
        });
    }
    const insertSql = `
    INSERT INTO \`products\`
    (\`E_name\`, \`T_name\`, \`MRP\`, \`s_price\`, \`GST\`, \`imageurl\`, \`category\`, \`product_type\`, \`inStock\`, \`outStock\`, \`isOrganic\`)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `;
    const params = [
        String(E_name),
        String(T_name || ""),
        Number(MRP) || 0,
        Number(s_price) || 0,
        Number(GST) || 0,
        String(imageurl || ""),
        String(category),
        String(product_type),
        Number(inStock) || 0,
        isOrganic ? 1 : 0,
    ];
    db_1.default.query(insertSql, params, (err, result) => {
        if (err) {
            console.error("❌ createProduct DB error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to insert product into database",
                error: err.sqlMessage || err.message,
            });
        }
        console.log(`✅ Product created successfully! ID: ${result.insertId}`);
        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            productId: result.insertId,
        });
    });
};
exports.createProduct = createProduct;
/* ──────────────────────────────────────────────────────
   D. UPDATE PRODUCT (Partial / Inline Edit)
   PUT /api/products/:id
────────────────────────────────────────────────────── */
// Whitelist of columns that are safe to update via the API
const UPDATABLE_COLUMNS = new Set([
    "E_name",
    "T_name",
    "MRP",
    "s_price",
    "GST",
    "imageurl",
    "category",
    "product_type",
    "inStock",
    "outStock",
    "isOrganic",
]);
const updateProduct = (req, res) => {
    const productId = Number(req.params.id);
    if (!productId || isNaN(productId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID",
        });
    }
    const body = req.body;
    // Build dynamic SET clause from only whitelisted fields present in the body
    const setClauses = [];
    const values = [];
    for (const key of Object.keys(body)) {
        if (UPDATABLE_COLUMNS.has(key)) {
            setClauses.push(`\`${key}\` = ?`);
            // Type coerce based on column
            if (["MRP", "s_price", "GST", "inStock", "outStock"].includes(key)) {
                values.push(Number(body[key]) || 0);
            }
            else if (key === "isOrganic") {
                values.push(body[key] ? 1 : 0);
            }
            else {
                values.push(String(body[key]));
            }
        }
    }
    if (setClauses.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No valid fields provided for update",
        });
    }
    values.push(productId);
    const updateSql = `UPDATE \`products\` SET ${setClauses.join(", ")} WHERE \`id\` = ?`;
    db_1.default.query(updateSql, values, (err, result) => {
        if (err) {
            console.error("❌ updateProduct DB error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to update product",
                error: err.sqlMessage || err.message,
            });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        console.log(`✅ Product #${productId} updated: ${setClauses.join(", ")}`);
        return res.json({
            success: true,
            message: "Product updated successfully",
        });
    });
};
exports.updateProduct = updateProduct;
/* ──────────────────────────────────────────────────────
   E. DELETE PRODUCT
   DELETE /api/products/:id
────────────────────────────────────────────────────── */
const deleteProduct = (req, res) => {
    const productId = Number(req.params.id);
    if (!productId || isNaN(productId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID",
        });
    }
    const deleteSql = "DELETE FROM `products` WHERE `id` = ?";
    db_1.default.query(deleteSql, [productId], (err, result) => {
        if (err) {
            console.error("❌ deleteProduct DB error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to delete product",
                error: err.sqlMessage || err.message,
            });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        console.log(`🗑️ Product #${productId} deleted successfully`);
        return res.json({
            success: true,
            message: "Product deleted successfully",
        });
    });
};
exports.deleteProduct = deleteProduct;
