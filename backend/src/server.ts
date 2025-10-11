// server.ts
import path from "path";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";

// ✅ Import Routes
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import adminRoutes from "./routes/admin.routes";
import userRoutes from "./routes/user.routes"; // Added users route

// ✅ Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ API Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes); // Added users route

// ✅ Check for MONGO_URI
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI missing in .env file");
  process.exit(1);
}

const MONGO_URI: string = process.env.MONGO_URI;
const PORT: number | string = process.env.PORT || 5000;

// ✅ Connect to MongoDB and start server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });
