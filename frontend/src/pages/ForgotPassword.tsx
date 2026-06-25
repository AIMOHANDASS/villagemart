import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

/* ---------------- PASSWORD VALIDATION ---------------- */
const isStrongPassword = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [passwordStrong, setPasswordStrong] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ---------------- PASSWORD STRENGTH ---------------- */
  useEffect(() => {
    setPasswordStrong(isStrongPassword(newPassword));
  }, [newPassword]);

  /* ---------------- AUTO REDIRECT AFTER SUCCESS ---------------- */
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 2500); // 2.5 sec

      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  /* ---------------- STEP 1: SEND OTP ---------------- */
  const sendOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to send OTP");
        return;
      }

      toast.success("OTP sent to your email!");
      setStep(2);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- STEP 2: VERIFY OTP ---------------- */
  const verifyOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid OTP");
        return;
      }

      toast.success("OTP verified!");
      setStep(3);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- STEP 3: RESET PASSWORD ---------------- */
  const resetPassword = async () => {
    setError("");

    if (!passwordStrong) {
      setError("Password is weak");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Reset failed");
        return;
      }

      setSuccess("✅ Password reset successful. Redirecting to login...");
      toast.success("Password reset successful!");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = [
    { num: 1, label: "Email", icon: <Mail className="h-4 w-4" /> },
    { num: 2, label: "Verify", icon: <ShieldCheck className="h-4 w-4" /> },
    { num: 3, label: "Reset", icon: <KeyRound className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      {/* Decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full" />
      </div>

      <motion.div
        className="relative w-full max-w-md bg-white dark:bg-card p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      >
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
        </motion.div>

        <h2 className="text-2xl font-bold text-center mb-2">
          Forgot Password
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Reset your password in 3 easy steps
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepConfig.map((s, index) => (
            <div key={s.num} className="flex items-center gap-2">
              <motion.div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step >= s.num
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "bg-gray-100 dark:bg-gray-800 text-muted-foreground"
                }`}
                animate={step === s.num ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {s.icon}
              </motion.div>
              {index < stepConfig.length - 1 && (
                <div className={`w-8 h-0.5 rounded-full transition-all duration-500 ${
                  step > s.num ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                }`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
          >
            {error}
          </motion.p>
        )}

        {success && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-4 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 text-center font-medium"
          >
            {success}
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 bg-gray-50 dark:bg-gray-800
                           focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 outline-none"
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={sendOtp}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-500
                           text-white p-3.5 rounded-xl font-semibold shadow-lg shadow-primary/30 transition-all duration-300
                           disabled:opacity-50 ripple-container"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                Verification Code
              </label>
              <input
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 text-center text-lg font-mono tracking-widest bg-gray-50 dark:bg-gray-800
                           focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 outline-none"
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={verifyOtp}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500
                           text-white p-3.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/30 transition-all duration-300
                           disabled:opacity-50 ripple-container"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                New Password
              </label>
              <div className="relative mb-2">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              </div>

              {newPassword && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-sm mb-4 flex items-center gap-1 ${
                    passwordStrong ? "text-emerald-600" : "text-orange-500"
                  }`}
                >
                  {passwordStrong ? "✅ Strong password" : "⚠️ Weak password"}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetPassword}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500
                           text-white p-3.5 rounded-xl font-semibold shadow-lg shadow-purple-500/30 transition-all duration-300
                           disabled:opacity-50 ripple-container"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back to login */}
        <motion.p
          className="text-center mt-6 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Remember your password?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            Sign in
          </button>
        </motion.p>
      </motion.div>
    </div>
  );
}
