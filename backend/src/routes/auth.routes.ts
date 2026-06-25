// src/routes/auth.routes.ts
import express from "express";
import { login, registerPartner, getMe } from "../controllers/auth.controller";
import { verifyToken, isAdmin } from "../middleware/auth.middleware";

const router = express.Router();

// 🔐 Public: Unified login for all roles
router.post("/login", login);

// 🔐 Admin only: Register delivery/transport partner
router.post("/register-partner", verifyToken, isAdmin, registerPartner);

// 👤 Protected: Get current user info from JWT
router.get("/me", verifyToken, getMe);

export default router;
