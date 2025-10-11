"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_model_1 = __importDefault(require("../models/order.model"));
const router = express_1.default.Router();
// GET all orders (Admin only)
router.get("/", async (req, res) => {
    try {
        const orders = await order_model_1.default.find();
        res.json(orders);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});
// ADD new order (User checkout)
router.post("/", async (req, res) => {
    try {
        const newOrder = new order_model_1.default(req.body);
        await newOrder.save();
        res.status(201).json(newOrder);
    }
    catch (err) {
        res.status(400).json({ error: "Failed to place order" });
    }
});
exports.default = router;
