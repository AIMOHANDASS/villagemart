import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  name: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", userSchema);
