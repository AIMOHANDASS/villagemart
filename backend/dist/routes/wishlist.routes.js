"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wishlist_controller_1 = require("../controllers/wishlist.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All wishlist mutation and query routes protected with JWT auth middleware
router.post("/toggle", auth_middleware_1.verifyToken, wishlist_controller_1.toggleWishlist);
router.get("/count/:userId", auth_middleware_1.verifyToken, wishlist_controller_1.getWishlistCount);
router.get("/:userId", auth_middleware_1.verifyToken, wishlist_controller_1.getUserWishlist);
exports.default = router;
