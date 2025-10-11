"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const ADMIN_CREDENTIALS = {
    username: "Mohan",
    password: "mohan123",
};
router.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        return res.json({ success: true, message: "Admin login successful" });
    }
    res.status(401).json({ success: false, message: "Invalid credentials" });
});
exports.default = router;
