import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import FreeLocationPicker from "../components/FreeLocationPicker";
import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

type Props = {
  onLogin: (u: any) => void;
};

/* ---------------- SERVICE AREA ---------------- */
const KARUR = { lat: 10.9601, lng: 78.0766 };
const KULITHALAI = { lat: 10.9356, lng: 78.4103 };
const RADIUS_KM = 15;

/* ---------------- DISTANCE ---------------- */
function distanceKm(a: any, b: any) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/* ---------------- VALIDATORS ---------------- */
const isStrongPassword = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function Signup({ onLogin }: Props) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    address: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrong, setPasswordStrong] = useState(false);
  const [emailValid, setEmailValid] = useState(true);

  const [location, setLocation] = useState({ lat: 0, lng: 0 });
  const [serviceOk, setServiceOk] = useState<boolean | null>(null);

  /* Email OTP */
  const [emailOtpModal, setEmailOtpModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailResendTimer, setEmailResendTimer] = useState(0);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------------- LIVE VALIDATIONS ---------------- */
  useEffect(() => {
    setPasswordStrong(isStrongPassword(form.password));
  }, [form.password]);

  useEffect(() => {
    setEmailValid(isValidEmail(form.email) || form.email === "");
  }, [form.email]);

  /* ---------------- SERVICE VALIDATION ---------------- */
  useEffect(() => {
    if (!location.lat) {
      setServiceOk(null);
      return;
    }

    const dKarur = distanceKm(location, KARUR);
    const dKulithalai = distanceKm(location, KULITHALAI);

    setServiceOk(dKarur <= RADIUS_KM || dKulithalai <= RADIUS_KM);
  }, [location]);

  /* ---------------- EMAIL RESEND TIMER ---------------- */
  useEffect(() => {
    if (emailResendTimer <= 0) return;
    const timer = setInterval(
      () => setEmailResendTimer((t) => t - 1),
      1000
    );
    return () => clearInterval(timer);
  }, [emailResendTimer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ---------------- EMAIL OTP ---------------- */
  const sendEmailOtp = async () => {
    if (!form.email || !emailValid) {
      toast.error("Enter valid email first");
      return;
    }

    await fetch(`${API_BASE_URL}/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });

    setEmailOtpModal(true);
    setEmailResendTimer(30);
    toast.success("OTP sent to your email!");
  };

  const verifyEmailOtp = async () => {
    const res = await fetch(`${API_BASE_URL}/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, otp: emailOtp }),
    });

    if (res.ok) {
      setEmailVerified(true);
      setEmailOtpModal(false);
      toast.success("Email verified! ✅");
    } else {
      toast.error("Invalid Email OTP");
    }
  };

  /* ---------------- NORMAL SIGNUP ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.phone || form.phone.length !== 10) {
      setError("Valid phone number required");
      return;
    }
    if (!emailVerified) {
      setError("Email not verified");
      return;
    }
    if (!passwordStrong) {
      setError("Password is weak");
      return;
    }
    if (!serviceOk) {
      setError("Service not available in this location");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/user/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          latitude: location.lat,
          longitude: location.lng,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Signup failed");
        return;
      }

      // ✅ 1. Cache JWT token FIRST — downstream components (Header, NotificationBell)
      //    will fire authenticated API calls the moment React re-renders after onLogin.
      //    If the token isn't in localStorage yet, those calls hit 401 → session wipe → logout loop.
      if (data.token) localStorage.setItem("jwt_token", data.token);

      // ✅ 2. Persist the complete user metadata object so page refreshes don't lose session
      localStorage.setItem("user", JSON.stringify(data.user));

      // ✅ 3. Store role for any components that read it independently
      if (data.role) localStorage.setItem("user_role", data.role);

      // ✅ 4. Set React auth state — this triggers the app-wide re-render
      onLogin(data.user);

      toast.success("Account created! 🎉");
      navigate("/");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- GOOGLE SIGNUP ---------------- */
  const handleGoogleSignup = async (token: string | undefined) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error("Google signup failed");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) localStorage.setItem("jwt_token", data.token);
      if (data.role) localStorage.setItem("user_role", data.role);
      onLogin(data.user);
      toast.success("Welcome to VillageMart! 🎉");
      navigate("/");
    } catch {
      toast.error("Google signup error");
    }
  };

  const fieldLabels: Record<string, string> = {
    name: "Full Name",
    username: "Username",
    email: "Email Address",
    phone: "Phone Number",
  };

  return (
    <div className="min-h-screen flex justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 py-8">
      {/* Decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/5 rounded-full" />
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="relative max-w-xl w-full bg-white dark:bg-card p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800"
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
            <span className="text-2xl">🌿</span>
          </div>
        </motion.div>

        <motion.h2
          className="text-2xl font-bold mb-1 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          Create Account
        </motion.h2>
        <motion.p
          className="text-sm text-muted-foreground text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Join VillageMart and start shopping fresh
        </motion.p>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
          >
            {error}
          </motion.p>
        )}

        {["name", "username", "email", "phone"].map((f, index) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
          >
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              {fieldLabels[f]}
            </label>
            <input
              name={f}
              placeholder={fieldLabels[f]}
              value={(form as any)[f]}
              onChange={handleChange}
              className="w-full p-3 mb-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 outline-none"
              required
            />
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <button
            type="button"
            onClick={sendEmailOtp}
            disabled={emailVerified || emailResendTimer > 0}
            className={`w-full mb-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              emailVerified
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 border-2 border-emerald-300"
                : "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-700 border border-blue-200"
            }`}
          >
            {emailVerified
              ? "✅ Email Verified"
              : emailResendTimer > 0
              ? `Resend in ${emailResendTimer}s`
              : "📧 Verify Email"}
          </button>
        </motion.div>

        <motion.div
          className="relative mb-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55 }}
        >
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
            Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl pr-12 bg-gray-50 dark:bg-gray-800
                       focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-lg hover:scale-110 transition-transform"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </motion.div>

        {form.password && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-sm mb-3 flex items-center gap-1 ${passwordStrong ? "text-emerald-600" : "text-orange-500"}`}
          >
            {passwordStrong ? "✅ Strong password" : "⚠️ Weak password"}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
            Delivery Address
          </label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Enter your delivery address"
            className="w-full p-3 mb-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800
                       focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 outline-none"
          />
        </motion.div>

        <FreeLocationPicker
          onSelect={(loc) => {
            setLocation({ lat: loc.lat, lng: loc.lng });
            setForm((p) => ({ ...p, address: loc.address }));
          }}
        />

        {serviceOk === false && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl mt-2"
          >
            ⚠️ Service not available in this location
          </motion.p>
        )}

        {serviceOk === true && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl mt-2"
          >
            ✅ Service available in your area!
          </motion.p>
        )}

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-4"
        >
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-500
                       text-white p-3.5 rounded-xl font-semibold shadow-lg shadow-primary/30 hover:shadow-xl transition-all duration-300 ripple-container disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </motion.div>

        {/* GOOGLE SIGNUP */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <GoogleLogin
              onSuccess={(res) => handleGoogleSignup(res.credential)}
              onError={() => toast.error("Google login cancelled")}
            />
          </motion.div>
        </div>

        <motion.p
          className="text-center mt-5 text-muted-foreground text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
        >
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            Sign in
          </button>
        </motion.p>
      </motion.form>

      {/* EMAIL OTP MODAL */}
      {emailOtpModal && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-white dark:bg-card p-8 rounded-3xl w-80 shadow-2xl border border-gray-100 dark:border-gray-800"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="font-bold text-lg">Email Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">Enter the OTP sent to your email</p>
            </div>
            <input
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value)}
              placeholder="Enter OTP"
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl mb-3 text-center text-lg font-mono tracking-widest bg-gray-50 dark:bg-gray-800
                         focus:ring-2 focus:ring-primary/30 transition-all outline-none"
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={verifyEmailOtp}
              className="w-full bg-gradient-to-r from-primary to-emerald-600 text-white p-3 rounded-xl font-semibold shadow-lg shadow-primary/20"
            >
              Verify Email
            </motion.button>
            <button
              type="button"
              onClick={() => setEmailOtpModal(false)}
              className="w-full text-sm text-muted-foreground mt-3 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
