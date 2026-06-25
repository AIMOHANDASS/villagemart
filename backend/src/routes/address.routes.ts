import express from "express";
import { getUserAddresses, editUserAddress, selectActiveNavbarAddress, addUserAddress } from "../controllers/address.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

router.get("/list", getUserAddresses);
router.post("/add", addUserAddress);
router.put("/edit/:id", editUserAddress);
router.post("/select-active", selectActiveNavbarAddress);

export default router;
