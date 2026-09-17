import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
  updateSettings,
  updatePasswordDirect,
} from "../controllers/profileController";
import { verifyToken } from "../middleware/auth.middleware";
import { deleteUserAccount } from "../controllers/deleteAccountController";

const router = express.Router();

router.get("/:id", getProfile);
router.put("/:id", updateProfile);
router.post("/change-password", changePassword);
router.post("/update-password-direct", verifyToken, updatePasswordDirect);
router.put("/settings/:id", updateSettings);

/* 🗑️ DELETE ACCOUNT — JWT-secured endpoint for permanent account removal */
router.delete("/delete-account", verifyToken, deleteUserAccount);

export default router;
