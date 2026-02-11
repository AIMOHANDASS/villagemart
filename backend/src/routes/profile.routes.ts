import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
  updateSettings,
} from "../controllers/profileController";

const router = express.Router();

router.get("/:id", getProfile);
router.put("/:id", updateProfile);
router.post("/change-password", changePassword);
router.put("/settings/:id", updateSettings);


export default router;
