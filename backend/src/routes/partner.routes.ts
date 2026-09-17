import express from "express";
import { uploadPartnerDocuments } from "../controllers/partner.controller";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

// Route: POST /api/partners/upload-documents
router.post(
  "/upload-documents",
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "dl", maxCount: 1 },
    { name: "rc", maxCount: 1 },
  ]),
  uploadPartnerDocuments
);

export default router;
