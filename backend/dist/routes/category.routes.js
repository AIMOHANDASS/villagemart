"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const router = (0, express_1.Router)();
// GET all categories (public/admin)
router.get("/", category_controller_1.getAllCategories);
// POST create category
router.post("/", category_controller_1.createCategory);
// PATCH reorder categories
router.patch("/reorder", category_controller_1.reorderCategories);
// PATCH toggle visibility
router.patch("/:id/visibility", category_controller_1.toggleCategoryVisibility);
// PUT update category
router.put("/:id", category_controller_1.updateCategory);
// DELETE category
router.delete("/:id", category_controller_1.deleteCategory);
exports.default = router;
