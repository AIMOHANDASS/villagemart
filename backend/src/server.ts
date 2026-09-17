import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

import db from "./db";
import helmet from "helmet";
import compression from "compression";
import { globalLimiter, orderLimiter, productLimiter } from "./middleware/rateLimiter";

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
import recoveryRoutes from "./routes/recovery.routes";

// API Role Routes
import authRoutes from "./routes/auth.routes";
import paymentRoutes from "./routes/payment.routes";
import deliveryRoutes from "./routes/delivery.routes";
import transportDriverRoutes from "./routes/transportDriver.routes";
import adminRoutes from "./routes/admin.routes";
import productRoutes from "./routes/product.routes";
import settingsRoutes from "./routes/settings.routes";
import chatbotRoutes from "./routes/chatbot.routes";
import partnerRoutes from "./routes/partner.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import categoryRoutes from "./routes/category.routes";

// Initialize Tables
import "./controllers/location.controller";
import "./db-upgrade";
import "./cron/commissionGuard";

const app = express();
// Required when running behind Google Cloud Run / Load Balancer
app.set('trust proxy', 1);
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

const allowedOrigins = [
  "https://villagesmart.in",
  "https://villagesmart.in",
  "https://payment.villagesmart.in",
  "https://payment-villagemart.web.app",
  "https://admin.villagesmart.in",
  "https://delivery.villagesmart.in",
  "https://transport.villagesmart.in",
  "http://localhost:5173",
  "http://localhost:8080",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".villagesmart.in") || origin.endsWith(".villagesmart.in") || origin.endsWith(".web.app")) {
        callback(null, true);
      } else {
        callback(null, true); // Allow during production rollout
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Cache-Control",
      "Pragma",
      "Expires"
    ],
    credentials: true,
  })
);

app.use(compression());
app.use(express.json());

// Apply basic security headers but disable CSP/COOP to avoid breaking Razorpay/Firebase popups
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
}));

// Apply global rate limiting
app.use(globalLimiter);

// ✅ Expose and safely create local uploads directory on startup for stateless container environments (e.g. Google Cloud Run)
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));
app.use("/api/uploads", express.static(uploadsDir));

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
  res.send("VillageSmart API Running 🚀");
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
app.use("/api/auth/recovery", recoveryRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/transport", transportDriverRoutes);
app.use("/api/transport", transportRoutes);

app.use("/api/party-hall", partyHallRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/delivery", deliveryRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/products", productLimiter, productRoutes);

app.use("/api/location", locationRoutes);
app.use("/api/payment", orderLimiter, paymentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/categories", categoryRoutes);

// ============================
// Health Check
// ============================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "VillageSmart Backend Running 🚀",
  });
});

// ============================
// Socket.IO Connection
// ============================

io.on("connection", (socket: Socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("join", (payload: any) => {
    // For backwards compatibility where join was just a string userId
    if (typeof payload === "string" || typeof payload === "number") {
      socket.join(`user_${payload}`);
      console.log(`👤 User ${payload} joined notification room`);
      return;
    }

    if (payload?.userId) {
      socket.join(`user_${payload.userId}`);
      socket.join(`customer_${payload.userId}`);
      console.log(`👤 User ${payload.userId} joined notification/customer room`);
    }
    
    if (payload?.role === "ADMIN") {
      socket.join("admin:orders");
      console.log(`🛡️ Admin joined orders room`);
    }

    if (payload?.role === "DELIVERY" && payload?.partnerId) {
      socket.join(`delivery_partner_${payload.partnerId}`);
      console.log(`🚚 Delivery Partner ${payload.partnerId} joined room`);
    }

    if (payload?.role === "TRANSPORT" && payload?.partnerId) {
      socket.join(`transport_partner_${payload.partnerId}`);
      console.log(`🚛 Transport Partner ${payload.partnerId} joined room`);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ============================
// Server Start
// ============================

const PORT = Number(process.env.PORT) || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running with Socket.IO on port ${PORT}`);
});