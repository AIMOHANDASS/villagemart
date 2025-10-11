import { Request, Response } from 'express';
import Product from '../models/product.model';

export const getAllProducts = async (req: Request, res: Response) => {
  const products = await Product.find();
  res.json(products);
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const p = new Product(req.body);
    await p.save();
    res.status(201).json(p);
  } catch (err) {
    res.status(500).json({ message: 'Create failed', error: err });
  }
};
