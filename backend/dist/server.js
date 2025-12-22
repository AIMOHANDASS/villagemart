"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts
const path_1 = __importDefault(require("path"));
const dotenv = __importStar(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// ✅ Import Routes
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
// ✅ Load environment variables
dotenv.config({ path: path_1.default.resolve(__dirname, "../.env") });
const app = (0, express_1.default)();
// ✅ Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ✅ API Routes
app.use("/api/products", product_routes_1.default);
app.use("/api/orders", order_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/users", user_routes_1.default);
// ✅ Check for MONGO_URI
if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI missing in .env file");
    process.exit(1);
}
const MONGO_URI = process.env.MONGO_URI;
// ✅ FIX 1: PORT must be a NUMBER (TypeScript fix)
const PORT = Number(process.env.PORT) || 5000;
// ✅ Connect to MongoDB and start server
mongoose_1.default
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
