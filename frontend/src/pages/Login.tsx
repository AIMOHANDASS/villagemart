import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { navigateToQueryPath } from "../App";
import { API_BASE_URL } from "../api";
import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Props = { onLogin: (u: any) => void };

/* ──────────────────────────────────────────────────────────
   🔍 PLATFORM DETECTION UTILITY
   Checks if we are running inside a Capacitor native shell
   ────────────────────────────────────────────────────────── */
const isNativePlatform = (): boolean => {
  try {
    return (
      typeof (window as any).Capacitor !== "undefined" &&
      (window as any).Capacitor.isNativePlatform?.() === true
    );
  } catch {
    return false;
  }
};

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
    if (targetRole === "ADMIN") navigateToQueryPath("admin", "");
    else if (targetRole === "TRANSPORT") navigateToQueryPath("transport", "");
    else if (targetRole === "DELIVERY") navigateToQueryPath("delivery", "");
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

  /* ──────────────────────────────────────────────────────────
     🔐 GOOGLE LOGIN — BACKEND TOKEN EXCHANGE
     Shared by both native and web paths
     ────────────────────────────────────────────────────────── */
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

  /* ──────────────────────────────────────────────────────────
     📱 NATIVE CAPACITOR GOOGLE SIGN-IN (ANDROID APK)
     Uses @capawesome/capacitor-google-sign-in when available.
     Falls back gracefully to web popup if the native plugin
     is missing, unlinked, or throws an initialization error.
     ────────────────────────────────────────────────────────── */
  const handleNativeGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true);
    setGoogleAuthError(null);

    try {
      // Dynamically import the Capacitor Google Sign-In plugin
      const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");

      // Initialize the plugin with the Google OAuth client ID
      await GoogleSignIn.initialize({
        clientId: "841907471689-d526t0drebro2298hu5t1b4ur98h3q0p.apps.googleusercontent.com",
      });

      // Attempt native sign-in
      const result = await GoogleSignIn.signIn();

      if (result?.idToken) {
        toast.success("Native Google Sign-In successful!");
        await handleGoogleLogin(result.idToken);
      } else {
        const errMsg = "Native sign-in returned no ID token";
        setGoogleAuthError(errMsg);
        toast.error(errMsg, { duration: 6000 });
      }
    } catch (err: any) {
      console.error("Full Error Context Object:", JSON.stringify(err, null, 2));
      setGoogleAuthError(`Code: ${err.code} | Message: ${err.message} | Details: ${JSON.stringify(err)}`);

      // Show the exact error code on-screen so you can debug on-device
      toast.error(`Auth Error: ${err.code}`, {
        duration: 10000,
        style: {
          maxWidth: "90vw",
          fontSize: "12px",
          wordBreak: "break-word",
        },
      });

      // ─── GRACEFUL WEB FALLBACK ───
      // If native plugin fails, try the web-based GSI popup as backup
      toast("Trying web-based Google login as fallback...", { icon: "🔄", duration: 3000 });

      try {
        // Attempt to trigger the GSI one-tap or prompt
        if (typeof (window as any).google !== "undefined") {
          (window as any).google.accounts.id.prompt();
        } else {
          toast.error("Google Identity Services not available in this environment", { duration: 5000 });
        }
      } catch (webErr: any) {
        const webErrMsg = `Web fallback also failed: ${webErr?.message || String(webErr)}`;
        console.error("[GoogleSignIn Web Fallback]", webErrMsg);
        toast.error(webErrMsg, { duration: 8000 });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

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

        {/* INLINE NATIVE AUTH DIAGNOSTIC BANNER */}
        {googleAuthError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl mb-4 text-xs border border-amber-300 dark:border-amber-700 break-words"
          >
            <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Debug Info:</p>
            <p className="text-amber-700 dark:text-amber-400 font-mono">{googleAuthError}</p>
          </motion.div>
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

        {/* ──────────────────────────────────────────────
            GOOGLE LOGIN — ALWAYS VISIBLE, DUAL PATH
            Native Capacitor path for APK builds
            Web GSI iframe path for browser environments
        ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {isNativePlatform() ? (
            /* ─── NATIVE APK: Custom styled button that is ALWAYS visible ─── */
            <button
              type="button"
              onClick={handleNativeGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl
                         border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750
                         text-gray-700 dark:text-gray-200 font-medium
                         transition-all duration-300 shadow-sm hover:shadow-md
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              )}
              {isGoogleLoading ? "Signing in..." : "Sign in with Google"}
            </button>
          ) : (
            /* ─── WEB BROWSER: Standard GSI iframe button ─── */
            <GoogleLogin
              onSuccess={(res) => handleGoogleLogin(res.credential)}
              onError={() => setError("Google login cancelled")}
            />
          )}
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
