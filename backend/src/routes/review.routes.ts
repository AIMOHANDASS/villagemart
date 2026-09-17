import { Router } from "express";
import { addReview, getReviews, getProductReviews } from "../controllers/review.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

router.post("/add", verifyToken, addReview);
router.get("/", getReviews);
router.get("/product/:id", getProductReviews);

export default router;
