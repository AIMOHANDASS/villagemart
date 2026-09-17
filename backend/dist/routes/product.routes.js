"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const product_controller_1 = require("../controllers/product.controller");
const review_controller_1 = require("../controllers/review.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = express_1.default.Router();
// ──────────────────────────────────────────────────────
// 📖 PUBLIC READ ROUTES (Consumer storefront access)
// ──────────────────────────────────────────────────────
router.get("/", product_controller_1.getAllProducts);
// 🔍 Live Autocomplete Search — Must be before /:id to avoid param conflict
router.get("/search", product_controller_1.searchProducts);
// 🎯 Details with Recommendations
router.get("/details/:id", product_controller_1.getProductDetailsWithRecommendations);
// 🎯 Admin Inventory — Direct MySQL, zero CSV fallback
router.get("/inventory", auth_middleware_1.verifyToken, product_controller_1.getInventoryProducts);
// Rating & Reviews aggregated endpoint
router.get("/:id/reviews", review_controller_1.getProductReviews);
// Image uploading route
router.post("/upload-image", auth_middleware_1.verifyToken, upload_middleware_1.upload.any(), product_controller_1.uploadImage);
// Get category counts
router.get("/categories/counts", product_controller_1.getCategoryCounts);
router.get("/:id", product_controller_1.getProductById);
// ──────────────────────────────────────────────────────
// 🔐 PROTECTED WRITE ROUTES (Admin only)
// ──────────────────────────────────────────────────────
router.post("/add", auth_middleware_1.verifyToken, upload_middleware_1.upload.array("images", 6), product_controller_1.createProduct);
router.put("/:id", auth_middleware_1.verifyToken, upload_middleware_1.upload.array("images", 6), product_controller_1.updateProduct);
router.delete("/:id", auth_middleware_1.verifyToken, product_controller_1.deleteProduct);
exports.default = router;
