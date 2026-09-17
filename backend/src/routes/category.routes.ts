import { Router } from "express";
import {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    toggleCategoryVisibility
} from "../controllers/category.controller";

const router = Router();

// GET all categories (public/admin)
router.get("/", getAllCategories);

// POST create category
router.post("/", createCategory);

// PATCH reorder categories
router.patch("/reorder", reorderCategories);

// PATCH toggle visibility
router.patch("/:id/visibility", toggleCategoryVisibility);

// PUT update category
router.put("/:id", updateCategory);

// DELETE category
router.delete("/:id", deleteCategory);

export default router;
