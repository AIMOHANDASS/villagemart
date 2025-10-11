import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);

export default app;
