import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import FreeLocationPicker from "../components/FreeLocationPicker";
import { GoogleLogin } from "@react-oauth/google";

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
      alert("Enter valid email first");
      return;
    }

    await fetch(`${API_BASE_URL}/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });

    setEmailOtpModal(true);
    setEmailResendTimer(30);
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
    } else {
      alert("Invalid Email OTP");
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
      const res = await fetch(`${API_BASE_URL}/users/signup`, {
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

      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
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
        alert("Google signup failed");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
      navigate("/");
    } catch {
      alert("Google signup error");
    }
  };

  return (
    <div className="min-h-screen flex justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-xl border animate-fade-in"
      >
        <h2 className="text-3xl font-bold mb-6 text-center">
          Create Account
        </h2>

        {error && (
          <p className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg animate-shake">
            {error}
          </p>
        )}

        {["name", "username", "email", "phone"].map((f) => (
          <input
            key={f}
            name={f}
            placeholder={f.toUpperCase()}
            value={(form as any)[f]}
            onChange={handleChange}
            className="w-full p-3 mb-3 border rounded-xl"
            required
          />
        ))}

        <button
          type="button"
          onClick={sendEmailOtp}
          disabled={emailVerified || emailResendTimer > 0}
          className="w-full mb-4 px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200"
        >
          {emailVerified
            ? "Email Verified ✅"
            : emailResendTimer > 0
            ? `Resend in ${emailResendTimer}s`
            : "Verify Email"}
        </button>

        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="PASSWORD"
            value={form.password}
            onChange={handleChange}
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

        <p className={`text-sm mb-3 ${passwordStrong ? "text-green-600" : "text-orange-500"}`}>
          {form.password && (passwordStrong ? "Strong password" : "Weak password")}
        </p>

        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Delivery Address"
          className="w-full p-3 mb-3 border rounded-xl"
        />

        <FreeLocationPicker
          onSelect={(loc) => {
            setLocation({ lat: loc.lat, lng: loc.lng });
            setForm((p) => ({ ...p, address: loc.address }));
          }}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        {/* GOOGLE SIGNUP */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <GoogleLogin
            onSuccess={(res) => handleGoogleSignup(res.credential)}
            onError={() => alert("Google login cancelled")}
          />
        </div>
      </form>

      {/* EMAIL OTP MODAL */}
      {emailOtpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-80 animate-scale-in">
            <h3 className="font-bold mb-3">Email OTP Verification</h3>
            <input
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value)}
              placeholder="Enter OTP"
              className="w-full p-3 border rounded-xl mb-3"
            />
            <button
              type="button"
              onClick={verifyEmailOtp}
              className="w-full bg-green-500 text-white p-2 rounded-xl"
            >
              Verify Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
