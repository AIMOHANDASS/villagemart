import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import orderRoutes from "./routes/order.routes";
import notificationRoutes from "./routes/notification.routes";
import emailOtpRoutes from "./routes/emailOtp.routes";
import forgotPasswordRoutes from "./routes/forgotPassword.routes";
import googleAuthRoutes from "./routes/googleAuth.routes";
import profileRoutes from "./routes/profile.routes";




const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);   // ✅ THIS IS REQUIRED
app.use("/api/notifications", notificationRoutes);
app.use("/api/email", emailOtpRoutes);
app.use("/api/auth", forgotPasswordRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/profile", profileRoutes);



app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
