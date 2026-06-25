"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// ──────────────────────────────────────────────────────
// 📖 PUBLIC READ ROUTES (Consumer storefront access)
// ──────────────────────────────────────────────────────
router.get("/", product_controller_1.getAllProducts);
// 🎯 Admin Inventory — Direct MySQL, zero CSV fallback
router.get("/inventory", product_controller_1.getInventoryProducts);
router.get("/:id", product_controller_1.getProductById);
// ──────────────────────────────────────────────────────
// 🔐 PROTECTED WRITE ROUTES (Admin only)
// ──────────────────────────────────────────────────────
router.post("/add", auth_middleware_1.verifyToken, product_controller_1.createProduct);
router.put("/:id", auth_middleware_1.verifyToken, product_controller_1.updateProduct);
router.delete("/:id", auth_middleware_1.verifyToken, product_controller_1.deleteProduct);
exports.default = router;
