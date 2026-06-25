import express from "express";
import {
  getAllProducts,
  getInventoryProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { verifyToken, isAdmin } from "../middleware/auth.middleware";

const router = express.Router();

// ──────────────────────────────────────────────────────
// 📖 PUBLIC READ ROUTES (Consumer storefront access)
// ──────────────────────────────────────────────────────
router.get("/", getAllProducts);

// 🎯 Admin Inventory — Direct MySQL, zero CSV fallback
router.get("/inventory", getInventoryProducts);

router.get("/:id", getProductById);

// ──────────────────────────────────────────────────────
// 🔐 PROTECTED WRITE ROUTES (Admin only)
// ──────────────────────────────────────────────────────
router.post("/add", verifyToken, createProduct);
router.put("/:id", verifyToken, updateProduct);
router.delete("/:id", verifyToken, deleteProduct);

export default router;
