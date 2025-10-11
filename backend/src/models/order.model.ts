import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  user: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  total: number;
  status: string; // pending, delivered, cancelled
}

const OrderSchema: Schema = new Schema(
  {
    user: { type: String, required: true },
    items: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    total: { type: Number, required: true },
    status: { type: String, default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>("Order", OrderSchema);
