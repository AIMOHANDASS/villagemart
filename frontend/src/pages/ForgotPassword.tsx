import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";

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
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl transition-all">
        <h2 className="text-2xl font-bold text-center mb-6">
          Forgot Password
        </h2>

        {error && (
          <p className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </p>
        )}

        {success && (
          <p className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-lg text-center">
            {success}
          </p>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-xl mb-4"
            />

            <button
              onClick={sendOtp}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <input
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-3 border rounded-xl mb-4"
            />

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-semibold"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <div className="relative mb-2">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 border rounded-xl pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-lg"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <p
              className={`text-sm mb-4 ${
                passwordStrong ? "text-green-600" : "text-orange-500"
              }`}
            >
              {passwordStrong ? "Strong password" : "Weak password"}
            </p>

            <button
              onClick={resetPassword}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl font-semibold"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
