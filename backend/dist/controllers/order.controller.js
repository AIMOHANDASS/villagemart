"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getAllOrders = exports.createOrder = void 0;
const order_model_1 = __importDefault(require("../models/order.model"));
// place order
const createOrder = async (req, res) => {
    try {
        const { userId, username, items, subtotal, deliveryFee, total, address } = req.body;
        const order = new order_model_1.default({ userId, username, items, subtotal, deliveryFee, total, address });
        await order.save();
        res.status(201).json({ message: 'Order placed', order });
    }
    catch (err) {
        res.status(500).json({ message: 'Order failed', error: err });
    }
};
exports.createOrder = createOrder;
// admin: get all orders
const getAllOrders = async (req, res) => {
    const orders = await order_model_1.default.find().sort({ createdAt: -1 });
    res.json(orders);
};
exports.getAllOrders = getAllOrders;
// admin update status
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const order = await order_model_1.default.findByIdAndUpdate(id, { status }, { new: true });
        res.json(order);
    }
    catch (err) {
        res.status(500).json({ message: 'Update failed', error: err });
    }
};
exports.updateOrderStatus = updateOrderStatus;
