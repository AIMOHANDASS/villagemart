// backend/src/routes/product.routes.ts
import express, { Request, Response } from "express";
import Product from "../models/product.model";

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    Get all products
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/**
 * @route   POST /api/products
 * @desc    Add a new product (Admin only)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { id, name, price, image, category, rating, reviews, inStock, isOrganic } = req.body;

    if (!id || !name || !price) {
      return res.status(400).json({ error: "Please provide required fields (id, name, price)" });
    }

    const newProduct = new Product({
      id,
      name,
      price: Number(price),
      image,
      category,
      rating: Number(rating) || 0,
      reviews: Number(reviews) || 0,
      inStock: Boolean(inStock),
      isOrganic: Boolean(isOrganic),
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully", product: newProduct });
  } catch (err) {
    res.status(400).json({ error: "Failed to add product" });
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product (by id or Mongo _id)
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    let deleted = await Product.findOneAndDelete({ id: req.params.id });

    // If not found by "id", try with MongoDB _id
    if (!deleted) {
      deleted = await Product.findByIdAndDelete(req.params.id);
    }

    if (!deleted) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
