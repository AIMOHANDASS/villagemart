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
import userRoutes from "./routes/user.routes";

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
app.use("/api/users", userRoutes);

// ✅ Check for MONGO_URI
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI missing in .env file");
  process.exit(1);
}

const MONGO_URI: string = process.env.MONGO_URI;

// ✅ FIX 1: PORT must be a NUMBER (TypeScript fix)
const PORT: number = Number(process.env.PORT) || 5000;

// ✅ Connect to MongoDB and start server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");

    // ✅ FIX 2: Bind to 0.0.0.0 (Laptop acts as server)
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });
  
