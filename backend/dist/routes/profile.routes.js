"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const profileController_1 = require("../controllers/profileController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const deleteAccountController_1 = require("../controllers/deleteAccountController");
const router = express_1.default.Router();
router.get("/:id", profileController_1.getProfile);
router.put("/:id", profileController_1.updateProfile);
router.post("/change-password", profileController_1.changePassword);
router.post("/update-password-direct", auth_middleware_1.verifyToken, profileController_1.updatePasswordDirect);
router.put("/settings/:id", profileController_1.updateSettings);
/* 🗑️ DELETE ACCOUNT — JWT-secured endpoint for permanent account removal */
router.delete("/delete-account", auth_middleware_1.verifyToken, deleteAccountController_1.deleteUserAccount);
exports.default = router;
