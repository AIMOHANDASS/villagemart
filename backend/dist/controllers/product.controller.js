"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProduct = exports.getAllProducts = void 0;
const product_model_1 = __importDefault(require("../models/product.model"));
const getAllProducts = async (req, res) => {
    const products = await product_model_1.default.find();
    res.json(products);
};
exports.getAllProducts = getAllProducts;
const createProduct = async (req, res) => {
    try {
        const p = new product_model_1.default(req.body);
        await p.save();
        res.status(201).json(p);
    }
    catch (err) {
        res.status(500).json({ message: 'Create failed', error: err });
    }
};
exports.createProduct = createProduct;
