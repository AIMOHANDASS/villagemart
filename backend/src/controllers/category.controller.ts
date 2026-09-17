import { Request, Response } from "express";
import db from "../db";

export interface Category {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    image_url: string | null;
    sort_order: number;
    is_visible: boolean;
    created_at?: string;
    updated_at?: string;
}

// Helper to safely slugify category names
const generateSlug = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
};

// GET /api/categories
export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const isAdmin = req.query.admin === 'true';
        let sql = "SELECT * FROM categories";
        
        // If not admin, only return visible categories
        if (!isAdmin) {
            sql += " WHERE is_visible = TRUE";
        }
        
        sql += " ORDER BY sort_order ASC, id ASC";

        db.query(sql, (err: any, rows: any[]) => {
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
    } catch (error) {
        console.error("❌ Catch error in getAllCategories:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// POST /api/categories
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, description, icon, image_url, sort_order, is_visible } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: "Category name is required" });
        }

        const slug = generateSlug(name);
        
        // Check for duplicate slug
        db.query("SELECT id FROM categories WHERE slug = ?", [slug], (checkErr: any, checkRows: any[]) => {
            if (checkErr) return res.status(500).json({ success: false, message: "Database error" });
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
            
            db.query(sql, params, (err: any, result: any) => {
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
    } catch (error) {
        console.error("❌ Catch error in createCategory:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// PUT /api/categories/:id
export const updateCategory = async (req: Request, res: Response) => {
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
        
        db.query(sql, params, (err: any, result: any) => {
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
    } catch (error) {
        console.error("❌ Catch error in updateCategory:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// DELETE /api/categories/:id
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // First check if any products are using this category
        db.query("SELECT COUNT(*) as count FROM products WHERE category_id = ?", [id], (countErr: any, rows: any[]) => {
            if (countErr) return res.status(500).json({ success: false, message: "Database error checking products" });
            
            if (rows && rows[0].count > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Cannot delete category: ${rows[0].count} products are assigned to it.` 
                });
            }
            
            db.query("DELETE FROM categories WHERE id = ?", [id], (err: any, result: any) => {
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
    } catch (error) {
        console.error("❌ Catch error in deleteCategory:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// PATCH /api/categories/reorder
export const reorderCategories = async (req: Request, res: Response) => {
    try {
        const { items } = req.body; // Expects [{id: 1, sort_order: 1}, {id: 2, sort_order: 2}]
        
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid items array" });
        }
        
        // Use a transaction or multiple queries. For simplicity, we'll do sequential promises or a single CASE statement query.
        let queriesCompleted = 0;
        let hasError = false;
        
        for (const item of items) {
            if (hasError) break;
            
            db.query("UPDATE categories SET sort_order = ? WHERE id = ?", [item.sort_order, item.id], (err) => {
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
    } catch (error) {
        console.error("❌ Catch error in reorderCategories:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// PATCH /api/categories/:id/visibility
export const toggleCategoryVisibility = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { is_visible } = req.body;
        
        if (is_visible === undefined) {
             return res.status(400).json({ success: false, message: "is_visible is required" });
        }
        
        db.query("UPDATE categories SET is_visible = ? WHERE id = ?", [is_visible, id], (err: any, result: any) => {
            if (err) {
                console.error("❌ Error toggling visibility:", err);
                return res.status(500).json({ success: false, message: "Failed to update category visibility" });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Category not found" });
            }
            
            res.json({ success: true, message: "Category visibility updated" });
        });
    } catch (error) {
        console.error("❌ Catch error in toggleCategoryVisibility:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
