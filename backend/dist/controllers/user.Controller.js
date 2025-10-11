"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.signupUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../models/user.model"));
const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
// ✅ Signup
const signupUser = async (req, res) => {
    try {
        const { name, username, email, phone, address, password } = req.body;
        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const existingUser = await user_model_1.default.findOne({
            $or: [{ email }, { username }],
        });
        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = new user_model_1.default({
            name,
            username,
            email,
            phone,
            address,
            password: hashedPassword,
        });
        await user.save();
        res.status(201).json({ message: "Signup successful", user });
    }
    catch (err) {
        console.error("❌ Signup error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
exports.signupUser = signupUser;
// ✅ Login
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Username & password required" });
        }
        const user = await user_model_1.default.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: "1d" });
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
            },
        });
    }
    catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
exports.loginUser = loginUser;
