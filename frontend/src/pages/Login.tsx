import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../api";
import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Props = { onLogin: (u: any) => void };

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const [loginType, setLoginType] = useState<"customer" | "admin" | "partner_transport" | "partner_delivery">("customer");

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const appParam = queryParams.get("app");

    // Auto-lock dropdown configurations based on URL parameters 🎯
    if (appParam === "admin") setLoginType("admin");
    else if (appParam === "transport") setLoginType("partner_transport");
    else if (appParam === "delivery") setLoginType("partner_delivery");
    else setLoginType("customer");
  }, [location.search]);

  const onLoginSuccess = (responseData: any) => {
    const targetRole = String(responseData.user.role).toUpperCase();

    // ⚠️ INTENTIONAL SECURITY REGRESSION AS REQUESTED
    // We are deliberately reverting back to the single generic 'jwt_token' key
    // This will cause 403 Access Denied cross-contamination bugs when switching apps!
    localStorage.setItem("jwt_token", responseData.token);
    
    // Maintain old fallback keys just in case
    if (targetRole === "ADMIN") localStorage.setItem("admin_token", responseData.token);
    
    // Set user and role (Transport/Delivery subapps expect "role")
    localStorage.setItem("role", targetRole);
    localStorage.setItem("user", JSON.stringify(responseData.user));
    onLogin(responseData.user); // Maintaining the prop call for App state sync

    // Route directly to custom multi-app windows seamlessly via ?app=
    if (targetRole === "ADMIN") window.location.href = "/?app=admin";
    else if (targetRole === "TRANSPORT") window.location.href = "/?app=transport";
    else if (targetRole === "DELIVERY") window.location.href = "/?app=delivery";
    else window.location.href = "/";
  };

  /* ---------------- NORMAL LOGIN ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    /* ✅ Admin shortcut (UNCHANGED) */
    if (username === "Mohan" && password === "mohan123") {
      const admin = { username: "Mohan", role: "admin" };
      localStorage.setItem("user", JSON.stringify(admin));
      localStorage.setItem("admin_token", "admin-token"); // Set token for AdminRoute
      onLogin(admin);
      toast.success("Welcome Admin Mohan! 🔐");
      navigate("/admin/dashboard");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: username, password, loginType }),
      });

      const text = await res.text();
      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        setError("Server error. Try again later.");
        return;
      }

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }

      onLoginSuccess(data);
    } catch {
      setError("Network error");
    }
  };

  /* ---------------- GOOGLE LOGIN ---------------- */
  const handleGoogleLogin = async (token?: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError("Google login failed");
        return;
      }

      onLoginSuccess(data);
    } catch {
      setError("Google login error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full" />
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-card p-8 rounded-3xl shadow-2xl w-full max-w-sm
                   border border-gray-100 dark:border-gray-800"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      >
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-3xl">🌿</span>
          </div>
        </motion.div>

        <motion.h2
          className="text-2xl font-bold mb-1 text-center text-gray-800 dark:text-gray-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Welcome Back
        </motion.h2>
        <motion.p
          className="text-sm text-muted-foreground text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Sign in to your VillageMart account
        </motion.p>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-4 text-sm border border-red-200 dark:border-red-800"
          >
            {error}
          </motion.p>
        )}



        {/* USERNAME */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full p-3.5 mb-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800
                       focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 outline-none"
          />
        </motion.div>

        {/* PASSWORD WITH EYE */}
        <motion.div
          className="relative mb-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl pr-12 bg-gray-50 dark:bg-gray-800
                       focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3.5 text-lg hover:scale-110 transition-transform"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </motion.div>

        {/* FORGOT PASSWORD */}
        <motion.div
          className="text-right mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Forgot password?
          </button>
        </motion.div>

        {/* LOGIN BUTTON */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-500
                       text-white font-semibold p-3.5 rounded-xl
                       transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl ripple-container"
          >
            Sign In
          </button>
        </motion.div>

        {/* OR */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">or</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        </div>

        {/* GOOGLE LOGIN */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <GoogleLogin
            onSuccess={(res) => handleGoogleLogin(res.credential)}
            onError={() => setError("Google login cancelled")}
          />
        </motion.div>

        {/* SIGNUP LINK */}
        <motion.p
          className="text-center mt-6 text-gray-600 dark:text-gray-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            Sign up
          </button>
        </motion.p>
      </motion.form>
    </div>
  );
};

export default Login;
