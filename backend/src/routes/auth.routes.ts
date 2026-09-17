// src/routes/auth.routes.ts
import express from "express";
import { login, registerPartner, getMe, phoneAuth, googleLogin, phoneLogin, updateProfile, passwordLogin, completeProfileFields } from "../controllers/auth.controller";
import { verifyToken, isAdmin } from "../middleware/auth.middleware";

const router = express.Router();

// 🔐 Public: Unified login for all roles
router.post("/login", login);
router.post("/password-login", passwordLogin);

// 🔐 Public: Mobile phone number OTP login (Firebase)
router.post("/phone", phoneAuth);

// 🔐 Public: Google & Phone Login exchanges (Multi-mode pipeline)
router.post("/google-login", googleLogin);
router.post("/phone-login", phoneLogin);

// ✏️ Private: Dynamic profile update completion
router.put("/update-profile", verifyToken, updateProfile);
router.put("/complete-profile-fields", verifyToken, completeProfileFields);

// 🔐 Admin only: Register delivery/transport partner
router.post("/register-partner", verifyToken, isAdmin, registerPartner);

// 👤 Protected: Get current user info from JWT
router.get("/me", verifyToken, getMe);

export default router;
