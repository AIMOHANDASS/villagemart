import { Request, Response } from 'express';
import Order from '../models/order.model';

// place order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { userId, username, items, subtotal, deliveryFee, total, address } = req.body;
    const order = new Order({ userId, username, items, subtotal, deliveryFee, total, address });
    await order.save();
    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    res.status(500).json({ message: 'Order failed', error: err });
  }
};

// admin: get all orders
export const getAllOrders = async (req: Request, res: Response) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
};

// admin update status
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err });
  }
};
