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
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("./db"));
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
// API Role Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const delivery_routes_1 = __importDefault(require("./routes/delivery.routes"));
const transportDriver_routes_1 = __importDefault(require("./routes/transportDriver.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
// Initialize Tables
require("./controllers/location.controller");
require("./db-upgrade");
require("./cron/commissionGuard");
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)({
    origin: true, // true reflects the requesting origin, allowing credentials
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
}));
app.use(express_1.default.json());
// ✅ Serve uploaded partner documents (images, PDFs, etc.)
app.use("/api/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
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
    res.send("VillageMart API Running 🚀");
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
app.use("/api/profile", profile_routes_1.default);
app.use("/api/transport", transport_routes_1.default);
app.use("/api/transport", transportDriver_routes_1.default);
app.use("/api/party-hall", partyHall_routes_1.default);
app.use("/api/reviews", review_routes_1.default);
app.use("/api/delivery", delivery_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/products", product_routes_1.default);
app.use("/api/location", location_routes_1.default);
app.use("/api/payment", payment_routes_1.default);
app.use("/api/settings", settings_routes_1.default);
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
exports.io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);
    socket.on("join", (userId) => {
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
