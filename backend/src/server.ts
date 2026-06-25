import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

import db from "./db";

// Routes
import userRoutes from "./routes/user.routes";
import orderRoutes from "./routes/order.routes";
import notificationRoutes from "./routes/notification.routes";
import emailOtpRoutes from "./routes/emailOtp.routes";
import forgotPasswordRoutes from "./routes/forgotPassword.routes";
import googleAuthRoutes from "./routes/googleAuth.routes";
import profileRoutes from "./routes/profile.routes";
import transportRoutes from "./routes/transport.routes";
import partyHallRoutes from "./routes/partyHall.routes";
import locationRoutes from "./routes/location.routes";
import reviewRoutes from "./routes/review.routes";
import addressRoutes from "./routes/address.routes";

// API Role Routes
import authRoutes from "./routes/auth.routes";
import paymentRoutes from "./routes/payment.routes";
import deliveryRoutes from "./routes/delivery.routes";
import transportDriverRoutes from "./routes/transportDriver.routes";
import adminRoutes from "./routes/admin.routes";
import productRoutes from "./routes/product.routes";
import settingsRoutes from "./routes/settings.routes";

// Initialize Tables
import "./controllers/location.controller";
import "./db-upgrade";
import "./cron/commissionGuard";

const app = express();
const httpServer = createServer(app);

// ============================
// Socket.IO Setup
// ============================

export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ============================
// Middleware
// ============================

app.use(
  cors({
    origin: true, // true reflects the requesting origin, allowing credentials
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

app.use(express.json());

// ✅ Serve uploaded partner documents (images, PDFs, etc.)
app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

// ============================
// Database Connection Test
// ============================

db.query("SELECT 1", (err, results) => {
  if (err) {
    console.error("❌ Database Connection Failed:", err);
  } else {
    console.log("✅ Database Connected Successfully");
  }
});

//======================


app.get("/api/db-test", (req, res) => {
  db.query("SELECT 1", (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }

    res.json({
      success: true,
      message: "Database connected",
      result,
    });
  });
});



// ============================
// Root Route
// ============================

app.get("/", (req, res) => {
  res.send("VillageMart API Running 🚀");
});

// ============================
// API Routes
// ============================

app.use("/api/user", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/email", emailOtpRoutes);
app.use("/api/addresses", addressRoutes);

app.use("/api/auth", forgotPasswordRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/transport", transportRoutes);
app.use("/api/transport", transportDriverRoutes);

app.use("/api/party-hall", partyHallRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/delivery", deliveryRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/products", productRoutes);

app.use("/api/location", locationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/settings", settingsRoutes);

// ============================
// Health Check
// ============================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "VillageMart Backend Running 🚀",
  });
});

// ============================
// Socket.IO Connection
// ============================

io.on("connection", (socket: Socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("join", (userId: string) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined notification room`);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected");
  });
});

// ============================
// Server Start
// ============================

const PORT = Number(process.env.PORT) || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running with Socket.IO on port ${PORT}`);
});