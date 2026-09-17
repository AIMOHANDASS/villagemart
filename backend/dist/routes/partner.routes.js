"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const partner_controller_1 = require("../controllers/partner.controller");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = express_1.default.Router();
// Route: POST /api/partners/upload-documents
router.post("/upload-documents", upload_middleware_1.upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "dl", maxCount: 1 },
    { name: "rc", maxCount: 1 },
]), partner_controller_1.uploadPartnerDocuments);
exports.default = router;
