"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleCategoryVisibility = exports.reorderCategories = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getAllCategories = void 0;
const db_1 = __importDefault(require("../db"));
// Helper to safely slugify category names
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
};
// GET /api/categories
const getAllCategories = async (req, res) => {
    try {
        const isAdmin = req.query.admin === 'true';
        let sql = "SELECT * FROM categories";
        // If not admin, only return visible categories
        if (!isAdmin) {
            sql += " WHERE is_visible = TRUE";
        }
        sql += " ORDER BY sort_order ASC, id ASC";
        db_1.default.query(sql, (err, rows) => {
            if (err) {
                console.error("❌ Failed to fetch categories:", err);
                return res.status(500).json({ success: false, message: "Database error fetching categories" });
            }
            // Convert tinyint to boolean for client ease
            const categories = rows.map(row => ({
                ...row,
                is_visible: Boolean(row.is_visible)
            }));
            res.json({ success: true, categories });
        });
    }
    catch (error) {
        console.error("❌ Catch error in getAllCategories:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getAllCategories = getAllCategories;
// POST /api/categories
const createCategory = async (req, res) => {
    try {
        const { name, description, icon, image_url, sort_order, is_visible } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Category name is required" });
        }
        const slug = generateSlug(name);
        // Check for duplicate slug
        db_1.default.query("SELECT id FROM categories WHERE slug = ?", [slug], (checkErr, checkRows) => {
            if (checkErr)
                return res.status(500).json({ success: false, message: "Database error" });
            if (checkRows && checkRows.length > 0) {
                return res.status(400).json({ success: false, message: "A category with a similar name already exists" });
            }
            const sql = `
                INSERT INTO categories (name, slug, description, icon, image_url, sort_order, is_visible)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                name,
                slug,
                description || null,
                icon || null,
                image_url || null,
                sort_order || 0,
                is_visible !== undefined ? is_visible : true
            ];
            db_1.default.query(sql, params, (err, result) => {
                if (err) {
                    console.error("❌ Error creating category:", err);
                    return res.status(500).json({ success: false, message: "Failed to create category" });
                }
                res.status(201).json({
                    success: true,
                    message: "Category created successfully",
                    category: { id: result.insertId, name, slug, description, icon, image_url, sort_order, is_visible }
                });
            });
        });
    }
    catch (error) {
        console.error("❌ Catch error in createCategory:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.createCategory = createCategory;
// PUT /api/categories/:id
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, image_url, sort_order, is_visible } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Category name is required" });
        }
        const slug = generateSlug(name);
        const sql = `
            UPDATE categories 
            SET name = ?, slug = ?, description = ?, icon = ?, image_url = ?, sort_order = ?, is_visible = ?
            WHERE id = ?
        `;
        const params = [
            name,
            slug,
            description || null,
            icon || null,
            image_url || null,
            sort_order || 0,
            is_visible !== undefined ? is_visible : true,
            id
        ];
        db_1.default.query(sql, params, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ success: false, message: "A category with a similar name already exists" });
                }
                console.error("❌ Error updating category:", err);
                return res.status(500).json({ success: false, message: "Failed to update category" });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Category not found" });
            }
            res.json({ success: true, message: "Category updated successfully" });
        });
    }
    catch (error) {
        console.error("❌ Catch error in updateCategory:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.updateCategory = updateCategory;
// DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        // First check if any products are using this category
        db_1.default.query("SELECT COUNT(*) as count FROM products WHERE category_id = ?", [id], (countErr, rows) => {
            if (countErr)
                return res.status(500).json({ success: false, message: "Database error checking products" });
            if (rows && rows[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete category: ${rows[0].count} products are assigned to it.`
                });
            }
            db_1.default.query("DELETE FROM categories WHERE id = ?", [id], (err, result) => {
                if (err) {
                    console.error("❌ Error deleting category:", err);
                    return res.status(500).json({ success: false, message: "Failed to delete category" });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: "Category not found" });
                }
                res.json({ success: true, message: "Category deleted successfully" });
            });
        });
    }
    catch (error) {
        console.error("❌ Catch error in deleteCategory:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.deleteCategory = deleteCategory;
// PATCH /api/categories/reorder
const reorderCategories = async (req, res) => {
    try {
        const { items } = req.body; // Expects [{id: 1, sort_order: 1}, {id: 2, sort_order: 2}]
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid items array" });
        }
        // Use a transaction or multiple queries. For simplicity, we'll do sequential promises or a single CASE statement query.
        let queriesCompleted = 0;
        let hasError = false;
        for (const item of items) {
            if (hasError)
                break;
            db_1.default.query("UPDATE categories SET sort_order = ? WHERE id = ?", [item.sort_order, item.id], (err) => {
                queriesCompleted++;
                if (err) {
                    hasError = true;
                    console.error("❌ Error updating sort_order:", err);
                }
                if (queriesCompleted === items.length) {
                    if (hasError) {
                        return res.status(500).json({ success: false, message: "Failed to update some items" });
                    }
                    res.json({ success: true, message: "Categories reordered successfully" });
                }
            });
        }
    }
    catch (error) {
        console.error("❌ Catch error in reorderCategories:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.reorderCategories = reorderCategories;
// PATCH /api/categories/:id/visibility
const toggleCategoryVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_visible } = req.body;
        if (is_visible === undefined) {
            return res.status(400).json({ success: false, message: "is_visible is required" });
        }
        db_1.default.query("UPDATE categories SET is_visible = ? WHERE id = ?", [is_visible, id], (err, result) => {
            if (err) {
                console.error("❌ Error toggling visibility:", err);
                return res.status(500).json({ success: false, message: "Failed to update category visibility" });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Category not found" });
            }
            res.json({ success: true, message: "Category visibility updated" });
        });
    }
    catch (error) {
        console.error("❌ Catch error in toggleCategoryVisibility:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.toggleCategoryVisibility = toggleCategoryVisibility;
