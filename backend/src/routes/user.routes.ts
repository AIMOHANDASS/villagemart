import express from "express";
import { signupUser, loginUser, checkUsername } from "../controllers/user.Controller";

const router = express.Router();

router.post("/signup", signupUser);   // ✅ matches signup.tsx
router.post("/login", loginUser);
router.get("/check-username/:username", checkUsername);

export default router;
