"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const emailOtpController_1 = require("../controllers/emailOtpController");
const router = express_1.default.Router();
router.post("/send", emailOtpController_1.sendEmailOtp);
router.post("/verify", emailOtpController_1.verifyEmailOtp);
exports.default = router;
