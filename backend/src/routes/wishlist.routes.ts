import { Router } from "express";
import {
  toggleWishlist,
  getUserWishlist,
  getWishlistCount,
} from "../controllers/wishlist.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// All wishlist mutation and query routes protected with JWT auth middleware
router.post("/toggle", verifyToken, toggleWishlist);
router.get("/count/:userId", verifyToken, getWishlistCount);
router.get("/:userId", verifyToken, getUserWishlist);

export default router;
