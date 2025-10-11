// backend/src/models/product.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  isOrganic: boolean;
}

const productSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  category: { type: String },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },
  isOrganic: { type: Boolean, default: false },
});

export default mongoose.model<IProduct>("Product", productSchema);
