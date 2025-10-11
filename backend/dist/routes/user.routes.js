"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_Controller_1 = require("../controllers/user.Controller");
const router = express_1.default.Router();
// Auth routes
router.post("/signup", user_Controller_1.signupUser);
router.post("/login", user_Controller_1.loginUser);
exports.default = router;
