"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.routes.ts
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// 🔐 Public: Unified login for all roles
router.post("/login", auth_controller_1.login);
router.post("/password-login", auth_controller_1.passwordLogin);
// 🔐 Public: Mobile phone number OTP login (Firebase)
router.post("/phone", auth_controller_1.phoneAuth);
// 🔐 Public: Google & Phone Login exchanges (Multi-mode pipeline)
router.post("/google-login", auth_controller_1.googleLogin);
router.post("/phone-login", auth_controller_1.phoneLogin);
// ✏️ Private: Dynamic profile update completion
router.put("/update-profile", auth_middleware_1.verifyToken, auth_controller_1.updateProfile);
router.put("/complete-profile-fields", auth_middleware_1.verifyToken, auth_controller_1.completeProfileFields);
// 🔐 Admin only: Register delivery/transport partner
router.post("/register-partner", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, auth_controller_1.registerPartner);
// 👤 Protected: Get current user info from JWT
router.get("/me", auth_middleware_1.verifyToken, auth_controller_1.getMe);
exports.default = router;
