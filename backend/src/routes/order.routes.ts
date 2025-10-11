import express from "express";
import Order from "../models/order.model";

const router = express.Router();

// GET all orders (Admin only)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ADD new order (User checkout)
router.post("/", async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ error: "Failed to place order" });
  }
});

export default router;
