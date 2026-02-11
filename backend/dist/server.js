"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const emailOtp_routes_1 = __importDefault(require("./routes/emailOtp.routes"));
const forgotPassword_routes_1 = __importDefault(require("./routes/forgotPassword.routes"));
const googleAuth_routes_1 = __importDefault(require("./routes/googleAuth.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const transport_routes_1 = __importDefault(require("./routes/transport.routes"));
const partyHall_routes_1 = __importDefault(require("./routes/partyHall.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/users", user_routes_1.default);
app.use("/api/orders", order_routes_1.default); // ✅ THIS IS REQUIRED
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/email", emailOtp_routes_1.default);
app.use("/api/auth", forgotPassword_routes_1.default);
app.use("/api/auth", googleAuth_routes_1.default);
app.use("/api/profile", profile_routes_1.default);
app.use("/api/transport", transport_routes_1.default);
app.use("/api/party-hall", partyHall_routes_1.default);
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
