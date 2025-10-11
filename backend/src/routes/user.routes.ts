import express from "express";
import { signupUser, loginUser } from "../controllers/user.Controller";

const router = express.Router();

// Auth routes
router.post("/signup", signupUser);
router.post("/login", loginUser);

export default router;
