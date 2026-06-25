import { Router } from "express";
import { addReview, getReviews } from "../controllers/review.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

router.post("/add", verifyToken, addReview);
router.get("/", getReviews);

export default router;
