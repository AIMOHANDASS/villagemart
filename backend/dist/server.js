"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ override: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("./db"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const rateLimiter_1 = require("./middleware/rateLimiter");
// Routes
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const emailOtp_routes_1 = __importDefault(require("./routes/emailOtp.routes"));
const forgotPassword_routes_1 = __importDefault(require("./routes/forgotPassword.routes"));
const googleAuth_routes_1 = __importDefault(require("./routes/googleAuth.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const transport_routes_1 = __importDefault(require("./routes/transport.routes"));
const partyHall_routes_1 = __importDefault(require("./routes/partyHall.routes"));
const location_routes_1 = __importDefault(require("./routes/location.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const address_routes_1 = __importDefault(require("./routes/address.routes"));
const recovery_routes_1 = __importDefault(require("./routes/recovery.routes"));
// API Role Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const delivery_routes_1 = __importDefault(require("./routes/delivery.routes"));
const transportDriver_routes_1 = __importDefault(require("./routes/transportDriver.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const chatbot_routes_1 = __importDefault(require("./routes/chatbot.routes"));
const partner_routes_1 = __importDefault(require("./routes/partner.routes"));
const wishlist_routes_1 = __importDefault(require("./routes/wishlist.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
// Initialize Tables
require("./controllers/location.controller");
require("./db-upgrade");
require("./cron/commissionGuard");
const app = (0, express_1.default)();
// Required when running behind Google Cloud Run / Load Balancer
app.set('trust proxy', 1);
const httpServer = (0, http_1.createServer)(app);
// ============================
// Socket.IO Setup
// ============================
exports.io = new socket_io_1.Server(httpServer, {
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".villagesmart.in") || origin.endsWith(".villagesmart.in") || origin.endsWith(".web.app")) {
            callback(null, true);
        }
        else {
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
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json());
// Apply basic security headers but disable CSP/COOP to avoid breaking Razorpay/Firebase popups
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
}));
// Apply global rate limiting
app.use(rateLimiter_1.globalLimiter);
// ✅ Expose and safely create local uploads directory on startup for stateless container environments (e.g. Google Cloud Run)
const uploadsDir = path_1.default.join(process.cwd(), "uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express_1.default.static(uploadsDir));
app.use("/api/uploads", express_1.default.static(uploadsDir));
// ============================
// Database Connection Test
// ============================
db_1.default.query("SELECT 1", (err, results) => {
    if (err) {
        console.error("❌ Database Connection Failed:", err);
    }
    else {
        console.log("✅ Database Connected Successfully");
    }
});
//======================
app.get("/api/db-test", (req, res) => {
    db_1.default.query("SELECT 1", (err, result) => {
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
app.use("/api/user", user_routes_1.default);
app.use("/api/orders", order_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/email", emailOtp_routes_1.default);
app.use("/api/addresses", address_routes_1.default);
app.use("/api/auth", forgotPassword_routes_1.default);
app.use("/api/auth", googleAuth_routes_1.default);
app.use("/api/auth", auth_routes_1.default);
app.use("/api/auth/recovery", recovery_routes_1.default);
app.use("/api/profile", profile_routes_1.default);
app.use("/api/transport", transportDriver_routes_1.default);
app.use("/api/transport", transport_routes_1.default);
app.use("/api/party-hall", partyHall_routes_1.default);
app.use("/api/reviews", review_routes_1.default);
app.use("/api/delivery", delivery_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/products", rateLimiter_1.productLimiter, product_routes_1.default);
app.use("/api/location", location_routes_1.default);
app.use("/api/payment", rateLimiter_1.orderLimiter, payment_routes_1.default);
app.use("/api/settings", settings_routes_1.default);
app.use("/api/chatbot", chatbot_routes_1.default);
app.use("/api/partners", partner_routes_1.default);
app.use("/api/wishlist", wishlist_routes_1.default);
app.use("/api/categories", category_routes_1.default);
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
exports.io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);
    socket.on("join", (payload) => {
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
