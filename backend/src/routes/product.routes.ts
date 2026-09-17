import express from "express";
import {
  getAllProducts,
  getInventoryProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  searchProducts,
  getProductDetailsWithRecommendations,
  getCategoryCounts,
} from "../controllers/product.controller";
import { getProductReviews } from "../controllers/review.controller";
import { verifyToken, isAdmin } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

// ──────────────────────────────────────────────────────
// 📖 PUBLIC READ ROUTES (Consumer storefront access)
// ──────────────────────────────────────────────────────
router.get("/", getAllProducts);

// 🔍 Live Autocomplete Search — Must be before /:id to avoid param conflict
router.get("/search", searchProducts);

// 🎯 Details with Recommendations
router.get("/details/:id", getProductDetailsWithRecommendations);

// 🎯 Admin Inventory — Direct MySQL, zero CSV fallback
router.get("/inventory", verifyToken, getInventoryProducts);

// Rating & Reviews aggregated endpoint
router.get("/:id/reviews", getProductReviews);

// Image uploading route
router.post("/upload-image", verifyToken, upload.any(), uploadImage);

// Get category counts
router.get("/categories/counts", getCategoryCounts);

router.get("/:id", getProductById);

// ──────────────────────────────────────────────────────
// 🔐 PROTECTED WRITE ROUTES (Admin only)
// ──────────────────────────────────────────────────────
router.post("/add", verifyToken, upload.array("images", 6), createProduct);
router.put("/:id", verifyToken, upload.array("images", 6), updateProduct);
router.delete("/:id", verifyToken, deleteProduct);

export default router;
